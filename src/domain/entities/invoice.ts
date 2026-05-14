/** Une ligne de facture (un plat × quantité). */
export interface InvoiceLineRow {
  readonly menuItemId: string;
  readonly name: string;
  readonly quantity: number;
  /** Prix unitaire en centimes. */
  readonly priceCents: number;
  /** Total ligne en centimes. */
  readonly totalPriceCents: number;
}

/** Totaux et détail des frais (hors en-tête facture). */
export interface TotalOrders {
  readonly subTotalCents: number;
  readonly deliveryCents: number;
  readonly serviceCents: number;
  /** Pourboire (centimes), payé par le client et reversé au livreur. */
  readonly tipCents: number;
  readonly totalCents: number;
  readonly distanceKm: number;
  readonly deliveryExplanation: string;
  readonly serviceExplanation: string;
  readonly tipExplanation: string;
}

/** Facture complète après paiement simulé réussi. */
export type DetailsInvoice = TotalOrders & {
  /** Identifiant de la commande cuisine / livraison (suivi client). */
  readonly orderId: string;
  readonly invoiceNumber: string;
  readonly issuedAtIso: string;
  readonly restaurantId: string;
  readonly restaurantName: string;
  readonly lines: readonly InvoiceLineRow[];
};
