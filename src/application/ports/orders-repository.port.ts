import type { RestaurantOrder } from '../../domain/entities/restaurant-order.js';

export interface OrdersRepositoryPort {  listByRestaurant(restaurantId: string): Promise<readonly RestaurantOrder[]>;
  findOrderById(orderId: string): Promise<RestaurantOrder | null>;
  persistOrder(order: RestaurantOrder): Promise<void>;
  listOrdersEligibleForDeliveryProposal(): Promise<readonly RestaurantOrder[]>;
}
