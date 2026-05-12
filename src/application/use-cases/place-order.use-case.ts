import type { Cart } from '../../domain/entities/cart.js';
import type { DetailsInvoice, InvoiceLineRow, TotalOrders } from '../../domain/entities/invoice.js';
import type { RestaurantOrder } from '../../domain/entities/restaurant-order.js';
import type { Restaurant } from '../../domain/entities/restaurant.js';
import type { GeoCoordination } from '../../domain/value-objects/geo-cordination.js';
import { calculateDistance } from '../../domain/value-objects/geo-cordination.js';
import {
  deliveryPriceCents,
  servicePriceCents,
  subTotalPriceCents,
  totalPriceCents,
} from '../../domain/services/order-pricing.js';
import type { MenuCatalogPort } from '../ports/menu-catalog.port.js';
import type { PaidOrderCommitPort } from '../ports/paid-order-commit.port.js';

export type SimulatePayment = 'success' | 'failure';

export interface PlaceOrderInput {
  readonly cart: Cart;
  readonly customerLocation: GeoCoordination;
  readonly simulatePayment: SimulatePayment;
  /** Pourboire intégralement reversé au livreur (0 par défaut). */
  readonly tipCents?: number;
}

export type PlaceOrderResult =
  | { readonly ok: true; readonly invoice: DetailsInvoice }
  | {
      readonly ok: false;
      readonly reason: 'empty_cart' | 'unknown_restaurant' | 'invalid_cart_line';
    }
  | { readonly ok: false; readonly reason: 'payment_refused'; readonly totals: TotalOrders }
  | {
      readonly ok: false;
      readonly reason: 'insufficient_stock';
      readonly menuItemId: string;
    };

function buildTotals(
  restaurant: Restaurant,
  subtotal: number,
  customer: GeoCoordination,
): TotalOrders {
  const distanceKm = calculateDistance(restaurant.location, customer);
  const roundedKm = Math.round(distanceKm * 100) / 100;
  const delivery = deliveryPriceCents(distanceKm);
  const platform = servicePriceCents(subtotal);
  return {
    subTotalCents: subtotal,
    distanceKm: roundedKm,
    deliveryCents: delivery,
    deliveryExplanation: `Forfait + 0,99 €/km (distance ${roundedKm.toFixed(2)} km à vol d'oiseau)`,
    serviceCents: platform,
    serviceExplanation: '10 % du sous-total plats (minimum 1,00 €)',
    totalCents: totalPriceCents(subtotal, delivery, platform),
  };
}

export class PlaceOrderUseCase {
  constructor(
    private readonly catalog: MenuCatalogPort,
    private readonly paidOrderCommit: PaidOrderCommitPort,
  ) {}

  async execute(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    const { cart, customerLocation, simulatePayment } = input;
    const tipCents = input.tipCents ?? 0;
    if (tipCents < 0 || !Number.isInteger(tipCents)) {
      throw new RangeError('tipCents doit être un entier positif ou nul.');
    }

    if (cart.restaurantId === null || cart.lines.length === 0) {
      return { ok: false, reason: 'empty_cart' };
    }

    const restaurants = await this.catalog.listAvailableRestaurants();
    const restaurant = restaurants.find((r) => r.id === cart.restaurantId);
    if (!restaurant) {
      return { ok: false, reason: 'unknown_restaurant' };
    }

    const invoiceLines: InvoiceLineRow[] = [];
    for (const line of cart.lines) {
      const item = restaurant.menu.find((m) => m.id === line.menuItemId);
      if (!item) {
        return { ok: false, reason: 'invalid_cart_line' };
      }
      if (item.remainingStock < line.quantity) {
        return { ok: false, reason: 'insufficient_stock', menuItemId: item.id };
      }
      invoiceLines.push({
        menuItemId: item.id,
        name: item.name,
        quantity: line.quantity,
        priceCents: item.priceCents,
        totalPriceCents: item.priceCents * line.quantity,
      });
    }

    const priceById = new Map(invoiceLines.map((l) => [l.menuItemId, l.priceCents]));
    const subtotal = subTotalPriceCents(cart.lines, priceById);

    const totals = buildTotals(restaurant, subtotal, customerLocation);

    if (simulatePayment === 'failure') {
      return { ok: false, reason: 'payment_refused', totals };
    }

    const orderId = crypto.randomUUID();
    const order: RestaurantOrder = {
      id: orderId,
      restaurantId: restaurant.id,
      lines: invoiceLines.map((l) => ({
        menuItemId: l.menuItemId,
        name: l.name,
        quantity: l.quantity,
        unitPriceCents: l.priceCents,
      })),
      kitchenStatus: 'pending_acceptance',
      estimatedPrepMinutes: null,
      courierId: null,
      deliveryPhase: 'none',
      tipCents,
      deliveryDistanceKm: totals.distanceKm,
      createdAtIso: new Date().toISOString(),
    };

    const commit = await this.paidOrderCommit.commit({
      restaurantId: restaurant.id,
      order,
      stockDecrements: cart.lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
    });

    if (!commit.ok) {
      return { ok: false, reason: 'insufficient_stock', menuItemId: commit.menuItemId };
    }

    const invoice: DetailsInvoice = {
      ...totals,
      invoiceNumber: `INV-${crypto.randomUUID()}`,
      issuedAtIso: new Date().toISOString(),
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      lines: invoiceLines,
    };

    return { ok: true, invoice };
  }
}
