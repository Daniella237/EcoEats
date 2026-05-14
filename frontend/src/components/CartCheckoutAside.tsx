import { formatEur } from '../api';
import type { DeliveryPlace } from '../clientTypes';
import type { Cart, DetailsInvoice, TotalOrders } from '../types';
import { InvoiceDetailPanel } from './InvoiceDetailPanel';
import { PaymentRefusedPanel } from './PaymentRefusedPanel';

export type CartCheckoutAsideProps = {
  readonly cart: Cart;
  readonly busy: boolean;
  readonly delivery: DeliveryPlace | null;
  readonly tipEuro: string;
  readonly setTipEuro: (v: string) => void;
  readonly payment: 'success' | 'failure';
  readonly setPayment: (v: 'success' | 'failure') => void;
  readonly onCheckout: () => void;
  readonly itemLabel: (restaurantId: string | null, menuItemId: string) => string;
  readonly lineUnitPrice: (restaurantId: string | null, menuItemId: string) => number;
  readonly onBumpQty: (delta: number, menuItemId: string) => void;
  readonly onRemoveLine: (menuItemId: string) => void;
  readonly refusedTotals: TotalOrders | null;
  readonly invoice: DetailsInvoice | null;
};

export function CartCheckoutAside({
  cart,
  busy,
  delivery,
  tipEuro,
  setTipEuro,
  payment,
  setPayment,
  onCheckout,
  itemLabel,
  lineUnitPrice,
  onBumpQty,
  onRemoveLine,
  refusedTotals,
  invoice,
}: CartCheckoutAsideProps) {
  return (
    <aside className="dr-aside">
      <h2>Panier</h2>
      {cart.lines.length === 0 ? (
        <p className="dr-empty">Ajoutez des plats depuis le menu.</p>
      ) : (
        <ul className="dr-cart-lines">
          {cart.lines.map((line) => (
            <li key={line.menuItemId}>
              <span className="dr-line-name">{itemLabel(cart.restaurantId, line.menuItemId)}</span>
              <span>{formatEur(lineUnitPrice(cart.restaurantId, line.menuItemId) * line.quantity)}</span>
              <div className="dr-line-actions">
                <div className="dr-qty">
                  <button type="button" disabled={busy} onClick={() => void onBumpQty(-1, line.menuItemId)}>
                    −
                  </button>
                  <span>{line.quantity}</span>
                  <button type="button" disabled={busy} onClick={() => void onBumpQty(1, line.menuItemId)}>
                    +
                  </button>
                </div>
                <button type="button" className="dr-btn dr-btn-ghost" disabled={busy} onClick={() => onRemoveLine(line.menuItemId)}>
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="dr-checkout">
        <div className="dr-field">
          <label htmlFor="pay-sim">Paiement (démo)</label>
          <select
            id="pay-sim"
            value={payment}
            disabled={busy}
            onChange={(e) => setPayment(e.target.value as 'success' | 'failure')}
          >
            <option value="success">Carte acceptée</option>
            <option value="failure">Carte refusée</option>
          </select>
        </div>
        <div className="dr-field">
          <label htmlFor="tip">Pourboire livreur (€)</label>
          <input id="tip" value={tipEuro} disabled={busy} onChange={(e) => setTipEuro(e.target.value)} inputMode="decimal" />
        </div>
        <button
          type="button"
          className="dr-btn dr-btn-primary"
          style={{ width: '100%', marginTop: '0.25rem' }}
          disabled={busy || cart.lines.length === 0 || !delivery}
          onClick={() => void onCheckout()}
        >
          Payer et commander
        </button>
      </div>

      {refusedTotals ? <PaymentRefusedPanel totals={refusedTotals} title="Paiement refusé" /> : null}

      {invoice ? <InvoiceDetailPanel invoice={invoice} /> : null}
    </aside>
  );
}
