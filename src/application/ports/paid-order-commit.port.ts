import type { RestaurantOrder } from '../../domain/entities/restaurant-order.js';

export interface PaidOrderCommitPort {
  commit(input: {
    readonly restaurantId: string;
    readonly order: RestaurantOrder;
    readonly stockDecrements: readonly { readonly menuItemId: string; readonly quantity: number }[];
  }): Promise<
    | { readonly ok: true }
    | { readonly ok: false; readonly reason: 'insufficient_stock'; readonly menuItemId: string }
  >;
}
