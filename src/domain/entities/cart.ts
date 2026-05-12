export interface CartLine {
  readonly menuItemId: string;
  readonly quantity: number;
}

export interface Cart {
  readonly restaurantId: string | null;
  readonly lines: readonly CartLine[];
}

export type AddItemToCartOutcome =
  | { readonly kind: 'success'; readonly cart: Cart }
  | {
      readonly kind: 'cross_restaurant_conflict';
      readonly cart: Cart;
      readonly currentRestaurantId: string;
      readonly attemptedRestaurantId: string;
    };

export function emptyCart(): Cart {
  return { restaurantId: null, lines: [] };
}

export function addItemToCart(
  cart: Cart,
  restaurantId: string,
  menuItemId: string,
  quantity: number,
): AddItemToCartOutcome {
  if (quantity <= 0) {
    throw new RangeError('La quantité doit être strictement positive.');
  }

  if (cart.restaurantId !== null && cart.restaurantId !== restaurantId) {
    return {
      kind: 'cross_restaurant_conflict',
      cart,
      currentRestaurantId: cart.restaurantId,
      attemptedRestaurantId: restaurantId,
    };
  }

  const nextRestaurantId = restaurantId;
  const existingIndex = cart.lines.findIndex((l) => l.menuItemId === menuItemId);
  let nextLines: CartLine[];

  if (existingIndex === -1) {
    nextLines = [...cart.lines, { menuItemId, quantity }];
  } else {
    nextLines = cart.lines.map((line, i) =>
      i === existingIndex
        ? { menuItemId: line.menuItemId, quantity: line.quantity + quantity }
        : line,
    );
  }

  return {
    kind: 'success',
    cart: { restaurantId: nextRestaurantId, lines: nextLines },
  };
}

/** Vide le panier puis ajoute une ligne (choix utilisateur après conflit). */
export function replaceCartAndAddItem(
  restaurantId: string,
  menuItemId: string,
  quantity: number,
): Cart {
  const outcome = addItemToCart(emptyCart(), restaurantId, menuItemId, quantity);
  if (outcome.kind !== 'success') {
    throw new Error('replaceCartAndAddItem: état inattendu');
  }
  return outcome.cart;
}
