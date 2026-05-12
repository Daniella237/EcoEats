import { describe, expect, it } from 'vitest';
import { AddItemToCartUseCase } from '../../src/application/use-cases/add-item-to-cart.use-case.js';
import { BrowseAvailableMenusUseCase } from '../../src/application/use-cases/browse-available-menus.use-case.js';
import type { MenuCatalogPort } from '../../src/application/ports/menu-catalog.port.js';
import { emptyCart } from '../../src/domain/entities/cart.js';
import type { Restaurant } from '../../src/domain/entities/restaurant.js';

const dish = (id: string, name: string, price: number, stock: number) => ({
  id,
  name,
  description: 'desc',
  priceCents: price,
  allergens: [] as const,
  dailyStock: stock,
  remainingStock: stock,
});

const fakeCatalog: readonly Restaurant[] = [
  {
    id: 'r-a',
    name: 'A',
    ownerId: 'o-a',
    location: { latitude: 48.85, longitude: 2.35 },
    menu: [dish('m1', 'Plat 1', 100, 10)],
  },
  {
    id: 'r-b',
    name: 'B',
    ownerId: 'o-b',
    location: { latitude: 48.86, longitude: 2.34 },
    menu: [dish('m2', 'Plat 2', 200, 5)],
  },
];

class StubCatalog implements MenuCatalogPort {
  async listAvailableRestaurants(): Promise<readonly Restaurant[]> {
    return fakeCatalog;
  }
}

describe('BrowseAvailableMenusUseCase', () => {
  it('retourne les restaurants du catalogue', async () => {
    const uc = new BrowseAvailableMenusUseCase(new StubCatalog());
    const list = await uc.execute();
    expect(list).toHaveLength(2);
    expect(list[0]?.id).toBe('r-a');
  });
});

describe('AddItemToCartUseCase', () => {
  const uc = new AddItemToCartUseCase(new StubCatalog());

  it('rejette une quantité invalide', async () => {
    const r = await uc.execute(emptyCart(), 'r-a', 'm1', 0);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('invalid_quantity');
    }
  });

  it('rejette un restaurant inconnu', async () => {
    const r = await uc.execute(emptyCart(), 'unknown', 'm1', 1);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('restaurant_not_found');
    }
  });

  it('rejette un article absent du menu', async () => {
    const r = await uc.execute(emptyCart(), 'r-a', 'm2', 1);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('item_not_on_menu');
    }
  });

  it('rejette si stock insuffisant', async () => {
    const r = await uc.execute(emptyCart(), 'r-a', 'm1', 11);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('out_of_stock');
    }
  });

  it('signale un conflit inter-restaurants', async () => {
    let cart = emptyCart();
    const a = await uc.execute(cart, 'r-a', 'm1', 1);
    expect(a.ok).toBe(true);
    if (!a.ok) {
      return;
    }
    cart = a.cart;

    const b = await uc.execute(cart, 'r-b', 'm2', 1);
    expect(b.ok).toBe(false);
    if (!b.ok) {
      expect(b.reason).toBe('cross_restaurant_conflict');
    }
  });

  it('executeAfterReplace remplace le panier', async () => {
    let cart = emptyCart();
    const a = await uc.execute(cart, 'r-a', 'm1', 2);
    expect(a.ok).toBe(true);
    if (!a.ok) {
      return;
    }
    cart = a.cart;

    const replaced = await uc.executeAfterReplace('r-b', 'm2', 1);
    expect(replaced.ok).toBe(true);
    if (replaced.ok) {
      expect(replaced.cart.restaurantId).toBe('r-b');
      expect(replaced.cart.lines).toEqual([{ menuItemId: 'm2', quantity: 1 }]);
    }
  });
});
