import type { MenuItem } from '../../domain/entities/menu-item.js';
import type { Restaurant } from '../../domain/entities/restaurant.js';
import { withMenuItemReplaced } from '../../domain/services/menu-mutations.js';
import type { RestaurantMenuRepositoryPort } from '../ports/restaurant-menu-repository.port.js';

export type SetDailyStockResult =
  | { readonly ok: true; readonly restaurant: Restaurant }
  | { readonly ok: false; readonly reason: 'forbidden_or_unknown_restaurant' | 'unknown_menu_item' };

/** Définit le stock journalier et réinitialise le stock restant à cette valeur. */
export class SetDailyStockUseCase {
  constructor(private readonly menu: RestaurantMenuRepositoryPort) {}

  async execute(
    ownerId: string,
    restaurantId: string,
    menuItemId: string,
    dailyStock: number,
  ): Promise<SetDailyStockResult> {
    if (dailyStock < 0 || !Number.isInteger(dailyStock)) {
      throw new RangeError('dailyStock doit être un entier positif ou nul.');
    }
    const r = await this.menu.getRestaurantForOwner(restaurantId, ownerId);
    if (!r) {
      return { ok: false, reason: 'forbidden_or_unknown_restaurant' };
    }
    const current = r.menu.find((m) => m.id === menuItemId);
    if (!current) {
      return { ok: false, reason: 'unknown_menu_item' };
    }
    const next: MenuItem = {
      ...current,
      dailyStock,
      remainingStock: dailyStock,
    };
    const restaurant: Restaurant = { ...r, menu: withMenuItemReplaced(r.menu, menuItemId, next) };
    await this.menu.saveRestaurant(restaurant);
    return { ok: true, restaurant };
  }
}
