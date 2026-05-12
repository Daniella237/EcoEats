import { describe, expect, it } from 'vitest';
import { canCourierAcceptNewDelivery } from '../../src/domain/services/courier-assignment-policy.js';
import type { Courier } from '../../src/domain/entities/courier.js';

const courier = (partial: Partial<Courier> & Pick<Courier, 'id' | 'tier' | 'availability'>): Courier => ({
  walletCents: 0,
  activeDeliveries: [],
  ...partial,
});

describe('canCourierAcceptNewDelivery', () => {
  it('refuse si le livreur est indisponible', () => {
    const c = courier({
      id: '1',
      tier: 'standard',
      availability: 'unavailable',
    });
    expect(canCourierAcceptNewDelivery(c, 'r1').ok).toBe(false);
  });

  it('standard : une seule livraison', () => {
    const c = courier({
      id: '1',
      tier: 'standard',
      availability: 'available',
      activeDeliveries: [{ orderId: 'o1', restaurantId: 'r1' }],
    });
    expect(canCourierAcceptNewDelivery(c, 'r1').ok).toBe(false);
  });

  it('expert : deux livraisons seulement si même restaurant', () => {
    const c = courier({
      id: '1',
      tier: 'expert',
      availability: 'available',
      activeDeliveries: [{ orderId: 'o1', restaurantId: 'r1' }],
    });
    expect(canCourierAcceptNewDelivery(c, 'r1').ok).toBe(true);
    expect(canCourierAcceptNewDelivery(c, 'r2').ok).toBe(false);
  });

  it('expert : max deux', () => {
    const c = courier({
      id: '1',
      tier: 'expert',
      availability: 'available',
      activeDeliveries: [
        { orderId: 'o1', restaurantId: 'r1' },
        { orderId: 'o2', restaurantId: 'r1' },
      ],
    });
    expect(canCourierAcceptNewDelivery(c, 'r1').ok).toBe(false);
  });
});
