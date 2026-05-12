export type CourierAvailability = 'available' | 'unavailable';

export type CourierTier = 'standard' | 'expert';

export interface CourierActiveDelivery {
  readonly orderId: string;
  readonly restaurantId: string;
}

export interface Courier {
  readonly id: string;
  readonly tier: CourierTier;
  readonly availability: CourierAvailability;
  readonly walletCents: number;
  readonly activeDeliveries: readonly CourierActiveDelivery[];
}
