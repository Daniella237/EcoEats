import type { Courier } from '../../domain/entities/courier.js';
import type { Restaurant } from '../../domain/entities/restaurant.js';

export function createSeedRestaurants(): Restaurant[] {
  return [
    {
      id: 'rest-green',
      name: 'Green Bowl',
      ownerId: 'owner-green',
      location: { latitude: 48.8566, longitude: 2.3522 },
      menu: [
        {
          id: 'gb-1',
          name: 'Buddha bowl',
          description: 'Quinoa, légumes de saison, sauce tahini.',
          priceCents: 1200,
          allergens: ['sésame', 'soja'],
          dailyStock: 40,
          remainingStock: 40,
        },
        {
          id: 'gb-2',
          name: 'Soupe miso',
          description: 'Bouillon dashi, tofu, algues.',
          priceCents: 450,
          allergens: ['soja'],
          dailyStock: 60,
          remainingStock: 60,
        },
      ],
    },
    {
      id: 'rest-pizza',
      name: 'Napoli Express',
      ownerId: 'owner-pizza',
      location: { latitude: 48.8606, longitude: 2.3376 },
      menu: [
        {
          id: 'np-1',
          name: 'Margherita',
          description: 'Tomate, mozzarella, basilic.',
          priceCents: 900,
          allergens: ['gluten', 'lait'],
          dailyStock: 30,
          remainingStock: 30,
        },
        {
          id: 'np-2',
          name: 'Végétarienne',
          description: 'Légumes grillés, mozzarella.',
          priceCents: 1050,
          allergens: ['gluten', 'lait'],
          dailyStock: 20,
          remainingStock: 20,
        },
      ],
    },
  ];
}

export function createSeedCouriers(): Courier[] {
  return [
    {
      id: 'cour-standard',
      tier: 'standard',
      availability: 'available',
      walletCents: 0,
      activeDeliveries: [],
    },
    {
      id: 'cour-expert',
      tier: 'expert',
      availability: 'available',
      walletCents: 0,
      activeDeliveries: [],
    },
  ];
}
