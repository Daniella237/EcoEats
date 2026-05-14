import { shortenAddress } from '../lib/addressText';
import type { DeliveryPlace } from '../clientTypes';

export type ClientHeaderProps = {
  readonly delivery: DeliveryPlace | null;
  readonly cartCount: number;
  readonly onOpenAddress: () => void;
};

export function ClientHeader({ delivery, cartCount, onOpenAddress }: ClientHeaderProps) {
  return (
    <header className="dr-header">
      <div className="dr-header-inner">
        <div className="dr-logo">EcoEats</div>
        {delivery ? (
          <button type="button" className="dr-addr-chip" onClick={onOpenAddress}>
            <span className="dr-pin" />
            {shortenAddress(delivery.displayName)}
          </button>
        ) : null}
        <div className="dr-header-spacer" />
        <div className="dr-cart-pill">
          {cartCount} article{cartCount > 1 ? 's' : ''}
        </div>
      </div>
    </header>
  );
}
