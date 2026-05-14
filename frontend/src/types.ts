export interface GeoCoordination {
  latitude: number;
  longitude: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  allergens: readonly string[];
  dailyStock: number;
  remainingStock: number;
}

export interface Restaurant {
  id: string;
  name: string;
  ownerId: string;
  location: GeoCoordination;
  menu: readonly MenuItem[];
}

export interface CartLine {
  menuItemId: string;
  quantity: number;
}

export interface Cart {
  restaurantId: string | null;
  lines: CartLine[];
}

export type AddItemToCartResult =
  | { ok: true; cart: Cart }
  | {
      ok: false;
      reason: 'cross_restaurant_conflict';
      cart: Cart;
      currentRestaurantId: string;
      attemptedRestaurantId: string;
    }
  | { ok: false; reason: 'restaurant_not_found' }
  | { ok: false; reason: 'item_not_on_menu' }
  | { ok: false; reason: 'invalid_quantity' }
  | { ok: false; reason: 'out_of_stock' };

export type KitchenOrderStatus = 'pending_acceptance' | 'refused' | 'preparing' | 'ready_for_pickup';
export type DeliveryPhase = 'none' | 'assigned' | 'delivered';

export interface RestaurantOrderLineDto {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
}

export interface RestaurantOrderDto {
  id: string;
  restaurantId: string;
  lines: readonly RestaurantOrderLineDto[];
  kitchenStatus: KitchenOrderStatus;
  estimatedPrepMinutes: number | null;
  courierId: string | null;
  deliveryPhase: DeliveryPhase;
  tipCents: number;
  deliveryDistanceKm: number;
  createdAtIso: string;
}

export interface CourierDto {
  id: string;
  tier: 'standard' | 'expert';
  availability: 'available' | 'unavailable';
  walletCents: number;
  activeDeliveries: readonly { orderId: string; restaurantId: string }[];
}

export type ListRestaurantOrdersResponse =
  | { ok: true; orders: readonly RestaurantOrderDto[] }
  | { ok: false; reason: string };

export interface InvoiceLineRow {
  menuItemId: string;
  name: string;
  quantity: number;
  priceCents: number;
  totalPriceCents: number;
}

export interface TotalOrders {
  subTotalCents: number;
  deliveryCents: number;
  serviceCents: number;
  tipCents: number;
  totalCents: number;
  distanceKm: number;
  deliveryExplanation: string;
  serviceExplanation: string;
  tipExplanation: string;
}

export type DetailsInvoice = TotalOrders & {
  /** Présent après paiement réussi si l’API expose l’identifiant de commande. */
  orderId?: string;
  invoiceNumber: string;
  issuedAtIso: string;
  restaurantId: string;
  restaurantName: string;
  lines: readonly InvoiceLineRow[];
};

export type PlaceOrderResult =
  | { ok: true; invoice: DetailsInvoice }
  | { ok: false; reason: 'empty_cart' | 'unknown_restaurant' | 'invalid_cart_line' }
  | { ok: false; reason: 'payment_refused'; totals: TotalOrders }
  | { ok: false; reason: 'insufficient_stock'; menuItemId: string };
