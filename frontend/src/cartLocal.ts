import type { Cart } from './types';

export function emptyCart(): Cart {
  return { restaurantId: null, lines: [] };
}

export function removeLine(cart: Cart, menuItemId: string): Cart {
  const lines = cart.lines.filter((l) => l.menuItemId !== menuItemId);
  return {
    restaurantId: lines.length === 0 ? null : cart.restaurantId,
    lines,
  };
}

export function setLineQuantity(cart: Cart, menuItemId: string, quantity: number): Cart {
  if (quantity <= 0) {
    return removeLine(cart, menuItemId);
  }
  const lines = cart.lines.map((l) =>
    l.menuItemId === menuItemId ? { menuItemId: l.menuItemId, quantity } : l,
  );
  return { ...cart, lines };
}
