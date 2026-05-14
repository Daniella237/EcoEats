import type { ConflictState } from '../clientTypes';

export type CrossRestaurantConflictModalProps = {
  readonly conflict: ConflictState | null;
  readonly busy: boolean;
  readonly onDismiss: () => void;
  readonly onConfirmReplace: () => void;
};

export function CrossRestaurantConflictModal({
  conflict,
  busy,
  onDismiss,
  onConfirmReplace,
}: CrossRestaurantConflictModalProps) {
  if (!conflict) {
    return null;
  }

  return (
    <div className="dr-overlay" role="presentation">
      <div className="dr-modal" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
        <h2 id="conflict-title">Vider le panier ?</h2>
        <p>
          Vous avez déjà des articles de <strong>{conflict.currentName}</strong>. Pour commander chez{' '}
          <strong>{conflict.attemptedName}</strong>, le panier actuel sera remplacé.
        </p>
        <div className="dr-modal-actions">
          <button type="button" className="dr-btn dr-btn-muted" disabled={busy} onClick={onDismiss}>
            Annuler
          </button>
          <button type="button" className="dr-btn dr-btn-primary" disabled={busy} onClick={onConfirmReplace}>
            Vider et continuer
          </button>
        </div>
      </div>
    </div>
  );
}
