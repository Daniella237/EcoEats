import { useCallback, useEffect, useState } from 'react';
import {
  fetchCatalog,
  fetchRestaurantOrders,
  postAcceptRestaurantOrder,
  postMarkOrderReady,
  postRefuseRestaurantOrder,
} from '../api';
import type { Restaurant, RestaurantOrderDto } from '../types';

function isCommandOk(v: unknown): v is { ok: true } {
  return typeof v === 'object' && v !== null && 'ok' in v && (v as { ok: unknown }).ok === true;
}

function reason(v: unknown): string {
  if (typeof v === 'object' && v !== null && 'reason' in v) {
    return String((v as { reason: unknown }).reason);
  }
  return 'erreur';
}

export function KitchenOpsPage() {
  const [catalog, setCatalog] = useState<readonly Restaurant[] | null>(null);
  const [restaurantId, setRestaurantId] = useState<string>('');
  const [orders, setOrders] = useState<readonly RestaurantOrderDto[]>([]);
  const [prepByOrder, setPrepByOrder] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const c = await fetchCatalog();
        setCatalog(c);
        setRestaurantId((prev) => prev || c[0]?.id || '');
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'Catalogue inaccessible');
      }
    })();
  }, []);

  const ownerId = catalog?.find((r) => r.id === restaurantId)?.ownerId ?? '';

  const refresh = useCallback(async () => {
    if (!ownerId || !restaurantId) {
      return;
    }
    const res = await fetchRestaurantOrders(ownerId, restaurantId);
    if (res.ok) {
      setOrders(res.orders);
    }
  }, [ownerId, restaurantId]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const run = async (orderId: string, fn: () => Promise<unknown>, okLabel: string) => {
    setBusyId(orderId);
    setMsg(null);
    try {
      const r = await fn();
      if (isCommandOk(r)) {
        setMsg(okLabel);
        await refresh();
      } else {
        setMsg(`Action impossible : ${reason(r)}`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

  const selected = catalog?.find((r) => r.id === restaurantId);

  return (
    <div className="dr-ops-page">
      <header className="dr-ops-header">
        <h1>Espace cuisine (restaurateur)</h1>
        <p>Acceptation, refus, passage en « prêt au retrait ».</p>
      </header>

      <div className="dr-ops-field">
        <label htmlFor="kitchen-rest">Restaurant</label>
        <select
          id="kitchen-rest"
          value={restaurantId}
          onChange={(e) => {
            setRestaurantId(e.target.value);
            setOrders([]);
          }}
        >
          {(catalog ?? []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.id}) — propriétaire {r.ownerId}
            </option>
          ))}
        </select>
      </div>

      {msg ? <p className="dr-ops-banner">{msg}</p> : null}

      <h2 className="dr-ops-sub">Commandes · {selected?.name ?? '…'}</h2>
      {orders.length === 0 ? (
        <p className="dr-empty">Aucune commande pour l’instant (ou chargement).</p>
      ) : (
        <ul className="dr-ops-list">
          {orders.map((o) => (
            <li key={o.id} className="dr-ops-card">
              <div className="dr-ops-card-head">
                <strong>#{o.id.slice(0, 8)}…</strong>
                <span className="dr-ops-badge">{o.kitchenStatus}</span>
                <span className="dr-ops-badge dr-ops-badge-muted">{o.deliveryPhase}</span>
              </div>
              <ul className="dr-ops-lines">
                {o.lines.map((l) => (
                  <li key={l.menuItemId}>
                    {l.name} ×{l.quantity}
                  </li>
                ))}
              </ul>
              <div className="dr-ops-actions">
                {o.kitchenStatus === 'pending_acceptance' ? (
                  <>
                    <label className="dr-ops-inline">
                      Prépa (min)
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={prepByOrder[o.id] ?? '20'}
                        onChange={(e) => setPrepByOrder((m) => ({ ...m, [o.id]: e.target.value }))}
                      />
                    </label>
                    <button
                      type="button"
                      className="dr-btn dr-btn-primary"
                      disabled={busyId === o.id}
                      onClick={() => {
                        const raw = prepByOrder[o.id] ?? '20';
                        const n = Number.parseInt(raw, 10);
                        if (!Number.isFinite(n) || n <= 0) {
                          setMsg('Indiquez un nombre entier de minutes strictement positif.');
                          return;
                        }
                        void run(o.id, () => postAcceptRestaurantOrder(ownerId, restaurantId, o.id, n), 'Commande acceptée.');
                      }}
                    >
                      Accepter
                    </button>
                    <button
                      type="button"
                      className="dr-btn dr-btn-muted"
                      disabled={busyId === o.id}
                      onClick={() =>
                        void run(o.id, () => postRefuseRestaurantOrder(ownerId, restaurantId, o.id), 'Commande refusée.')
                      }
                    >
                      Refuser
                    </button>
                  </>
                ) : null}
                {o.kitchenStatus === 'preparing' ? (
                  <button
                    type="button"
                    className="dr-btn dr-btn-primary"
                    disabled={busyId === o.id}
                    onClick={() =>
                      void run(o.id, () => postMarkOrderReady(ownerId, restaurantId, o.id), 'Commande marquée prête au retrait.')
                    }
                  >
                    Marquer prête au retrait
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
