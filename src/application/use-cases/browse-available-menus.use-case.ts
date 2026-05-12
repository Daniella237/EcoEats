import type { Restaurant } from '../../domain/entities/restaurant.js';
import type { MenuCatalogPort } from '../ports/menu-catalog.port.js';

export class BrowseAvailableMenusUseCase {
  constructor(private readonly catalog: MenuCatalogPort) {}

  execute(): Promise<readonly Restaurant[]> {
    return this.catalog.listAvailableRestaurants();
  }
}
