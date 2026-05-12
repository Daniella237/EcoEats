import { DatabaseSync } from 'node:sqlite';
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

function parseRestaurant(row: { id: string; name: string; owner_id: string; lat: number; lon: number; menu_json: string }): Restaurant {
  const menu = JSON.parse(row.menu_json) as MenuItem[];
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    location: { latitude: row.lat, longitude: row.lon },
    menu,
  };
}

function parseOrder(row: {
  id: string;
  restaurant_id: string;
  lines_json: string;
  kitchen_status: string;
  est_prep: number | null;
  courier_id: string | null;
  delivery_phase: string;
  tip_cents: number;
  delivery_distance_km: number;
  created_at_iso: string;
}): RestaurantOrder {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    lines: JSON.parse(row.lines_json) as RestaurantOrder['lines'],
    kitchenStatus: row.kitchen_status as RestaurantOrder['kitchenStatus'],
    estimatedPrepMinutes: row.est_prep,
    courierId: row.courier_id,
    deliveryPhase: row.delivery_phase as RestaurantOrder['deliveryPhase'],
    tipCents: row.tip_cents,
    deliveryDistanceKm: row.delivery_distance_km,
    createdAtIso: row.created_at_iso,
  };
}

function parseCourier(row: { id: string; tier: string; availability: string; wallet_cents: number; deliveries_json: string }): Courier {
  return {
    id: row.id,
    tier: row.tier as Courier['tier'],
    availability: row.availability as Courier['availability'],
    walletCents: row.wallet_cents,
    activeDeliveries: JSON.parse(row.deliveries_json) as Courier['activeDeliveries'],
  };
}

