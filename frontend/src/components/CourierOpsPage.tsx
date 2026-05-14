import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchCourier,
  fetchDeliveryProposals,
  fetchOrder,
  formatEur,
  normalizeCourierPayload,
  postAcceptDelivery,
  postCompleteDelivery,
  postCourierAvailability,
} from '../api';
import type { CourierDto, RestaurantOrderDto } from '../types';

const COURIERS: readonly { id: string; label: string }[] = [
  { id: 'cour-standard', label: 'Standard (1 course à la fois)' },
  { id: 'cour-expert', label: 'Expert (plusieurs courses même resto)' },
];

function isCommandOk(v: unknown): v is { ok: true } {
  return typeof v === 'object' && v !== null && 'ok' in v && (v as { ok: unknown }).ok === true;
}

function reason(v: unknown): string {
  if (typeof v === 'object' && v !== null && 'reason' in v) {
    return String((v as { reason: unknown }).reason);
  }
  return 'erreur';
}

const ACCEPT_REASON_FR: Record<string, string> = {
  unknown_order: 'Commande introuvable (déjà prise ou expirée). Actualisez la liste.',
  order_not_proposable:
    'La commande n’est plus proposable (le restaurant doit l’avoir acceptée : statut « en préparation » ou « prêt au retrait »).',
  unknown_courier: 'Identifiant livreur inconnu.',
  courier_cannot_accept:
    'Limite atteinte : en standard, une seule course à la fois ; en expert, deux courses maximum et uniquement pour le même restaurant.',
  order_already_assigned: 'Un autre livreur a déjà accepté cette commande.',
};

