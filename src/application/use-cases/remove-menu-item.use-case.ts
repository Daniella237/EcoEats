import type { Restaurant } from '../../domain/entities/restaurant.js';
import { withMenuItemRemoved } from '../../domain/services/menu-mutations.js';
import type { RestaurantMenuRepositoryPort } from '../ports/restaurant-menu-repository.port.js';

export type RemoveMenuItemResult =
  | { readonly ok: true; readonly restaurant: Restaurant }
  | { readonly ok: false; readonly reason: 'forbidden_or_unknown_restaurant' | 'unknown_menu_item' };

export class RemoveMenuItemUseCase {
  constructor(private readonly menu: RestaurantMenuRepositoryPort) {}

  async execute(ownerId: string, restaurantId: string, menuItemId: string): Promise<RemoveMenuItemResult> {
    const r = await this.menu.getRestaurantForOwner(restaurantId, ownerId);
    if (!r) {
      return { ok: false, reason: 'forbidden_or_unknown_restaurant' };
    }
    if (!r.menu.some((m) => m.id === menuItemId)) {
      return { ok: false, reason: 'unknown_menu_item' };
    }
    const restaurant: Restaurant = { ...r, menu: withMenuItemRemoved(r.menu, menuItemId) };
    await this.menu.saveRestaurant(restaurant);
    return { ok: true, restaurant };
  }
}
