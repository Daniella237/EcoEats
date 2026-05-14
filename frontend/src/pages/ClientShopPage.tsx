import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addCartItem,
  checkout,
  fetchCatalog,
  geocodeAddress,
  replaceCartAndAddItem,
} from '../api';
import { emptyCart, removeLine, setLineQuantity } from '../cartLocal';
import type { ConflictState, DeliveryPlace } from '../clientTypes';
import { AddressModal } from '../components/AddressModal';
import { CartCheckoutAside } from '../components/CartCheckoutAside';
import { InvoicePromptModal } from '../components/InvoicePromptModal';
import { ClientHeader } from '../components/ClientHeader';
import { CrossRestaurantConflictModal } from '../components/CrossRestaurantConflictModal';
import { OrderTrackingPanel } from '../components/OrderTrackingPanel';
import { RestaurantBoard } from '../components/RestaurantBoard';
import { deliveryEtaRange, distanceKm } from '../geo';
import { geocodeErrorMessage } from '../lib/addressText';
import { parseEuroInputToCents } from '../lib/money';
import type { Cart, DetailsInvoice, MenuItem, Restaurant, TotalOrders } from '../types';

export function ClientShopPage() {
  const [catalog, setCatalog] = useState<readonly Restaurant[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cart, setCart] = useState<Cart>(emptyCart());
  const [delivery, setDelivery] = useState<DeliveryPlace | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(true);
  const [addressDraft, setAddressDraft] = useState('');
  const [addressErr, setAddressErr] = useState<string | null>(null);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [tipEuro, setTipEuro] = useState('0');
  const [payment, setPayment] = useState<'success' | 'failure'>('success');
  const [toast, setToast] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<DetailsInvoice | null>(null);
  const [refusedTotals, setRefusedTotals] = useState<TotalOrders | null>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [orderTrace, setOrderTrace] = useState<{ orderId: string; restaurantName: string } | null>(null);
  const [pendingInvoice, setPendingInvoice] = useState<DetailsInvoice | null>(null);
  const [invoicePromptOpen, setInvoicePromptOpen] = useState(false);

  const restaurantById = useMemo(() => {
    const m = new Map<string, Restaurant>();
    if (catalog) {
      for (const r of catalog) {
        m.set(r.id, r);
      }
    }
    return m;
  }, [catalog]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchCatalog();
        if (!cancelled) {
          setCatalog(data);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadErr(e instanceof Error ? e.message : 'Impossible de charger le catalogue.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (delivery && catalog && catalog.length > 0 && !selectedRestaurantId) {
      setSelectedRestaurantId(catalog[0].id);
    }
  }, [delivery, catalog, selectedRestaurantId]);

  useEffect(() => {
    if (addressModalOpen && delivery) {
      setAddressDraft(delivery.displayName);
    }
    if (addressModalOpen && !delivery) {
      setAddressDraft('');
    }
  }, [addressModalOpen, delivery]);

  const flash = useCallback((msg: string, durationMs = 4200) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), durationMs);
  }, []);

  const clearCheckoutReceipt = useCallback(() => {
    setInvoice(null);
    setRefusedTotals(null);
    setPendingInvoice(null);
    setInvoicePromptOpen(false);
  }, []);

  const etaForRestaurant = useCallback(
    (r: Restaurant): string => {
      if (!delivery) {
        return '';
      }
      const km = distanceKm(
        { latitude: delivery.latitude, longitude: delivery.longitude },
        r.location,
      );
      const { min, max } = deliveryEtaRange(km);
      return `${min}–${max} min`;
    },
    [delivery],
  );

  const itemLabel = useCallback(
    (restaurantId: string | null, menuItemId: string) => {
      if (!restaurantId) {
        return menuItemId;
      }
      const item = restaurantById.get(restaurantId)?.menu.find((m) => m.id === menuItemId);
      return item?.name ?? menuItemId;
    },
    [restaurantById],
  );

  const lineUnitPrice = useCallback(
    (restaurantId: string | null, menuItemId: string): number => {
      if (!restaurantId) {
        return 0;
      }
      return restaurantById.get(restaurantId)?.menu.find((m) => m.id === menuItemId)?.priceCents ?? 0;
    },
    [restaurantById],
  );

  const submitAddress = async () => {
    setAddressErr(null);
    setAddressSubmitting(true);
    try {
      const res = await geocodeAddress(addressDraft);
      if (!res.ok) {
        setAddressErr(geocodeErrorMessage(res.error));
        return;
      }
      setDelivery({
        displayName: res.displayName,
        latitude: res.latitude,
        longitude: res.longitude,
      });
      setAddressModalOpen(false);
      flash('Adresse enregistrée.');
    } catch (e) {
      setAddressErr(e instanceof Error ? e.message : 'Erreur inattendue.');
    } finally {
      setAddressSubmitting(false);
    }
  };

  const applyDemoParis = () => {
    const label = addressDraft.trim() || 'Paris (démo)';
    setDelivery({
      displayName: label,
      latitude: 48.8566,
      longitude: 2.3522,
    });
    setAddressErr(null);
    setAddressModalOpen(false);
    flash('Position démo appliquée (centre de Paris).');
  };

  const openAddressEditor = () => {
    setAddressErr(null);
    setAddressModalOpen(true);
  };

  const cancelAddressEdit = () => {
    if (delivery) {
      setAddressModalOpen(false);
      setAddressErr(null);
    }
  };

  const addOne = async (restaurantId: string, item: MenuItem) => {
    setBusy(true);
    try {
      const res = await addCartItem({
        cart,
        restaurantId,
        menuItemId: item.id,
        quantity: 1,
      });
      if (res.ok) {
        setCart(res.cart);
        clearCheckoutReceipt();
        flash(`${item.name} ajouté.`);
        return;
      }
      if (res.reason === 'cross_restaurant_conflict') {
        const cur = restaurantById.get(res.currentRestaurantId)?.name ?? res.currentRestaurantId;
        const next = restaurantById.get(res.attemptedRestaurantId)?.name ?? res.attemptedRestaurantId;
        setConflict({
          restaurantId,
          menuItemId: item.id,
          quantity: 1,
          currentName: cur,
          attemptedName: next,
        });
        return;
      }
      const labels: Record<string, string> = {
        out_of_stock: 'Ce plat n’est plus disponible.',
        item_not_on_menu: 'Plat introuvable.',
        invalid_quantity: 'Quantité invalide.',
        restaurant_not_found: 'Restaurant introuvable.',
      };
      flash(labels[res.reason] ?? 'Impossible d’ajouter au panier.');
    } finally {
      setBusy(false);
    }
  };

  const confirmReplace = async () => {
    if (!conflict) {
      return;
    }
    setBusy(true);
    try {
      const res = await replaceCartAndAddItem({
        restaurantId: conflict.restaurantId,
        menuItemId: conflict.menuItemId,
        quantity: conflict.quantity,
      });
      setConflict(null);
      if (res.ok) {
        setCart(res.cart);
        clearCheckoutReceipt();
        setSelectedRestaurantId(conflict.restaurantId);
        flash('Panier mis à jour pour ce restaurant.');
      } else {
        const labels: Record<string, string> = {
          out_of_stock: 'Ce plat n’est plus disponible.',
          item_not_on_menu: 'Plat introuvable.',
          invalid_quantity: 'Quantité invalide.',
          restaurant_not_found: 'Restaurant introuvable.',
        };
        flash(labels[res.reason] ?? 'Action impossible.');
      }
    } finally {
      setBusy(false);
    }
  };

  const bumpQty = async (delta: number, lineMenuItemId: string) => {
    if (!cart.restaurantId) {
      return;
    }
    if (delta > 0) {
      setBusy(true);
      try {
        const res = await addCartItem({
          cart,
          restaurantId: cart.restaurantId,
          menuItemId: lineMenuItemId,
          quantity: delta,
        });
        if (res.ok) {
          setCart(res.cart);
          clearCheckoutReceipt();
        } else if (res.reason === 'out_of_stock') {
          flash('Quantité max atteinte pour ce plat.');
        } else {
          flash('Impossible de mettre à jour la quantité.');
        }
      } finally {
        setBusy(false);
      }
      return;
    }
    const line = cart.lines.find((l) => l.menuItemId === lineMenuItemId);
    if (!line) {
      return;
    }
    const nextQty = line.quantity + delta;
    setCart(setLineQuantity(cart, lineMenuItemId, nextQty));
    clearCheckoutReceipt();
  };

  const onRemoveLine = (menuItemId: string) => {
    setCart(removeLine(cart, menuItemId));
    clearCheckoutReceipt();
  };

  const onCheckout = async () => {
    if (!delivery) {
      flash('Enregistrez d’abord votre adresse de livraison.');
      return;
    }
    const tipCents = parseEuroInputToCents(tipEuro);
    if (tipCents === null) {
      flash('Pourboire invalide.');
      return;
    }
    setBusy(true);
    setInvoice(null);
    setRefusedTotals(null);
    try {
      const result = await checkout({
        cart,
        customerLocation: {
          latitude: delivery.latitude,
          longitude: delivery.longitude,
        },
        simulatePayment: payment,
        tipCents,
      });
      if (result.ok) {
        setOrderTrace(null);
        setPendingInvoice(result.invoice);
        setInvoicePromptOpen(true);
        setCart(emptyCart());
        flash('Votre commande a été payée avec succès.', 6500);
        try {
          setCatalog(await fetchCatalog());
        } catch {
          /* ignore */
        }
      } else if (result.reason === 'payment_refused') {
        setRefusedTotals(result.totals);
        flash('Paiement refusé (simulation).');
      } else if (result.reason === 'insufficient_stock') {
        flash('Un article n’est plus disponible.');
        try {
          setCatalog(await fetchCatalog());
        } catch {
          /* ignore */
        }
      } else {
        flash('Commande impossible.');
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Erreur réseau.');
    } finally {
      setBusy(false);
    }
  };

  const cartCount = cart.lines.reduce((n, l) => n + l.quantity, 0);

  const applyOrderTraceFromInvoice = useCallback((inv: DetailsInvoice) => {
    const oid = inv.orderId;
    if (typeof oid === 'string' && oid.trim().length > 0) {
      setOrderTrace({ orderId: oid.trim(), restaurantName: inv.restaurantName });
    } else {
      setOrderTrace(null);
    }
  }, []);

  return (
    <>
      <AddressModal
        open={addressModalOpen}
        delivery={delivery}
        addressDraft={addressDraft}
        setAddressDraft={setAddressDraft}
        addressErr={addressErr}
        addressSubmitting={addressSubmitting}
        onSubmit={() => void submitAddress()}
        onCancelEdit={cancelAddressEdit}
        onDemoParis={applyDemoParis}
      />

      <ClientHeader delivery={delivery} cartCount={cartCount} onOpenAddress={openAddressEditor} />

      {loadErr ? <div className="dr-error-banner">{loadErr}</div> : null}

      <section className="dr-hero">
        <div className="dr-hero-inner">
          <h1>Vos restaurants préférés, livrés éthiquement</h1>
          <p>Choisissez un établissement, composez votre panier puis validez — un seul restaurant à la fois.</p>
        </div>
      </section>

      <div className="dr-shell">
        <div className="dr-main">
          {!delivery ? (
            <p className="dr-empty dr-empty-pad">Indiquez votre adresse pour afficher les restaurants et les menus.</p>
          ) : null}

          {delivery && catalog ? (
            <RestaurantBoard
              catalog={catalog}
              selectedRestaurantId={selectedRestaurantId}
              onSelectRestaurant={setSelectedRestaurantId}
              etaForRestaurant={etaForRestaurant}
              busy={busy}
              onAddItem={addOne}
            />
          ) : null}

          {!catalog && !loadErr ? <p className="dr-empty">Chargement du catalogue…</p> : null}
        </div>

        <CartCheckoutAside
          cart={cart}
          busy={busy}
          delivery={delivery}
          tipEuro={tipEuro}
          setTipEuro={setTipEuro}
          payment={payment}
          setPayment={setPayment}
          onCheckout={onCheckout}
          itemLabel={itemLabel}
          lineUnitPrice={lineUnitPrice}
          onBumpQty={bumpQty}
          onRemoveLine={onRemoveLine}
          refusedTotals={refusedTotals}
          invoice={invoice}
        />

        {orderTrace ? (
          <div className="dr-shell-tracking">
            <OrderTrackingPanel
              orderId={orderTrace.orderId}
              restaurantName={orderTrace.restaurantName}
              onDismiss={() => setOrderTrace(null)}
            />
          </div>
        ) : null}
      </div>

      <CrossRestaurantConflictModal
        conflict={conflict}
        busy={busy}
        onDismiss={() => setConflict(null)}
        onConfirmReplace={() => void confirmReplace()}
      />

      <InvoicePromptModal
        open={invoicePromptOpen}
        onViewInvoice={() => {
          const inv = pendingInvoice;
          if (!inv) {
            setInvoicePromptOpen(false);
            return;
          }
          setInvoice(inv);
          applyOrderTraceFromInvoice(inv);
          setPendingInvoice(null);
          setInvoicePromptOpen(false);
        }}
        onSkip={() => {
          const inv = pendingInvoice;
          if (inv) {
            applyOrderTraceFromInvoice(inv);
          }
          setPendingInvoice(null);
          setInvoicePromptOpen(false);
        }}
      />

      {toast ? <div className="dr-toast">{toast}</div> : null}
    </>
  );
}
