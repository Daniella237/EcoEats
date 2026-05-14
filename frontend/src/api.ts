import { cents } from './lib/money';
import type {
  AddItemToCartResult,
  Cart,
  CourierDto,
  DetailsInvoice,
  InvoiceLineRow,
  ListRestaurantOrdersResponse,
  PlaceOrderResult,
  Restaurant,
  RestaurantOrderDto,
  TotalOrders,
} from './types';

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '';
}

async function parseJson<T>(r: Response): Promise<T> {
  const text = await r.text();
  if (!text) {
    throw new Error(r.statusText || `HTTP ${r.status}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text);
  }
}

function readCentsDual(o: Record<string, unknown>, camel: string, snake: string): number {
  return cents(o[camel] ?? o[snake]);
}

function readKmDual(o: Record<string, unknown>): number {
  const v = o.distanceKm ?? o.distance_km;
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function inferTipAndTotal(
  sub: number,
  del: number,
  svc: number,
  tipRaw: number,
  totalRaw: number,
): { tip: number; total: number } {
  const base = sub + del + svc;
  let tip = Math.max(0, tipRaw);
  let total = Math.max(0, totalRaw);
  if (tip === 0 && total > base) {
    tip = total - base;
  }
  if (total === 0 && base + tip > 0) {
    total = base + tip;
  }
  return { tip, total };
}

function readStrDual(o: Record<string, unknown>, camel: string, snake: string): string {
  const a = o[camel];
  const b = o[snake];
  if (typeof a === 'string') {
    return a;
  }
  if (typeof b === 'string') {
    return b;
  }
  return '';
}

function normalizeInvoiceLines(raw: unknown): readonly InvoiceLineRow[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((row): InvoiceLineRow => {
    if (!row || typeof row !== 'object') {
      return { menuItemId: '?', name: '', quantity: 0, priceCents: 0, totalPriceCents: 0 };
    }
    const r = row as Record<string, unknown>;
    const qtyRaw = r.quantity;
    const qty =
      typeof qtyRaw === 'number' && Number.isFinite(qtyRaw)
        ? Math.max(0, Math.trunc(qtyRaw))
        : Math.max(0, Math.trunc(Number(qtyRaw) || 0));
    return {
      menuItemId: String(r.menuItemId ?? r.menu_item_id ?? ''),
      name: String(r.name ?? ''),
      quantity: qty,
      priceCents: readCentsDual(r, 'priceCents', 'price_cents'),
      totalPriceCents: readCentsDual(r, 'totalPriceCents', 'total_price_cents'),
    };
  });
}

function normalizeTotalOrdersFromRecord(o: Record<string, unknown>): TotalOrders {
  const sub = readCentsDual(o, 'subTotalCents', 'sub_total_cents');
  const del = readCentsDual(o, 'deliveryCents', 'delivery_cents');
  const svc = readCentsDual(o, 'serviceCents', 'service_cents');
  const tipRaw = readCentsDual(o, 'tipCents', 'tip_cents');
  const totalRaw = readCentsDual(o, 'totalCents', 'total_cents');
  const { tip, total } = inferTipAndTotal(sub, del, svc, tipRaw, totalRaw);
  return {
    subTotalCents: sub,
    deliveryCents: del,
    serviceCents: svc,
    tipCents: tip,
    totalCents: total,
    distanceKm: readKmDual(o),
    deliveryExplanation: readStrDual(o, 'deliveryExplanation', 'delivery_explanation'),
    serviceExplanation: readStrDual(o, 'serviceExplanation', 'service_explanation'),
    tipExplanation:
      readStrDual(o, 'tipExplanation', 'tip_explanation') ||
      'Pourboire — intégralement reversé au livreur (aucune commission plateforme).',
  };
}

function normalizeDetailsInvoice(inv: unknown): DetailsInvoice {
  if (!inv || typeof inv !== 'object') {
    throw new Error('Facture invalide');
  }
  const o = inv as Record<string, unknown>;
  const totals = normalizeTotalOrdersFromRecord(o);
  const camelOrder = typeof o.orderId === 'string' ? o.orderId.trim() : '';
  const snakeOrder = typeof o.order_id === 'string' ? String(o.order_id).trim() : '';
  const orderId = camelOrder || snakeOrder || undefined;
  return {
    ...totals,
    orderId,
    invoiceNumber: readStrDual(o, 'invoiceNumber', 'invoice_number'),
    issuedAtIso: readStrDual(o, 'issuedAtIso', 'issued_at_iso') || new Date().toISOString(),
    restaurantId: readStrDual(o, 'restaurantId', 'restaurant_id'),
    restaurantName: readStrDual(o, 'restaurantName', 'restaurant_name'),
    lines: normalizeInvoiceLines(o.lines),
  };
}

function normalizePlaceOrderResult(raw: PlaceOrderResult): PlaceOrderResult {
  if (!raw || typeof raw !== 'object') {
    return raw;
  }
  if ('ok' in raw && raw.ok === true && 'invoice' in raw) {
    try {
      return { ok: true, invoice: normalizeDetailsInvoice(raw.invoice) };
    } catch {
      return raw;
    }
  }
  if (
    'ok' in raw &&
    raw.ok === false &&
    (raw as { reason?: string }).reason === 'payment_refused' &&
    'totals' in raw
  ) {
    const t = (raw as { totals: unknown }).totals;
    if (!t || typeof t !== 'object') {
      return raw;
    }
    return { ok: false, reason: 'payment_refused', totals: normalizeTotalOrdersFromRecord(t as Record<string, unknown>) };
  }
  return raw;
}

export async function fetchCatalog(): Promise<readonly Restaurant[]> {
  const r = await fetch(`${apiBase()}/api/catalog`);
  return parseJson<readonly Restaurant[]>(r);
}

export type GeocodeResult =
  | { ok: true; latitude: number; longitude: number; displayName: string }
  | { ok: false; error: string };

const GEOCODE_MS = 18_000;

function readNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function geocodeAddress(query: string): Promise<GeocodeResult> {
  const q = query.trim();
  if (!q) {
    return { ok: false, error: 'missing_q' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODE_MS);
  try {
    const r = await fetch(`${apiBase()}/api/geocode?${new URLSearchParams({ q })}`, {
      signal: controller.signal,
    });
    let data: unknown;
    try {
      data = await r.json();
    } catch {
      return { ok: false, error: r.ok ? 'not_found' : 'network' };
    }
    if (data && typeof data === 'object' && 'ok' in data && data.ok === true) {
      const o = data as Record<string, unknown>;
      const lat = readNum(o.latitude);
      const lon = readNum(o.longitude);
      if (lat !== null && lon !== null) {
        return {
          ok: true,
          latitude: lat,
          longitude: lon,
          displayName: typeof o.displayName === 'string' ? o.displayName : q,
        };
      }
    }
    const err =
      data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : 'not_found';
    return { ok: false, error: err };
  } catch (e: unknown) {
    const name = e && typeof e === 'object' && 'name' in e ? String((e as { name: unknown }).name) : '';
    if (name === 'AbortError') {
      return { ok: false, error: 'timeout' };
    }
    return { ok: false, error: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

export async function addCartItem(input: {
  cart: Cart;
  restaurantId: string;
  menuItemId: string;
  quantity: number;
}): Promise<AddItemToCartResult> {
  const r = await fetch(`${apiBase()}/api/cart/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson<AddItemToCartResult>(r);
}

export async function replaceCartAndAddItem(input: {
  restaurantId: string;
  menuItemId: string;
  quantity: number;
}): Promise<AddItemToCartResult> {
  const r = await fetch(`${apiBase()}/api/cart/items/replace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson<AddItemToCartResult>(r);
}

/** Même logique que le serveur : number ou chaîne (centimes entiers). */
function toTipCents(raw: unknown): number {
  if (raw === undefined || raw === null) {
    return 0;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.round(raw));
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw.trim().replace(',', '.'));
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  }
  return 0;
}

export async function checkout(input: {
  cart: Cart;
  customerLocation: { latitude: number; longitude: number };
  simulatePayment: 'success' | 'failure';
  tipCents?: number;
}): Promise<PlaceOrderResult> {
  const tipCents = toTipCents(input.tipCents);
  const r = await fetch(`${apiBase()}/api/orders/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cart: input.cart,
      customerLocation: input.customerLocation,
      simulatePayment: input.simulatePayment,
      tipCents,
    }),
  });
  return normalizePlaceOrderResult(await parseJson<PlaceOrderResult>(r));
}

