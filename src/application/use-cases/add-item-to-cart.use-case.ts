import type { Cart } from '../../domain/entities/cart.js';
import { totalQuantityForMenuItemInCart } from '../../domain/entities/cart-stock.js';
import {
  addItemToCart,
  replaceCartAndAddItem,
  type AddItemToCartOutcome,
} from '../../domain/entities/cart.js';
import type { MenuCatalogPort } from '../ports/menu-catalog.port.js';

export type AddItemToCartCommandResult =
  | { readonly ok: true; readonly cart: Cart }
  | {
      readonly ok: false;
      readonly reason: 'cross_restaurant_conflict';
      readonly cart: Cart;
      readonly currentRestaurantId: string;
      readonly attemptedRestaurantId: string;
    }
  | { readonly ok: false; readonly reason: 'restaurant_not_found' }
  | { readonly ok: false; readonly reason: 'item_not_on_menu' }
  | { readonly ok: false; readonly reason: 'invalid_quantity' }
  | { readonly ok: false; readonly reason: 'out_of_stock' };

export class AddItemToCartUseCase {
  constructor(private readonly catalog: MenuCatalogPort) {}

  async execute(
    cart: Cart,
    restaurantId: string,
    menuItemId: string,
    quantity: number,
  ): Promise<AddItemToCartCommandResult> {
    if (quantity <= 0) {
      return { ok: false, reason: 'invalid_quantity' };
    }

    const restaurants = await this.catalog.listAvailableRestaurants();
    const restaurant = restaurants.find((r) => r.id === restaurantId);
    if (!restaurant) {
      return { ok: false, reason: 'restaurant_not_found' };
    }

    const dish = restaurant.menu.find((m) => m.id === menuItemId);
    if (!dish) {
      return { ok: false, reason: 'item_not_on_menu' };
    }

    const needed = totalQuantityForMenuItemInCart(cart, menuItemId, quantity);
    if (dish.remainingStock < needed) {
      return { ok: false, reason: 'out_of_stock' };
    }

    const outcome: AddItemToCartOutcome = addItemToCart(cart, restaurantId, menuItemId, quantity);

    if (outcome.kind === 'cross_restaurant_conflict') {
      return {
        ok: false,
        reason: 'cross_restaurant_conflict',
        cart: outcome.cart,
        currentRestaurantId: outcome.currentRestaurantId,
        attemptedRestaurantId: outcome.attemptedRestaurantId,
      };
    }

    return { ok: true, cart: outcome.cart };
  }

  /** Après confirmation utilisateur : vider le panier puis ajouter. */
  async executeAfterReplace(
    restaurantId: string,
    menuItemId: string,
    quantity: number,
  ): Promise<AddItemToCartCommandResult> {
    if (quantity <= 0) {
      return { ok: false, reason: 'invalid_quantity' };
    }

    const restaurants = await this.catalog.listAvailableRestaurants();
    const restaurant = restaurants.find((r) => r.id === restaurantId);
    if (!restaurant) {
      return { ok: false, reason: 'restaurant_not_found' };
    }

    const dish = restaurant.menu.find((m) => m.id === menuItemId);
    if (!dish) {
      return { ok: false, reason: 'item_not_on_menu' };
    }
    if (dish.remainingStock < quantity) {
      return { ok: false, reason: 'out_of_stock' };
    }

    return { ok: true, cart: replaceCartAndAddItem(restaurantId, menuItemId, quantity) };
  }
}
