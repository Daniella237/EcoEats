import type { MenuItem } from '../../domain/entities/menu-item.js';
import type { Restaurant } from '../../domain/entities/restaurant.js';
import { withMenuItemReplaced } from '../../domain/services/menu-mutations.js';
import type { RestaurantMenuRepositoryPort } from '../ports/restaurant-menu-repository.port.js';

export interface UpdateMenuItemInput {
  readonly ownerId: string;
  readonly restaurantId: string;
  readonly menuItemId: string;
  readonly patch: Partial<Omit<MenuItem, 'id'>>;
}

export type UpdateMenuItemResult =
  | { readonly ok: true; readonly restaurant: Restaurant }
  | { readonly ok: false; readonly reason: 'forbidden_or_unknown_restaurant' | 'unknown_menu_item' };

export class UpdateMenuItemUseCase {
  constructor(private readonly menu: RestaurantMenuRepositoryPort) {}

  async execute(input: UpdateMenuItemInput): Promise<UpdateMenuItemResult> {
    const r = await this.menu.getRestaurantForOwner(input.restaurantId, input.ownerId);
    if (!r) {
      return { ok: false, reason: 'forbidden_or_unknown_restaurant' };
    }
    const current = r.menu.find((m) => m.id === input.menuItemId);
    if (!current) {
      return { ok: false, reason: 'unknown_menu_item' };
    }
    const next: MenuItem = {
      ...current,
      ...input.patch,
      id: current.id,
    };
    const restaurant: Restaurant = { ...r, menu: withMenuItemReplaced(r.menu, current.id, next) };
    await this.menu.saveRestaurant(restaurant);
    return { ok: true, restaurant };
  }
}
