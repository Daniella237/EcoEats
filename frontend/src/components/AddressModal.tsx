import type { DeliveryPlace } from '../clientTypes';

export type AddressModalProps = {
  readonly open: boolean;
  readonly delivery: DeliveryPlace | null;
  readonly addressDraft: string;
  readonly setAddressDraft: (v: string) => void;
  readonly addressErr: string | null;
  readonly addressSubmitting: boolean;
  readonly onSubmit: () => void;
  readonly onCancelEdit: () => void;
  readonly onDemoParis: () => void;
};

export function AddressModal({
  open,
  delivery,
  addressDraft,
  setAddressDraft,
  addressErr,
  addressSubmitting,
  onSubmit,
  onCancelEdit,
  onDemoParis,
}: AddressModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="dr-overlay" role="presentation">
      <div className="dr-modal" role="dialog" aria-modal="true" aria-labelledby="addr-title">
        <h2 id="addr-title">{delivery ? 'Modifier l’adresse' : 'Où souhaitez-vous être livré ?'}</h2>
        <p>
          {delivery
            ? 'Nous recalculons les temps et frais à partir de cette adresse.'
            : 'Saisissez une adresse complète (rue, ville).'}
        </p>
        {addressErr ? <p className="dr-modal-error">{addressErr}</p> : null}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="dr-field">
            <label htmlFor="addr-line">Adresse</label>
            <input
              id="addr-line"
              value={addressDraft}
              disabled={addressSubmitting}
              onChange={(e) => setAddressDraft(e.target.value)}
              placeholder="Ex. 10 rue de la Paix, 75002 Paris"
              autoComplete="street-address"
            />
          </div>
          <div className="dr-modal-actions">
            {delivery ? (
              <button type="button" className="dr-btn dr-btn-muted" disabled={addressSubmitting} onClick={onCancelEdit}>
                Annuler
              </button>
            ) : null}
            <button type="submit" className="dr-btn dr-btn-primary" disabled={addressSubmitting}>
              {addressSubmitting ? 'Recherche…' : 'Enregistrer'}
            </button>
          </div>
        </form>
        <p className="dr-modal-hint">
          Si la recherche ne répond pas (API arrêtée, proxy, pare-feu), vous pouvez{' '}
          <button type="button" className="dr-link-btn" onClick={onDemoParis}>
            continuer en démo avec le centre de Paris
          </button>
          .
        </p>
      </div>
    </div>
  );
}
