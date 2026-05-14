import type { AddItemToCartCommandResult } from '../../application/use-cases/add-item-to-cart.use-case.js';
import type { PlaceOrderInput } from '../../application/use-cases/place-order.use-case.js';
import type { MemoryEcoRoot } from '../../composition/memory-root.js';
import type { SqliteEcoRoot } from '../../composition/sqlite-root.js';
import type { Cart } from '../../domain/entities/cart.js';
import type { MenuItem } from '../../domain/entities/menu-item.js';

export type EcoHttpRoot = MemoryEcoRoot | SqliteEcoRoot;

/** Corps pour ajouter une ligne au panier (état panier côté client, sans session serveur). */
export interface AddCartItemBody {
  readonly cart: Cart;
  readonly restaurantId: string;
  readonly menuItemId: string;
  readonly quantity: number;
}

/** Après choix utilisateur : vider le panier puis ajouter depuis ce restaurant. */
export interface ReplaceCartAddBody {
  readonly restaurantId: string;
  readonly menuItemId: string;
  readonly quantity: number;
}

export function createEcoHttpHandlers(root: EcoHttpRoot) {
  return {
    getCatalog: async () => root.browseMenus.execute(),

    postAddCartItem: async (body: AddCartItemBody): Promise<AddItemToCartCommandResult> =>
      root.addToCart.execute(body.cart, body.restaurantId, body.menuItemId, body.quantity),

    postReplaceCartAndAddItem: async (body: ReplaceCartAddBody): Promise<AddItemToCartCommandResult> =>
      root.addToCart.executeAfterReplace(body.restaurantId, body.menuItemId, body.quantity),

    postPlaceOrder: async (body: PlaceOrderInput) => root.placeOrder.execute(body),

    getRestaurantOrders: async (ownerId: string, restaurantId: string) =>
      root.listRestaurantOrders.execute(ownerId, restaurantId),

    postAcceptOrder: async (
      ownerId: string,
      restaurantId: string,
      orderId: string,
      estimatedPrepMinutes: number,
    ) => root.acceptRestaurantOrder.execute(ownerId, restaurantId, orderId, estimatedPrepMinutes),

    postRefuseOrder: async (ownerId: string, restaurantId: string, orderId: string) =>
      root.refuseRestaurantOrder.execute(ownerId, restaurantId, orderId),

    postMarkReady: async (ownerId: string, restaurantId: string, orderId: string) =>
      root.markOrderReady.execute(ownerId, restaurantId, orderId),

    postMenuItem: async (
      ownerId: string,
      restaurantId: string,
      item: Omit<MenuItem, 'id'> & { id?: string },
    ) => root.addMenuItem.execute({ ownerId, restaurantId, item }),

    patchMenuItem: async (
      ownerId: string,
      restaurantId: string,
      menuItemId: string,
      patch: Partial<Omit<MenuItem, 'id'>>,
    ) => root.updateMenuItem.execute({ ownerId, restaurantId, menuItemId, patch }),

    deleteMenuItem: async (ownerId: string, restaurantId: string, menuItemId: string) =>
      root.removeMenuItem.execute(ownerId, restaurantId, menuItemId),

    putDailyStock: async (ownerId: string, restaurantId: string, menuItemId: string, dailyStock: number) =>
      root.setDailyStock.execute(ownerId, restaurantId, menuItemId, dailyStock),

    postCourierAvailability: async (courierId: string, availability: 'available' | 'unavailable') =>
      root.setCourierAvailability.execute(courierId, availability),

    getDeliveryProposals: async () => root.listDeliveryProposals.execute(),

    postAcceptDelivery: async (courierId: string, orderId: string) =>
      root.acceptDelivery.execute(courierId, orderId),

    postCompleteDelivery: async (courierId: string, orderId: string) =>
      root.completeDelivery.execute(courierId, orderId),

    getOrderById: async (orderId: string) => root.getOrderById.execute(orderId),

    getCourierById: async (courierId: string) => root.getCourierById.execute(courierId),

    subscribeIncomingOrders: (
      restaurantId: string,
      listener: (e: { orderId: string; restaurantId: string }) => void,
    ) => root.store.subscribeIncomingOrders(restaurantId, listener),
  };
}
