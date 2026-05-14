import type { MenuCatalogPort } from '../../application/ports/menu-catalog.port.js';
import type { CouriersRepositoryPort } from '../../application/ports/couriers-repository.port.js';
import type { OrderEventsPort, IncomingOrderEvent } from '../../application/ports/order-events.port.js';
import type { OrdersRepositoryPort } from '../../application/ports/orders-repository.port.js';
import type { PaidOrderCommitPort } from '../../application/ports/paid-order-commit.port.js';
import type { RestaurantMenuRepositoryPort } from '../../application/ports/restaurant-menu-repository.port.js';
import type { Courier } from '../../domain/entities/courier.js';
import type { MenuItem } from '../../domain/entities/menu-item.js';
import type { Restaurant } from '../../domain/entities/restaurant.js';
import type { RestaurantOrder } from '../../domain/entities/restaurant-order.js';
import { createSeedCouriers, createSeedRestaurants } from './seed-eco-data.js';

export class InMemoryEcoRepository
  implements
    MenuCatalogPort,
    RestaurantMenuRepositoryPort,
    OrdersRepositoryPort,
    CouriersRepositoryPort,
    PaidOrderCommitPort,
    OrderEventsPort
{
  private readonly restaurants = new Map<string, Restaurant>();
  private readonly orders = new Map<string, RestaurantOrder>();
  private readonly couriers = new Map<string, Courier>();
  private readonly incomingListeners = new Map<string, Set<(e: IncomingOrderEvent) => void>>();

  constructor() {
    for (const r of createSeedRestaurants()) {
      this.restaurants.set(r.id, r);
    }
    for (const c of createSeedCouriers()) {
      this.couriers.set(c.id, c);
    }
  }

  async listAvailableRestaurants(): Promise<readonly Restaurant[]> {
    return [...this.restaurants.values()].map((r) => ({
      ...r,
      menu: r.menu.filter((m) => m.remainingStock > 0),
    }));
  }

  async getRestaurantForOwner(restaurantId: string, ownerId: string): Promise<Restaurant | null> {
    const r = this.restaurants.get(restaurantId);
    if (!r || r.ownerId !== ownerId) {
      return null;
    }
    return r;
  }

  async saveRestaurant(restaurant: Restaurant): Promise<void> {
    this.restaurants.set(restaurant.id, restaurant);
  }

  async listByRestaurant(restaurantId: string): Promise<readonly RestaurantOrder[]> {
    return [...this.orders.values()]
      .filter((o) => o.restaurantId === restaurantId)
      .sort((a, b) => (a.createdAtIso < b.createdAtIso ? 1 : -1));
  }

  async findOrderById(orderId: string): Promise<RestaurantOrder | null> {
    return this.orders.get(orderId) ?? null;
  }

  async persistOrder(order: RestaurantOrder): Promise<void> {
    this.orders.set(order.id, order);
  }

  async listOrdersEligibleForDeliveryProposal(): Promise<readonly RestaurantOrder[]> {
    return [...this.orders.values()].filter(
      (o) =>
        o.courierId === null &&
        (o.kitchenStatus === 'preparing' || o.kitchenStatus === 'ready_for_pickup'),
    );
  }

  async listAssignedOrdersForCourier(courierId: string): Promise<readonly RestaurantOrder[]> {
    return [...this.orders.values()].filter(
      (o) => o.courierId === courierId && o.deliveryPhase === 'assigned',
    );
  }

  async findCourierById(id: string): Promise<Courier | null> {
    return this.couriers.get(id) ?? null;
  }

  async persistCourier(courier: Courier): Promise<void> {
    this.couriers.set(courier.id, courier);
  }

  async commit(input: {
    readonly restaurantId: string;
    readonly order: RestaurantOrder;
    readonly stockDecrements: readonly { readonly menuItemId: string; readonly quantity: number }[];
  }): Promise<
    | { readonly ok: true }
    | { readonly ok: false; readonly reason: 'insufficient_stock'; readonly menuItemId: string }
  > {
    const r = this.restaurants.get(input.restaurantId);
    if (!r) {
      return {
        ok: false,
        reason: 'insufficient_stock',
        menuItemId: input.stockDecrements[0]?.menuItemId ?? 'unknown',
      };
    }

    for (const dec of input.stockDecrements) {
      const item = r.menu.find((m) => m.id === dec.menuItemId);
      if (!item || item.remainingStock < dec.quantity) {
        return { ok: false, reason: 'insufficient_stock', menuItemId: dec.menuItemId };
      }
    }

    const nextMenu: MenuItem[] = r.menu.map((m) => {
      const dec = input.stockDecrements.find((d) => d.menuItemId === m.id);
      if (!dec) {
        return m;
      }
      return { ...m, remainingStock: m.remainingStock - dec.quantity };
    });

    this.restaurants.set(r.id, { ...r, menu: nextMenu });
    this.orders.set(input.order.id, input.order);
    this.publishIncomingOrder({ orderId: input.order.id, restaurantId: input.restaurantId });
    return { ok: true };
  }

  publishIncomingOrder(event: IncomingOrderEvent): void {
    const set = this.incomingListeners.get(event.restaurantId);
    if (!set) {
      return;
    }
    for (const fn of set) {
      fn(event);
    }
  }

  subscribeIncomingOrders(
    restaurantId: string,
    listener: (event: IncomingOrderEvent) => void,
  ): () => void {
    if (!this.incomingListeners.has(restaurantId)) {
      this.incomingListeners.set(restaurantId, new Set());
    }
    const bucket = this.incomingListeners.get(restaurantId)!;
    bucket.add(listener);
    return () => {
      bucket.delete(listener);
      if (bucket.size === 0) {
        this.incomingListeners.delete(restaurantId);
      }
    };
  }
}