export async function fetchOrder(orderId: string): Promise<RestaurantOrderDto | null> {
  const r = await fetch(`${apiBase()}/api/orders/${encodeURIComponent(orderId)}`);
  if (r.status === 404) {
    return null;
  }
  if (!r.ok) {
    throw new Error(await r.text());
  }
  return parseJson<RestaurantOrderDto>(r);
}

export async function fetchRestaurantOrders(
  ownerId: string,
  restaurantId: string,
): Promise<ListRestaurantOrdersResponse> {
  const r = await fetch(
    `${apiBase()}/api/owners/${encodeURIComponent(ownerId)}/restaurants/${encodeURIComponent(restaurantId)}/orders`,
  );
  return parseJson<ListRestaurantOrdersResponse>(r);
}

export async function postAcceptRestaurantOrder(
  ownerId: string,
  restaurantId: string,
  orderId: string,
  estimatedPrepMinutes: number,
): Promise<unknown> {
  const r = await fetch(
    `${apiBase()}/api/owners/${encodeURIComponent(ownerId)}/restaurants/${encodeURIComponent(restaurantId)}/orders/${encodeURIComponent(orderId)}/accept`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estimatedPrepMinutes }),
    },
  );
  return parseJson(r);
}

export async function postRefuseRestaurantOrder(
  ownerId: string,
  restaurantId: string,
  orderId: string,
): Promise<unknown> {
  const r = await fetch(
    `${apiBase()}/api/owners/${encodeURIComponent(ownerId)}/restaurants/${encodeURIComponent(restaurantId)}/orders/${encodeURIComponent(orderId)}/refuse`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  );
  return parseJson(r);
}

