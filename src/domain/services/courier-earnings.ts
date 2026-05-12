/** Formule fixe : prise en charge + prix au km + pourboire intégral (aucune commission plateforme). */
export function courierDeliveryPayoutCents(input: {
  readonly baseCents: number;
  readonly perKmCents: number;
  readonly distanceKm: number;
  readonly tipCents: number;
}): number {
  const distancePart = Math.round(input.perKmCents * input.distanceKm);
  return input.baseCents + distancePart + input.tipCents;
}

export const DEFAULT_COURIER_BASE_CENTS = 250;
export const DEFAULT_COURIER_PER_KM_CENTS = 85;
