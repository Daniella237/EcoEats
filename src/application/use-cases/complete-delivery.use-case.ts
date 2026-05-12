import type { Courier } from '../../domain/entities/courier.js';
import type { RestaurantOrder } from '../../domain/entities/restaurant-order.js';
import {
  courierDeliveryPayoutCents,
  DEFAULT_COURIER_BASE_CENTS,
  DEFAULT_COURIER_PER_KM_CENTS,
} from '../../domain/services/courier-earnings.js';
import type { CouriersRepositoryPort } from '../ports/couriers-repository.port.js';
import type { OrdersRepositoryPort } from '../ports/orders-repository.port.js';

export type CompleteDeliveryResult =
  | { readonly ok: true; readonly order: RestaurantOrder; readonly courier: Courier; readonly payoutCents: number }
  | {
      readonly ok: false;
      readonly reason:
        | 'unknown_order'
        | 'unknown_courier'
        | 'not_assigned_to_courier'
        | 'already_delivered'
        | 'invalid_delivery_phase';
    };

export class CompleteDeliveryUseCase {
  constructor(
    private readonly orders: OrdersRepositoryPort,
    private readonly couriers: CouriersRepositoryPort,
  ) {}

  async execute(courierId: string, orderId: string): Promise<CompleteDeliveryResult> {
    const order = await this.orders.findOrderById(orderId);
    if (!order) {
      return { ok: false, reason: 'unknown_order' };
    }
    if (order.courierId !== courierId) {
      return { ok: false, reason: 'not_assigned_to_courier' };
    }
    if (order.deliveryPhase === 'delivered') {
      return { ok: false, reason: 'already_delivered' };
    }
    if (order.deliveryPhase !== 'assigned') {
      return { ok: false, reason: 'invalid_delivery_phase' };
    }

    const courier = await this.couriers.findCourierById(courierId);
    if (!courier) {
      return { ok: false, reason: 'unknown_courier' };
    }

    const payoutCents = courierDeliveryPayoutCents({
      baseCents: DEFAULT_COURIER_BASE_CENTS,
      perKmCents: DEFAULT_COURIER_PER_KM_CENTS,
      distanceKm: order.deliveryDistanceKm,
      tipCents: order.tipCents,
    });

    const nextOrder: RestaurantOrder = {
      ...order,
      deliveryPhase: 'delivered',
    };

    const nextDeliveries = courier.activeDeliveries.filter((d) => d.orderId !== orderId);
    const nextCourier: Courier = {
      ...courier,
      walletCents: courier.walletCents + payoutCents,
      activeDeliveries: nextDeliveries,
    };

    await this.orders.persistOrder(nextOrder);
    await this.couriers.persistCourier(nextCourier);
    return { ok: true, order: nextOrder, courier: nextCourier, payoutCents };
  }
}
