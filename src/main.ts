import { createMemoryEcoRoot } from './composition/memory-root.js';
import { emptyCart } from './domain/entities/cart.js';

async function main(): Promise<void> {
  const root = createMemoryEcoRoot();
  const browse = root.browseMenus;
  const addToCart = root.addToCart;

  const restaurants = await browse.execute();
  console.log('Restaurants disponibles et menus :');
  for (const r of restaurants) {
    console.log(`\n— ${r.name} (${r.id})`);
    for (const item of r.menu) {
      console.log(
        `   • ${item.name} [${item.id}] — ${(item.priceCents / 100).toFixed(2)} € (stock ${item.remainingStock})`,
      );
    }
  }

  let cart = emptyCart();
  const first = await addToCart.execute(cart, 'rest-green', 'gb-1', 2);
  if (!first.ok) {
    console.error(first);
    return;
  }
  cart = first.cart;
  console.log('\nPanier après ajout Green Bowl :', cart);

  const conflict = await addToCart.execute(cart, 'rest-pizza', 'np-1', 1);
  if (!conflict.ok && conflict.reason === 'cross_restaurant_conflict') {
    console.log(
      '\nConflit : le panier est pour un autre restaurant. Proposition : vider le panier et ajouter la pizza, ou annuler.',
    );
    console.log('Restaurant actuel :', conflict.currentRestaurantId);
    console.log('Restaurant demandé :', conflict.attemptedRestaurantId);

    const userChoosesReplace = true;
    if (userChoosesReplace) {
      const replaced = await addToCart.executeAfterReplace('rest-pizza', 'np-1', 1);
      if (replaced.ok) {
        cart = replaced.cart;
        console.log('\nPanier remplacé (choix utilisateur) :', cart);
      }
    } else {
      console.log('\nAction annulée, panier inchangé :', conflict.cart);
    }
  }

  const clientLocation = { latitude: 48.8584, longitude: 2.2945 };
  const orderResult = await root.placeOrder.execute({
    cart,
    customerLocation: clientLocation,
    simulatePayment: 'success',
    tipCents: 150,
  });
  if (orderResult.ok) {
    console.log('\nFacture détaillée (paiement simulé OK) :');
    console.log(JSON.stringify(orderResult.invoice, null, 2));
  } else if (orderResult.reason === 'payment_refused') {
    console.log('\nPaiement refusé — totaux calculés :', orderResult.totals);
  } else {
    console.log('\nCommande impossible :', orderResult);
  }

  const lastOrders =
    cart.restaurantId === 'rest-green'
      ? await root.listRestaurantOrders.execute('owner-green', 'rest-green')
      : cart.restaurantId === 'rest-pizza'
        ? await root.listRestaurantOrders.execute('owner-pizza', 'rest-pizza')
        : { ok: false as const, reason: 'forbidden_or_unknown_restaurant' as const };
  if (lastOrders.ok && lastOrders.orders[0] && cart.restaurantId) {
    const oid = lastOrders.orders[0].id;
    const ownerId = cart.restaurantId === 'rest-green' ? 'owner-green' : 'owner-pizza';
    const acc = await root.acceptRestaurantOrder.execute(ownerId, cart.restaurantId, oid, 20);
    console.log('\nRestaurateur accepte la commande :', acc);
    const ready = await root.markOrderReady.execute(ownerId, cart.restaurantId, oid);
    console.log('Commande prête :', ready);
    const proposals = await root.listDeliveryProposals.execute();
    console.log('Propositions livreur :', proposals.length);
  }
}

main().catch(console.error);
