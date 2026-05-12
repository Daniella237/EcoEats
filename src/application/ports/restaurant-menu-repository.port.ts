import type { Restaurant } from '../../domain/entities/restaurant.js';

export interface RestaurantMenuRepositoryPort {
  getRestaurantForOwner(restaurantId: string, ownerId: string): Promise<Restaurant | null>;
  saveRestaurant(restaurant: Restaurant): Promise<void>;
}