export function CourierOpsPage() {
  const [courierId, setCourierId] = useState(COURIERS[0].id);
  const [courier, setCourier] = useState<CourierDto | null>(null);
  const [proposals, setProposals] = useState<readonly RestaurantOrderDto[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Dernier livreur affiché (pour fusion si le GET renvoie activeDeliveries vide). */
  const courierUiRef = useRef<CourierDto | null>(null);
  /** Fenêtre courte après acceptation : le GET peut encore renvoyer une liste vide. */
  const lastAcceptAtRef = useRef(0);

  useEffect(() => {
    courierUiRef.current = courier;
  }, [courier]);

  /** Détail des commandes encore en cours (rempli à l’acceptation, pour ne pas « perdre » la carte). */
  const [orderByActiveId, setOrderByActiveId] = useState<Record<string, RestaurantOrderDto>>({});

  const activeSlots = useMemo(() => {
    const m = new Map<string, { orderId: string; restaurantId: string }>();
    for (const d of courier?.activeDeliveries ?? []) {
      m.set(d.orderId, d);
    }
    for (const [oid, ord] of Object.entries(orderByActiveId)) {
      if (!m.has(oid)) {
        m.set(oid, { orderId: oid, restaurantId: ord.restaurantId });
      }
    }
    return Array.from(m.values());
  }, [courier, orderByActiveId]);

  const activeOrderIdsKey = useMemo(() => {
    const del = courier?.activeDeliveries;
    if (!del?.length) {
      return '';
    }
    return [...del]
      .map((d) => d.orderId)
      .sort()
      .join('|');
  }, [courier?.activeDeliveries]);

  useEffect(() => {
    if (!activeOrderIdsKey) {
      return;
    }
    const ids = activeOrderIdsKey.split('|');
    let cancelled = false;
    void (async () => {
      const additions: Record<string, RestaurantOrderDto> = {};
      for (const id of ids) {
        try {
          const o = await fetchOrder(id);
          if (o) {
            additions[id] = o;
          }
        } catch {
          /* ignore */
        }
        if (cancelled) {
          return;
        }
      }
      if (cancelled || Object.keys(additions).length === 0) {
        return;
      }
      setOrderByActiveId((prev) => {
        const next = { ...prev };
        for (const [id, o] of Object.entries(additions)) {
          if (!next[id]) {
            next[id] = o;
          }
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [activeOrderIdsKey]);

  const refreshAll = useCallback(async () => {
    let nextCourier: CourierDto | null | undefined;
    try {
      nextCourier = await fetchCourier(courierId);
    } catch {
      /* erreur réseau : ne pas toucher au livreur affiché */
    }
    try {
      const p = await fetchDeliveryProposals();
      setProposals(p);
    } catch {
      /* idem */
    }
    if (nextCourier === undefined) {
      return;
    }
    if (nextCourier === null) {
      setCourier(null);
      setOrderByActiveId({});
      return;
    }

    const prev = courierUiRef.current;
    let merged = nextCourier;
    const withinAcceptGrace = Date.now() - lastAcceptAtRef.current < 4000;
    if (
      withinAcceptGrace &&
      prev &&
      prev.id === nextCourier.id &&
      nextCourier.activeDeliveries.length === 0 &&
      prev.activeDeliveries.length > 0
    ) {
      merged = { ...nextCourier, activeDeliveries: prev.activeDeliveries };
    }

    setCourier(merged);
    courierUiRef.current = merged;

    setOrderByActiveId((prevSnap) => {
      const allowed = new Set(merged.activeDeliveries.map((d) => d.orderId));
      if (allowed.size === 0) {
        return prevSnap;
      }
      const out: Record<string, RestaurantOrderDto> = {};
      for (const id of allowed) {
        if (prevSnap[id]) {
          out[id] = prevSnap[id];
        }
      }
      return out;
    });
  }, [courierId]);

  useEffect(() => {
    setCourier(null);
    setProposals([]);
    setOrderByActiveId({});
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshAll();
    }, 3000);
    return () => window.clearInterval(id);
  }, [refreshAll]);

  const setAvailability = async (availability: 'available' | 'unavailable') => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await postCourierAvailability(courierId, availability);
      if (isCommandOk(r)) {
        setMsg(availability === 'available' ? 'Vous êtes disponible.' : 'Vous êtes indisponible.');
        await refreshAll();
      } else {
        setMsg(`Disponibilité : ${reason(r)}`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const accept = async (orderId: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await postAcceptDelivery(courierId, orderId);
      if (isCommandOk(r)) {
        const body = r as { courier?: unknown; order?: unknown };
        let mapped = normalizeCourierPayload(body.courier);
        if (!mapped && body.order && typeof body.order === 'object' && body.order !== null && 'id' in body.order) {
          const o = body.order as RestaurantOrderDto;
          const prev = courierUiRef.current;
          if (o.id && prev && prev.id === courierId) {
            mapped = {
              ...prev,
              activeDeliveries: [...prev.activeDeliveries, { orderId: o.id, restaurantId: o.restaurantId }],
            };
          } else if (o.id) {
            mapped = {
              id: courierId,
              tier: 'standard',
              availability: 'available',
              walletCents: 0,
              activeDeliveries: [{ orderId: o.id, restaurantId: o.restaurantId }],
            };
          }
        }
        if (mapped) {
          setCourier(mapped);
          courierUiRef.current = mapped;
        }
        if (body.order && typeof body.order === 'object' && body.order !== null && 'id' in body.order) {
          const o = body.order as RestaurantOrderDto;
          if (o.id) {
            setOrderByActiveId((prev) => ({ ...prev, [o.id]: o }));
          }
        }
        setProposals((prev) => prev.filter((p) => p.id !== orderId));
        setMsg('Course acceptée.');
        lastAcceptAtRef.current = Date.now();
        void refreshAll();
      } else {
        const code = reason(r);
        setMsg(`Acceptation impossible : ${ACCEPT_REASON_FR[code] ?? code}`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const complete = async (orderId: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await postCompleteDelivery(courierId, orderId);
      if (isCommandOk(r)) {
        const body = r as { courier?: unknown; payoutCents?: number };
        const mapped = normalizeCourierPayload(body.courier);
        if (mapped) {
          setCourier(mapped);
          courierUiRef.current = mapped;
        }
        setOrderByActiveId((prev) => {
          const copy = { ...prev };
          delete copy[orderId];
          return copy;
        });
        if (typeof body.payoutCents === 'number') {
          setMsg(`Livraison terminée. Gain versé au portefeuille : ${formatEur(body.payoutCents)}.`);
        } else {
          setMsg('Livraison terminée.');
        }
      } else {
        setMsg(`Clôture : ${reason(r)}`);
      }
      await refreshAll();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dr-ops-page">
      <header className="dr-ops-header">
        <h1>Espace livreur</h1>
        <p className="dr-ops-hint">
          Les propositions n’apparaissent qu’après qu’un restaurateur ait <strong>accepté</strong> la commande (statut «
          en préparation » ou « prêt au retrait »). Tant qu’elle est « en attente d’acceptation », aucun livreur ne peut la
          prendre.
        </p>
      </header>

      <div className="dr-ops-field">
        <label htmlFor="cour-self">Profil livreur</label>
        <select id="cour-self" value={courierId} onChange={(e) => setCourierId(e.target.value)}>
          {COURIERS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} ({c.id})
            </option>
          ))}
        </select>
      </div>

      {courier ? (
        <div className="dr-courier-wallet">
          <span>
            Portefeuille : <strong>{formatEur(courier.walletCents)}</strong>
          </span>
          <span className="dr-ops-badge">{courier.tier}</span>
          <span className="dr-ops-badge dr-ops-badge-muted">{courier.availability}</span>
        </div>
      ) : null}

      <div className="dr-ops-actions dr-ops-actions-spaced">
        <button type="button" className="dr-btn dr-btn-primary" disabled={busy} onClick={() => void setAvailability('available')}>
          Disponible
        </button>
        <button type="button" className="dr-btn dr-btn-muted" disabled={busy} onClick={() => void setAvailability('unavailable')}>
          Indisponible
        </button>
      </div>

      {msg ? <p className="dr-ops-banner">{msg}</p> : null}

      <h2 className="dr-ops-sub">Courses actives</h2>
      {activeSlots.length > 0 ? (
        <ul className="dr-ops-list">
          {activeSlots.map((d) => {
            const detail = orderByActiveId[d.orderId];
            return (
              <li key={d.orderId} className="dr-ops-card">
                <div className="dr-ops-card-head">
                  <strong>#{d.orderId.slice(0, 8)}…</strong>
                  <span className="dr-ops-badge">{detail?.kitchenStatus ?? 'assigned'}</span>
                  <span className="dr-ops-badge dr-ops-badge-muted">{d.restaurantId}</span>
                </div>
                {detail ? (
                  <ul className="dr-ops-lines">
                    {detail.lines.map((l) => (
                      <li key={l.menuItemId}>
                        {l.name} ×{l.quantity}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <button type="button" className="dr-btn dr-btn-primary" disabled={busy} onClick={() => void complete(d.orderId)}>
                  Marquer livrée
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="dr-empty">Aucune course assignée.</p>
      )}

      <h2 className="dr-ops-sub">Propositions ouvertes (sans livreur, en préparation ou prêt)</h2>
      {proposals.length === 0 ? (
        <p className="dr-empty">Aucune proposition pour le moment.</p>
      ) : (
        <ul className="dr-ops-list">
          {proposals.map((o) => (
            <li key={o.id} className="dr-ops-card">
              <div className="dr-ops-card-head">
                <strong>#{o.id.slice(0, 8)}…</strong>
                <span className="dr-ops-badge">{o.kitchenStatus}</span>
                <span className="dr-ops-badge dr-ops-badge-muted">{o.restaurantId}</span>
              </div>
              <ul className="dr-ops-lines">
                {o.lines.map((l) => (
                  <li key={l.menuItemId}>
                    {l.name} ×{l.quantity}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="dr-btn dr-btn-primary"
                disabled={busy || (courier != null && courier.availability !== 'available')}
                onClick={() => void accept(o.id)}
              >
                Accepter la course
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
