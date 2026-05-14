import { useEffect, useState } from 'react';
import { fetchOrder, formatEur } from '../api';
import type { KitchenOrderStatus, RestaurantOrderDto } from '../types';

function kitchenLabel(s: KitchenOrderStatus): string {
  switch (s) {
    case 'pending_acceptance':
      return 'En attente d’acceptation par le restaurant';
    case 'refused':
      return 'Refusée par le restaurant';
    case 'preparing':
      return 'En préparation';
    case 'ready_for_pickup':
      return 'Prête au retrait pour le livreur';
    default:
      return s;
  }
}

function deliveryLabel(order: RestaurantOrderDto): string {
  if (order.deliveryPhase === 'delivered') {
    return 'Livrée';
  }
  if (order.deliveryPhase === 'assigned' && order.courierId) {
    return `Livreur assigné · course en cours (${order.courierId})`;
  }
  return 'Livreur non encore assigné';
}

export function OrderTrackingPanel({
  orderId,
  restaurantName,
  onDismiss,
}: {
  readonly orderId: string;
  readonly restaurantName: string;
  readonly onDismiss: () => void;
}) {
  const [order, setOrder] = useState<RestaurantOrderDto | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const safeId = orderId.trim();

  useEffect(() => {
    if (!safeId) {
      setOrder(null);
      setErr(null);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const o = await fetchOrder(safeId);
        if (!cancelled) {
          setOrder(o);
          setErr(o ? null : 'Commande introuvable (serveur redémarré ou id invalide).');
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : 'Erreur réseau');
        }
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [safeId]);

  if (!safeId) {
    return (
      <section className="dr-tracking-panel" aria-live="polite">
        <p className="dr-modal-error">Référence de commande absente : suivi indisponible.</p>
        <button type="button" className="dr-btn dr-btn-ghost" onClick={onDismiss}>
          Fermer
        </button>
      </section>
    );
  }

  return (
    <section className="dr-tracking-panel" aria-live="polite">
      <div className="dr-tracking-head">
        <div>
          <h3 className="dr-tracking-title">Suivi de commande</h3>
          <p className="dr-tracking-sub">
            {restaurantName} · réf. <code className="dr-mono">{safeId.length > 12 ? `${safeId.slice(0, 8)}…` : safeId}</code>
          </p>
        </div>
        <button type="button" className="dr-btn dr-btn-ghost" onClick={onDismiss}>
          Fermer le suivi
        </button>
      </div>
      {err ? <p className="dr-modal-error">{err}</p> : null}
      {order ? (
        <div className="dr-tracking-body">
          <div className="dr-tracking-grid">
            <div>
              <span className="dr-tracking-k">Cuisine</span>
              <p className="dr-tracking-v">{kitchenLabel(order.kitchenStatus)}</p>
              {order.kitchenStatus === 'preparing' && order.estimatedPrepMinutes !== null ? (
                <p className="dr-tracking-hint">Temps estimé : ~{order.estimatedPrepMinutes} min</p>
              ) : null}
            </div>
            <div>
              <span className="dr-tracking-k">Livraison</span>
              <p className="dr-tracking-v">{deliveryLabel(order)}</p>
              {order.tipCents > 0 ? (
                <p className="dr-tracking-hint">Pourboire sur la commande : {formatEur(order.tipCents)}</p>
              ) : null}
            </div>
          </div>
          {order.kitchenStatus === 'refused' ? (
            <p className="dr-tracking-refused">Le restaurant a refusé cette commande.</p>
          ) : null}
          {order.kitchenStatus !== 'refused' && order.deliveryPhase === 'delivered' ? (
            <p className="dr-tracking-done">Merci ! Votre commande est marquée comme livrée.</p>
          ) : null}
        </div>
      ) : !err ? (
        <p className="dr-empty">Chargement du statut…</p>
      ) : null}
    </section>
  );
}
