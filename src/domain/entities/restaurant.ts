import type { MenuItem } from './menu-item.js';
import type { GeoCoordination } from '../value-objects/geo-cordination.js';

export interface Restaurant {
  readonly id: string;
  readonly name: string;
  /** Propriétaire autorisé à gérer le menu et les commandes. */
  readonly ownerId: string;
  readonly menu: readonly MenuItem[];
  readonly location: GeoCoordination;
}
