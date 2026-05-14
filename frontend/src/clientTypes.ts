export type DeliveryPlace = {
  readonly displayName: string;
  readonly latitude: number;
  readonly longitude: number;
};

export type ConflictState = {
  restaurantId: string;
  menuItemId: string;
  quantity: number;
  currentName: string;
  attemptedName: string;
};
