/** Distance à vol d’oiseau (km), alignée sur le calcul backend (haversine). */
export function distanceKm(
  a: { readonly latitude: number; readonly longitude: number },
  b: { readonly latitude: number; readonly longitude: number },
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

/** Fenêtre de temps de livraison affichée (minutes), à partir de la distance. */
export function deliveryEtaRange(distanceKm: number): { min: number; max: number } {
  const base = 18 + Math.round(distanceKm * 2.2);
  const min = Math.max(15, base - 5);
  const max = min + 12 + Math.min(15, Math.round(distanceKm * 1.5));
  return { min, max };
}