export class SqliteEcoRepository
  implements
    MenuCatalogPort,
    RestaurantMenuRepositoryPort,
    OrdersRepositoryPort,
    CouriersRepositoryPort,
    PaidOrderCommitPort,
    OrderEventsPort
{
  private readonly db: DatabaseSync;
  private readonly incomingListeners = new Map<string, Set<(e: IncomingOrderEvent) => void>>();

  constructor(path: string = ':memory:') {
    this.db = new DatabaseSync(path);
    this.migrate();
    this.seedIfEmpty();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        menu_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        lines_json TEXT NOT NULL,
        kitchen_status TEXT NOT NULL,
        est_prep INTEGER,
        courier_id TEXT,
        delivery_phase TEXT NOT NULL,
        tip_cents INTEGER NOT NULL,
        delivery_distance_km REAL NOT NULL,
        created_at_iso TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS couriers (
        id TEXT PRIMARY KEY,
        tier TEXT NOT NULL,
        availability TEXT NOT NULL,
        wallet_cents INTEGER NOT NULL,
        deliveries_json TEXT NOT NULL
      );
    `);
  }

  private seedIfEmpty(): void {
    const count = this.db.prepare('SELECT COUNT(*) AS c FROM restaurants').get() as { c: number };
    if (count.c > 0) {
      return;
    }
    const insertR = this.db.prepare(
      `INSERT INTO restaurants (id, name, owner_id, lat, lon, menu_json) VALUES (@id, @name, @owner_id, @lat, @lon, @menu_json)`,
    );
    for (const r of createSeedRestaurants()) {
      insertR.run({
        id: r.id,
        name: r.name,
        owner_id: r.ownerId,
        lat: r.location.latitude,
        lon: r.location.longitude,
        menu_json: JSON.stringify(r.menu),
      });
    }
    const insertC = this.db.prepare(
      `INSERT INTO couriers (id, tier, availability, wallet_cents, deliveries_json) VALUES (@id, @tier, @availability, @wallet_cents, @deliveries_json)`,
    );
    for (const c of createSeedCouriers()) {
      insertC.run({
        id: c.id,
        tier: c.tier,
        availability: c.availability,
        wallet_cents: c.walletCents,
        deliveries_json: JSON.stringify(c.activeDeliveries),
      });
    }
  }

  private loadRestaurant(id: string): Restaurant | null {
    const row = this.db.prepare('SELECT * FROM restaurants WHERE id = ?').get(id) as
      | {
          id: string;
          name: string;
          owner_id: string;
          lat: number;
          lon: number;
          menu_json: string;
        }
      | undefined;
    return row ? parseRestaurant(row) : null;
  }

  async listAvailableRestaurants(): Promise<readonly Restaurant[]> {
    const rows = this.db.prepare('SELECT * FROM restaurants').all() as Array<{
      id: string;
      name: string;
      owner_id: string;
      lat: number;
      lon: number;
      menu_json: string;
    }>;
    return rows.map((row) => {
      const r = parseRestaurant(row);
      return {
        ...r,
        menu: r.menu.filter((m) => m.remainingStock > 0),
      };
    });
  }

  async getRestaurantForOwner(restaurantId: string, ownerId: string): Promise<Restaurant | null> {
    const r = this.loadRestaurant(restaurantId);
    if (!r || r.ownerId !== ownerId) {
      return null;
    }
    return r;
  }

  async saveRestaurant(restaurant: Restaurant): Promise<void> {
    this.db
      .prepare(
        `UPDATE restaurants SET name=@name, owner_id=@owner_id, lat=@lat, lon=@lon, menu_json=@menu_json WHERE id=@id`,
      )
      .run({
        id: restaurant.id,
        name: restaurant.name,
        owner_id: restaurant.ownerId,
        lat: restaurant.location.latitude,
        lon: restaurant.location.longitude,
        menu_json: JSON.stringify(restaurant.menu),
      });
  }

  async listByRestaurant(restaurantId: string): Promise<readonly RestaurantOrder[]> {
    const rows = this.db
      .prepare('SELECT * FROM orders WHERE restaurant_id = ? ORDER BY created_at_iso DESC')
      .all(restaurantId) as Array<{
      id: string;
      restaurant_id: string;
      lines_json: string;
      kitchen_status: string;
      est_prep: number | null;
      courier_id: string | null;
      delivery_phase: string;
      tip_cents: number;
      delivery_distance_km: number;
      created_at_iso: string;
    }>;
    return rows.map(parseOrder);
  }

  async findOrderById(orderId: string): Promise<RestaurantOrder | null> {
    const row = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as
      | {
          id: string;
          restaurant_id: string;
          lines_json: string;
          kitchen_status: string;
          est_prep: number | null;
          courier_id: string | null;
          delivery_phase: string;
          tip_cents: number;
          delivery_distance_km: number;
          created_at_iso: string;
        }
      | undefined;
    return row ? parseOrder(row) : null;
  }

  async persistOrder(order: RestaurantOrder): Promise<void> {
    const exists = this.db.prepare('SELECT 1 FROM orders WHERE id = ?').get(order.id);
    if (exists) {
      this.db
        .prepare(
          `UPDATE orders SET restaurant_id=@rid, lines_json=@lines, kitchen_status=@ks, est_prep=@est, courier_id=@cid, delivery_phase=@dp, tip_cents=@tip, delivery_distance_km=@dkm, created_at_iso=@cat WHERE id=@id`,
        )
        .run({
          id: order.id,
          rid: order.restaurantId,
          lines: JSON.stringify(order.lines),
          ks: order.kitchenStatus,
          est: order.estimatedPrepMinutes,
          cid: order.courierId,
          dp: order.deliveryPhase,
          tip: order.tipCents,
          dkm: order.deliveryDistanceKm,
          cat: order.createdAtIso,
        });
    } else {
      this.db
        .prepare(
          `INSERT INTO orders (id, restaurant_id, lines_json, kitchen_status, est_prep, courier_id, delivery_phase, tip_cents, delivery_distance_km, created_at_iso)
           VALUES (@id, @rid, @lines, @ks, @est, @cid, @dp, @tip, @dkm, @cat)`,
        )
        .run({
          id: order.id,
          rid: order.restaurantId,
          lines: JSON.stringify(order.lines),
          ks: order.kitchenStatus,
          est: order.estimatedPrepMinutes,
          cid: order.courierId,
          dp: order.deliveryPhase,
          tip: order.tipCents,
          dkm: order.deliveryDistanceKm,
          cat: order.createdAtIso,
        });
    }
  }

  async listOrdersEligibleForDeliveryProposal(): Promise<readonly RestaurantOrder[]> {
    const rows = this.db.prepare('SELECT * FROM orders').all() as Array<{
      id: string;
      restaurant_id: string;
      lines_json: string;
      kitchen_status: string;
      est_prep: number | null;
      courier_id: string | null;
      delivery_phase: string;
      tip_cents: number;
      delivery_distance_km: number;
      created_at_iso: string;
    }>;
    return rows
      .map(parseOrder)
      .filter(
        (o) =>
          o.courierId === null &&
          (o.kitchenStatus === 'preparing' || o.kitchenStatus === 'ready_for_pickup'),
      );
  }

  async findCourierById(id: string): Promise<Courier | null> {
    const row = this.db.prepare('SELECT * FROM couriers WHERE id = ?').get(id) as
      | {
          id: string;
          tier: string;
          availability: string;
          wallet_cents: number;
          deliveries_json: string;
        }
      | undefined;
    return row ? parseCourier(row) : null;
  }

  async persistCourier(courier: Courier): Promise<void> {
    this.db
      .prepare(
        `UPDATE couriers SET tier=@tier, availability=@availability, wallet_cents=@wallet_cents, deliveries_json=@deliveries_json WHERE id=@id`,
      )
      .run({
        id: courier.id,
        tier: courier.tier,
        availability: courier.availability,
        wallet_cents: courier.walletCents,
        deliveries_json: JSON.stringify(courier.activeDeliveries),
      });
  }

  async commit(input: {
    readonly restaurantId: string;
    readonly order: RestaurantOrder;
    readonly stockDecrements: readonly { readonly menuItemId: string; readonly quantity: number }[];
  }): Promise<
    | { readonly ok: true }
    | { readonly ok: false; readonly reason: 'insufficient_stock'; readonly menuItemId: string }
  > {
    const r = this.loadRestaurant(input.restaurantId);
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
    const nextRestaurant: Restaurant = { ...r, menu: nextMenu };
    await this.saveRestaurant(nextRestaurant);
    await this.persistOrder(input.order);
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
