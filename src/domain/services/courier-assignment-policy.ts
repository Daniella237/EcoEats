import type { Courier, CourierActiveDelivery } from '../entities/courier.js';

export type CourierAcceptanceResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason:
        | 'courier_unavailable'
        | 'standard_already_assigned'
        | 'expert_max_two'
        | 'expert_second_must_same_restaurant';
    };

/** Règle : 1 livraison active (standard) ; 2 max (expert) si et seulement si même restaurant. */
export function canCourierAcceptNewDelivery(
  courier: Courier,
  newOrderRestaurantId: string,
): CourierAcceptanceResult {
  if (courier.availability !== 'available') {
    return { ok: false, reason: 'courier_unavailable' };
  }

  const active: readonly CourierActiveDelivery[] = courier.activeDeliveries;

  if (courier.tier === 'standard') {
    if (active.length >= 1) {
      return { ok: false, reason: 'standard_already_assigned' };
    }
    return { ok: true };
  }

  if (active.length === 0) {
    return { ok: true };
  }
  if (active.length === 1) {
    const first = active[0];
    if (first && first.restaurantId === newOrderRestaurantId) {
      return { ok: true };
    }
    return { ok: false, reason: 'expert_second_must_same_restaurant' };
  }
  return { ok: false, reason: 'expert_max_two' };
}
