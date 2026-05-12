import type { MemoryEcoRoot } from '../../composition/memory-root.js';
import type { SqliteEcoRoot } from '../../composition/sqlite-root.js';
import type { PlaceOrderInput } from '../../application/use-cases/place-order.use-case.js';
import type { MenuItem } from '../../domain/entities/menu-item.js';

export type EcoHttpRoot = MemoryEcoRoot | SqliteEcoRoot;

export function createEcoHttpHandlers(root: EcoHttpRoot) {
  return {
    getCatalog: async () => root.browseMenus.execute(),

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

    subscribeIncomingOrders: (
      restaurantId: string,
      listener: (e: { orderId: string; restaurantId: string }) => void,
    ) => root.store.subscribeIncomingOrders(restaurantId, listener),
  };
}
