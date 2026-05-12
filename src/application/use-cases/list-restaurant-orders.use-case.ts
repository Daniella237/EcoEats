import type { RestaurantOrder } from '../../domain/entities/restaurant-order.js';
import type { OrdersRepositoryPort } from '../ports/orders-repository.port.js';
import type { RestaurantMenuRepositoryPort } from '../ports/restaurant-menu-repository.port.js';

export type ListRestaurantOrdersResult =
  | { readonly ok: true; readonly orders: readonly RestaurantOrder[] }
  | { readonly ok: false; readonly reason: 'forbidden_or_unknown_restaurant' };

export class ListRestaurantOrdersUseCase {
  constructor(
    private readonly menu: RestaurantMenuRepositoryPort,
    private readonly orders: OrdersRepositoryPort,
  ) {}

  async execute(ownerId: string, restaurantId: string): Promise<ListRestaurantOrdersResult> {
    const r = await this.menu.getRestaurantForOwner(restaurantId, ownerId);
    if (!r) {
      return { ok: false, reason: 'forbidden_or_unknown_restaurant' };
    }
    const list = await this.orders.listByRestaurant(restaurantId);
    return { ok: true, orders: list };
  }
}
