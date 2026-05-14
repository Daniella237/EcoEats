import { formatEur } from '../api';
import type { TotalOrders } from '../types';
import { cents } from '../lib/money';

export function PaymentRefusedPanel({ totals, title }: { readonly totals: TotalOrders; readonly title: string }) {
  const tip = cents(totals.tipCents);
  const sub = cents(totals.subTotalCents);
  const del = cents(totals.deliveryCents);
  const svc = cents(totals.serviceCents);
  const totalFromServer = cents(totals.totalCents);
  const totalTtc = totalFromServer > 0 ? totalFromServer : sub + del + svc + tip;

  return (
    <div className="dr-invoice">
      <h3>{title}</h3>
      <table className="invoice-table">
        <tbody>
          <tr>
            <td>Sous-total plats</td>
            <td className="invoice-num">{formatEur(sub)}</td>
          </tr>
          <tr>
            <td>Frais de livraison</td>
            <td className="invoice-num">{formatEur(del)}</td>
          </tr>
          <tr>
            <td>Frais de service (plateforme)</td>
            <td className="invoice-num">{formatEur(svc)}</td>
          </tr>
          <tr>
            <td>Pourboire livreur</td>
            <td className="invoice-num">{formatEur(tip)}</td>
          </tr>
          <tr className="invoice-grand">
            <td>
              <strong>Total</strong>
            </td>
            <td className="invoice-num">
              <strong>{formatEur(totalTtc)}</strong>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="invoice-foot">{totals.deliveryExplanation}</p>
      <p className="invoice-foot">{totals.serviceExplanation}</p>
      {tip > 0 ? (
        <p className="invoice-foot">{totals.tipExplanation ?? 'Pourboire reversé intégralement au livreur.'}</p>
      ) : null}
    </div>
  );
}
