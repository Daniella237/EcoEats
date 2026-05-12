import type { MenuItem } from '../../domain/entities/menu-item.js';
import type { Restaurant } from '../../domain/entities/restaurant.js';
import { withMenuItemReplaced } from '../../domain/services/menu-mutations.js';
import type { RestaurantMenuRepositoryPort } from '../ports/restaurant-menu-repository.port.js';

export interface AddMenuItemInput {
  readonly ownerId: string;
  readonly restaurantId: string;
  readonly item: Omit<MenuItem, 'id'> & { readonly id?: string };
}

export type AddMenuItemResult =
  | { readonly ok: true; readonly restaurant: Restaurant }
  | { readonly ok: false; readonly reason: 'forbidden_or_unknown_restaurant' };

export class AddMenuItemUseCase {
  constructor(private readonly menu: RestaurantMenuRepositoryPort) {}

  async execute(input: AddMenuItemInput): Promise<AddMenuItemResult> {
    const r = await this.menu.getRestaurantForOwner(input.restaurantId, input.ownerId);
    if (!r) {
      return { ok: false, reason: 'forbidden_or_unknown_restaurant' };
    }
    const id = input.item.id ?? crypto.randomUUID();
    const nextItem: MenuItem = {
      id,
      name: input.item.name,
      description: input.item.description,
      priceCents: input.item.priceCents,
      allergens: input.item.allergens,
      dailyStock: input.item.dailyStock,
      remainingStock: input.item.remainingStock,
    };
    const next: Restaurant = { ...r, menu: withMenuItemReplaced(r.menu, id, nextItem) };
    await this.menu.saveRestaurant(next);
    return { ok: true, restaurant: next };
  }
}
