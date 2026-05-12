import type { Courier, CourierActiveDelivery } from '../../domain/entities/courier.js';
import type { RestaurantOrder } from '../../domain/entities/restaurant-order.js';
import { canCourierAcceptNewDelivery } from '../../domain/services/courier-assignment-policy.js';
import { isOrderVisibleAsDeliveryProposal } from '../../domain/services/kitchen-order-policy.js';
import type { CouriersRepositoryPort } from '../ports/couriers-repository.port.js';
import type { OrdersRepositoryPort } from '../ports/orders-repository.port.js';

export type AcceptDeliveryResult =
  | { readonly ok: true; readonly order: RestaurantOrder; readonly courier: Courier }
  | {
      readonly ok: false;
      readonly reason:
        | 'unknown_order'
        | 'order_not_proposable'
        | 'unknown_courier'
        | 'courier_cannot_accept'
        | 'order_already_assigned';
    };

export class AcceptDeliveryUseCase {
  constructor(
    private readonly orders: OrdersRepositoryPort,
    private readonly couriers: CouriersRepositoryPort,
  ) {}

  async execute(courierId: string, orderId: string): Promise<AcceptDeliveryResult> {
    const order = await this.orders.findOrderById(orderId);
    if (!order) {
      return { ok: false, reason: 'unknown_order' };
    }
    if (order.courierId !== null) {
      return { ok: false, reason: 'order_already_assigned' };
    }
    if (!isOrderVisibleAsDeliveryProposal(order)) {
      return { ok: false, reason: 'order_not_proposable' };
    }

    const courier = await this.couriers.findCourierById(courierId);
    if (!courier) {
      return { ok: false, reason: 'unknown_courier' };
    }

    const policy = canCourierAcceptNewDelivery(courier, order.restaurantId);
    if (!policy.ok) {
      return { ok: false, reason: 'courier_cannot_accept' };
    }

    const nextDeliveries: readonly CourierActiveDelivery[] = [
      ...courier.activeDeliveries,
      { orderId: order.id, restaurantId: order.restaurantId },
    ];

    const nextCourier: Courier = {
      ...courier,
      activeDeliveries: nextDeliveries,
    };

    const nextOrder: RestaurantOrder = {
      ...order,
      courierId: courierId,
      deliveryPhase: 'assigned',
    };

    await this.orders.persistOrder(nextOrder);
    await this.couriers.persistCourier(nextCourier);
    return { ok: true, order: nextOrder, courier: nextCourier };
  }
}
