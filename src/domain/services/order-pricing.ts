export function subTotalPriceCents(
    lines: readonly { menuItemId: string; quantity: number }[],
    pricebyMenuItemId: ReadonlyMap<string, number>
): number {
    let total = 0;
    for (const line of lines) {
        const price = pricebyMenuItemId.get(line.menuItemId);
        if (price !== undefined) {
            total += price * line.quantity;
        }
    }
    return total;
}

/** calcul des frais de livraison forfaitaires + montant par km (arrondi en centimes) */
export function deliveryPriceCents(distanceKm: number) : number {
    const base = 199; // 1,99€ de frais de livraison de base
    const perKm = 99; // 0,99€ par km
    return Math.round(base + perKm * distanceKm);   
}

/** calcul des frais de service :  % du sous-total plats (min 100 cts). */
export function servicePriceCents(subTotalCents: number): number {
    const rate = 0.1; // 10%
    const min = 100; // 1,00€ minimum
    return Math.max(Math.round(subTotalCents * rate), min);
}

/** Total TTC côté client : plats + livraison + service plateforme + pourboire livreur. */
export function totalPriceCents(
  subTotalCents: number,
  deliveryCents: number,
  serviceCents: number,
  tipCents: number,
): number {
  return subTotalCents + deliveryCents + serviceCents + tipCents;
}