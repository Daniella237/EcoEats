import { describe, expect, it } from 'vitest';
import { PlaceOrderUseCase } from '../../src/application/use-cases/place-order.use-case.js';
import { addItemToCart, emptyCart } from '../../src/domain/entities/cart.js';
import { InMemoryEcoRepository } from '../../src/infrastructure/persistence/in-memory-eco.repository.js';

describe('PlaceOrderUseCase', () => {
  const customer = { latitude: 48.8584, longitude: 2.2945 };

  it('refuse un panier vide', async () => {
    const store = new InMemoryEcoRepository();
    const uc = new PlaceOrderUseCase(store, store);
    const r = await uc.execute({
      cart: emptyCart(),
      customerLocation: customer,
      simulatePayment: 'success',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('empty_cart');
    }
  });

  it('génère une facture si le paiement simulé réussit', async () => {
    const store = new InMemoryEcoRepository();
    const uc = new PlaceOrderUseCase(store, store);
    let cart = emptyCart();
    const step = addItemToCart(cart, 'rest-green', 'gb-1', 2);
    expect(step.kind).toBe('success');
    if (step.kind !== 'success') {
      return;
    }
    cart = step.cart;

    const r = await uc.execute({
      cart,
      customerLocation: customer,
      simulatePayment: 'success',
      tipCents: 100,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.invoice.lines.length).toBe(1);
      expect(r.invoice.orderId).toMatch(/^[0-9a-f-]{36}$/i);
      expect(r.invoice.subTotalCents).toBe(2400);
      expect(r.invoice.tipCents).toBe(100);
      expect(r.invoice.totalCents).toBe(
        r.invoice.subTotalCents + r.invoice.deliveryCents + r.invoice.serviceCents + r.invoice.tipCents,
      );
      const persisted = await store.findOrderById(r.invoice.orderId);
      expect(persisted).not.toBeNull();
      expect(persisted?.id).toBe(r.invoice.orderId);
    }
  });

  it('paiement refusé : pas de facture mais totaux', async () => {
    const store = new InMemoryEcoRepository();
    const uc = new PlaceOrderUseCase(store, store);
    let cart = emptyCart();
    const step = addItemToCart(cart, 'rest-green', 'gb-1', 1);
    if (step.kind !== 'success') {
      return;
    }
    cart = step.cart;
    const r = await uc.execute({
      cart,
      customerLocation: customer,
      simulatePayment: 'failure',
    });
    expect(r.ok).toBe(false);
    if (!r.ok && r.reason === 'payment_refused') {
      expect(r.totals.totalCents).toBeGreaterThan(0);
    }
  });
});
