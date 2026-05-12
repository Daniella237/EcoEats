export type KitchenOrderStatus =
  | 'pending_acceptance'
  | 'refused'
  | 'preparing'
  | 'ready_for_pickup';

export type DeliveryPhase = 'none' | 'assigned' | 'delivered';

export interface RestaurantOrderLine {
  readonly menuItemId: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
}

export interface RestaurantOrder {
  readonly id: string;
  readonly restaurantId: string;
  readonly lines: readonly RestaurantOrderLine[];
  readonly kitchenStatus: KitchenOrderStatus;
  /** Renseigné quand le restaurateur accepte la commande. */
  readonly estimatedPrepMinutes: number | null;
  readonly courierId: string | null;
  readonly deliveryPhase: DeliveryPhase;
  readonly tipCents: number;
  readonly deliveryDistanceKm: number;
  readonly createdAtIso: string;
}
