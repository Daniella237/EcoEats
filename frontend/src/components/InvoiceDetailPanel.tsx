import { formatEur } from '../api';
import type { DetailsInvoice } from '../types';
import { cents } from '../lib/money';

export function InvoiceDetailPanel({ invoice }: { readonly invoice: DetailsInvoice }) {
  const tip = cents(invoice.tipCents);
  const sub = cents(invoice.subTotalCents);
  const del = cents(invoice.deliveryCents);
  const svc = cents(invoice.serviceCents);
  const totalFromServer = cents(invoice.totalCents);
  const totalTtc = totalFromServer > 0 ? totalFromServer : sub + del + svc + tip;

  return (
    <div className="dr-invoice dr-invoice-detail">
      <h3>Facture {invoice.invoiceNumber}</h3>
      <p className="invoice-meta">
        {invoice.restaurantName} — {new Date(invoice.issuedAtIso).toLocaleString('fr-FR')}
      </p>
      {invoice.orderId != null && String(invoice.orderId).trim() !== '' ? (
        <p className="invoice-order-ref">
          Commande (suivi) : <code className="dr-mono">{String(invoice.orderId).trim()}</code>
        </p>
      ) : null}
      <p className="invoice-section-title">Articles</p>
      <table className="invoice-table">
        <thead>
          <tr>
            <th>Article</th>
            <th className="invoice-col-qty">Qté</th>
            <th className="invoice-num">Prix unit.</th>
            <th className="invoice-num">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((l) => (
            <tr key={l.menuItemId}>
              <td>{l.name}</td>
              <td className="invoice-col-qty">{l.quantity}</td>
              <td className="invoice-num">{formatEur(cents(l.priceCents))}</td>
              <td className="invoice-num">{formatEur(cents(l.totalPriceCents))}</td>
            </tr>
          ))}
          {tip > 0 ? (
            <tr key="__courier_tip__">
              <td>Pourboire livreur (volontaire)</td>
              <td className="invoice-col-qty">—</td>
              <td className="invoice-num">—</td>
              <td className="invoice-num">{formatEur(tip)}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <p className="invoice-section-title">Totaux</p>
      <table className="invoice-table">
        <tbody>
          <tr>
            <td colSpan={3}>Sous-total plats</td>
            <td className="invoice-num">{formatEur(sub)}</td>
          </tr>
          <tr>
            <td colSpan={3}>Frais de livraison</td>
            <td className="invoice-num">{formatEur(del)}</td>
          </tr>
          <tr>
            <td colSpan={3}>Frais de service (plateforme)</td>
            <td className="invoice-num">{formatEur(svc)}</td>
          </tr>
          <tr>
            <td colSpan={3}>Pourboire livreur</td>
            <td className="invoice-num">{formatEur(tip)}</td>
          </tr>
          <tr className="invoice-grand">
            <td colSpan={3}>
              <strong>Total payé</strong>
            </td>
            <td className="invoice-num">
              <strong>{formatEur(totalTtc)}</strong>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="invoice-foot">{invoice.deliveryExplanation}</p>
      <p className="invoice-foot">{invoice.serviceExplanation}</p>
      {tip > 0 ? <p className="invoice-foot">{invoice.tipExplanation ?? 'Pourboire reversé intégralement au livreur.'}</p> : null}
    </div>
  );
}
