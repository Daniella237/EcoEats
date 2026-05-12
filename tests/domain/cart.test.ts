import { describe, expect, it } from 'vitest';
import {
  addItemToCart,
  emptyCart,
  replaceCartAndAddItem,
} from '../../src/domain/entities/cart.js';

describe('Panier - règle un seul restaurant', () => {
  it('ajoute au panier vide', () => {
    const cart = emptyCart();
    const r = addItemToCart(cart, 'r1', 'i1', 1);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.cart.restaurantId).toBe('r1');
      expect(r.cart.lines).toEqual([{ menuItemId: 'i1', quantity: 1 }]);
    }
  });

  it('fusionne la quantité pour le même article', () => {
    let cart = emptyCart();
    const step1 = addItemToCart(cart, 'r1', 'i1', 1);
    expect(step1.kind).toBe('success');
    if (step1.kind !== 'success') {
      return;
    }
    cart = step1.cart;

    const r = addItemToCart(cart, 'r1', 'i1', 2);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.cart.lines).toEqual([{ menuItemId: 'i1', quantity: 3 }]);
    }
  });

  it('refuse un autre restaurant sans modifier le panier', () => {
    let cart = emptyCart();
    const step1 = addItemToCart(cart, 'r1', 'i1', 1);
    expect(step1.kind).toBe('success');
    if (step1.kind !== 'success') {
      return;
    }
    cart = step1.cart;

    const step2 = addItemToCart(cart, 'r2', 'i2', 1);
    expect(step2.kind).toBe('cross_restaurant_conflict');
    if (step2.kind === 'cross_restaurant_conflict') {
      expect(step2.cart).toEqual(cart);
      expect(step2.currentRestaurantId).toBe('r1');
      expect(step2.attemptedRestaurantId).toBe('r2');
    }
  });

  it('replaceCartAndAddItem vide puis ajoute', () => {
    let cart = emptyCart();
    const s = addItemToCart(cart, 'r1', 'i1', 1);
    expect(s.kind).toBe('success');
    cart = s.kind === 'success' ? s.cart : cart;

    const next = replaceCartAndAddItem('r2', 'i2', 3);
    expect(next.restaurantId).toBe('r2');
    expect(next.lines).toEqual([{ menuItemId: 'i2', quantity: 3 }]);
  });
});
