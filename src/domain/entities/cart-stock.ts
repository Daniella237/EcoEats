import type { Cart } from './cart.js';

/** Quantité totale d’un article dans le panier après ajout éventuel. */
export function totalQuantityForMenuItemInCart(
  cart: Cart,
  menuItemId: string,
  additionalQuantity: number,
): number {
  const current = cart.lines.find((l) => l.menuItemId === menuItemId)?.quantity ?? 0;
  return current + additionalQuantity;
}