export async function postMarkOrderReady(
  ownerId: string,
  restaurantId: string,
  orderId: string,
): Promise<unknown> {
  const r = await fetch(
    `${apiBase()}/api/owners/${encodeURIComponent(ownerId)}/restaurants/${encodeURIComponent(restaurantId)}/orders/${encodeURIComponent(orderId)}/ready`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  );
  return parseJson(r);
}

export async function fetchDeliveryProposals(): Promise<readonly RestaurantOrderDto[]> {
  const r = await fetch(`${apiBase()}/api/couriers/delivery-proposals`);
  if (!r.ok) {
    throw new Error(await r.text());
  }
  return parseJson<readonly RestaurantOrderDto[]>(r);
}

export async function fetchCourier(courierId: string): Promise<CourierDto | null> {
  const r = await fetch(`${apiBase()}/api/couriers/${encodeURIComponent(courierId)}`);
  if (r.status === 404) {
    return null;
  }
  if (!r.ok) {
    throw new Error(await r.text());
  }
  return normalizeCourierPayload(await parseJson<unknown>(r));
}

/** Normalise la réponse API livreur (camelCase ou snake_case). */
export function normalizeCourierPayload(raw: unknown): CourierDto | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : '';
  if (!id) {
    return null;
  }
  const av = o.availability;
  const availability: CourierDto['availability'] =
    av === 'available' || av === 'unavailable' ? av : 'available';
  const tier: CourierDto['tier'] = o.tier === 'expert' ? 'expert' : 'standard';
  const wc = o.walletCents ?? o.wallet_cents;
  const walletCents = typeof wc === 'number' && Number.isFinite(wc) ? Math.round(wc) : 0;
  const rawDel = o.activeDeliveries ?? o.active_deliveries;
  const activeDeliveries: CourierDto['activeDeliveries'] = Array.isArray(rawDel)
    ? rawDel
        .map((d) => {
          const x = d as Record<string, unknown>;
          const orderId =
            typeof x.orderId === 'string' ? x.orderId : typeof x.order_id === 'string' ? x.order_id : '';
          const restaurantId =
            typeof x.restaurantId === 'string'
              ? x.restaurantId
              : typeof x.restaurant_id === 'string'
                ? x.restaurant_id
                : '';
          return { orderId, restaurantId };
        })
        .filter((d) => d.orderId !== '')
    : [];
  return { id, tier, availability, walletCents, activeDeliveries };
}

export async function postCourierAvailability(
  courierId: string,
  availability: 'available' | 'unavailable',
): Promise<unknown> {
  const r = await fetch(`${apiBase()}/api/couriers/${encodeURIComponent(courierId)}/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ availability }),
  });
  return parseJson(r);
}

export async function postAcceptDelivery(courierId: string, orderId: string): Promise<unknown> {
  const r = await fetch(
    `${apiBase()}/api/couriers/${encodeURIComponent(courierId)}/deliveries/${encodeURIComponent(orderId)}/accept`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  );
  return parseJson(r);
}

export async function postCompleteDelivery(courierId: string, orderId: string): Promise<unknown> {
  const r = await fetch(
    `${apiBase()}/api/couriers/${encodeURIComponent(courierId)}/deliveries/${encodeURIComponent(orderId)}/complete`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  );
  return parseJson(r);
}

export function formatEur(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
