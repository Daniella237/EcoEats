import type { RestaurantOrder } from '../../domain/entities/restaurant-order.js';
import { assertPendingAcceptance } from '../../domain/services/kitchen-order-policy.js';
import type { OrdersRepositoryPort } from '../ports/orders-repository.port.js';
import type { RestaurantMenuRepositoryPort } from '../ports/restaurant-menu-repository.port.js';

export type RefuseRestaurantOrderResult =
  | { readonly ok: true; readonly order: RestaurantOrder }
  | {
      readonly ok: false;
      readonly reason: 'forbidden_or_unknown_restaurant' | 'unknown_order' | 'invalid_status';
    };

export class RefuseRestaurantOrderUseCase {
  constructor(
    private readonly menu: RestaurantMenuRepositoryPort,
    private readonly orders: OrdersRepositoryPort,
  ) {}

  async execute(
    ownerId: string,
    restaurantId: string,
    orderId: string,
  ): Promise<RefuseRestaurantOrderResult> {
    const r = await this.menu.getRestaurantForOwner(restaurantId, ownerId);
    if (!r) {
      return { ok: false, reason: 'forbidden_or_unknown_restaurant' };
    }
    const order = await this.orders.findOrderById(orderId);
    if (!order || order.restaurantId !== restaurantId) {
      return { ok: false, reason: 'unknown_order' };
    }
    try {
      assertPendingAcceptance(order.kitchenStatus);
    } catch {
      return { ok: false, reason: 'invalid_status' };
    }
    const next: RestaurantOrder = {
      ...order,
      kitchenStatus: 'refused',
      estimatedPrepMinutes: null,
    };
    await this.orders.persistOrder(next);
    return { ok: true, order: next };
  }
}
