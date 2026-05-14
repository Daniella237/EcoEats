import type { RestaurantOrder } from '../../domain/entities/restaurant-order.js';

export interface OrdersRepositoryPort {
  listByRestaurant(restaurantId: string): Promise<readonly RestaurantOrder[]>;
  findOrderById(orderId: string): Promise<RestaurantOrder | null>;
  persistOrder(order: RestaurantOrder): Promise<void>;
  listOrdersEligibleForDeliveryProposal(): Promise<readonly RestaurantOrder[]>;
  /** Commandes encore assignées à ce livreur (non livrées). Source de vérité pour l’UI livreur. */
  listAssignedOrdersForCourier(courierId: string): Promise<readonly RestaurantOrder[]>;
}
