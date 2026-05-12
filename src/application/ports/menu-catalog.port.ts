import type { Restaurant } from '../../domain/entities/restaurant.js';

/** Accès en lecture au catalogue des restaurants disponibles et à leurs menus. */
export interface MenuCatalogPort {
  listAvailableRestaurants(): Promise<readonly Restaurant[]>;
}
