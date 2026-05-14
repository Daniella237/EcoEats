export type InvoicePromptModalProps = {
  readonly open: boolean;
  readonly onViewInvoice: () => void;
  readonly onSkip: () => void;
};

export function InvoicePromptModal({ open, onViewInvoice, onSkip }: InvoicePromptModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="dr-overlay dr-overlay-front" role="presentation">
      <div className="dr-modal" role="dialog" aria-modal="true" aria-labelledby="inv-prompt-title">
        <h2 id="inv-prompt-title">Consulter la facture ?</h2>
        <p>Vous pouvez afficher le détail (articles, totaux, numéro de commande pour le suivi) ou continuer sans l’afficher.</p>
        <div className="dr-modal-actions">
          <button type="button" className="dr-btn dr-btn-muted" onClick={onSkip}>
            Plus tard
          </button>
          <button type="button" className="dr-btn dr-btn-primary" onClick={onViewInvoice}>
            Voir la facture
          </button>
        </div>
      </div>
    </div>
  );
}
