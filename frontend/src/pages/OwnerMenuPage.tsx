import { useCallback, useEffect, useState } from 'react';
import {
  deleteOwnerMenuItem,
  fetchCatalog,
  formatEur,
  patchOwnerMenuItem,
  postOwnerMenuItem,
  putOwnerMenuItemDailyStock,
  type MenuOwnerMutationResult,
} from '../api';
import { useAppRouter } from '../lib/app-routing';
import { parseEuroInputToCents } from '../lib/money';
import type { MenuItem, Restaurant } from '../types';

const MENU_REASON_FR: Record<string, string> = {
  forbidden_or_unknown_restaurant: 'Restaurant inconnu ou vous n’êtes pas le propriétaire.',
  unknown_menu_item: 'Plat introuvable.',
};

function parseAllergensCsv(raw: string): readonly string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function mergeRestaurant(catalog: readonly Restaurant[], updated: Restaurant): readonly Restaurant[] {
  return catalog.map((r) => (r.id === updated.id ? updated : r));
}

export function OwnerMenuPage() {
  const { navigate } = useAppRouter();
  const [catalog, setCatalog] = useState<readonly Restaurant[] | null>(null);
  const [restaurantId, setRestaurantId] = useState<string>('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriceEuro, setNewPriceEuro] = useState('');
  const [newAllergens, setNewAllergens] = useState('');
  const [newDaily, setNewDaily] = useState('10');

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriceEuro, setEditPriceEuro] = useState('');
  const [editAllergens, setEditAllergens] = useState('');
  const [stockDailyById, setStockDailyById] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      try {
        const c = await fetchCatalog();
        setCatalog(c);
        setRestaurantId((prev) => prev || c[0]?.id || '');
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'Catalogue inaccessible');
      }
    })();
  }, []);

  const ownerId = catalog?.find((r) => r.id === restaurantId)?.ownerId ?? '';
  const selected = catalog?.find((r) => r.id === restaurantId);

  const applyMutation = useCallback(
    (res: MenuOwnerMutationResult, okMsg: string) => {
      if (res.ok) {
        setCatalog((prev) => (prev ? mergeRestaurant(prev, res.restaurant) : prev));
        setMsg(okMsg);
        setEditId(null);
      } else {
        setMsg(`Action impossible : ${MENU_REASON_FR[res.reason] ?? res.reason}`);
      }
    },
    [],
  );

  const startEdit = (item: MenuItem) => {
    setEditId(item.id);
    setEditName(item.name);
    setEditDesc(item.description);
    setEditPriceEuro((item.priceCents / 100).toFixed(2).replace('.', ','));
    setEditAllergens(item.allergens.join(', '));
  };

  const onAddItem = async () => {
    if (!ownerId || !restaurantId) {
      return;
    }
    const priceCents = parseEuroInputToCents(newPriceEuro);
    if (priceCents === null) {
      setMsg('Prix invalide.');
      return;
    }
    const daily = Number.parseInt(newDaily, 10);
    if (!Number.isFinite(daily) || daily < 0) {
      setMsg('Stock journalier : entier positif ou zéro.');
      return;
    }
    if (!newName.trim()) {
      setMsg('Indiquez un nom de plat.');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await postOwnerMenuItem(ownerId, restaurantId, {
        name: newName.trim(),
        description: newDesc.trim(),
        priceCents,
        allergens: [...parseAllergensCsv(newAllergens)],
        dailyStock: daily,
        remainingStock: daily,
      });
      applyMutation(res, 'Plat ajouté au menu.');
      if (res.ok) {
        setNewName('');
        setNewDesc('');
        setNewPriceEuro('');
        setNewAllergens('');
        setNewDaily('10');
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const onSaveEdit = async (menuItemId: string) => {
    if (!ownerId || !restaurantId) {
      return;
    }
    const priceCents = parseEuroInputToCents(editPriceEuro);
    if (priceCents === null) {
      setMsg('Prix invalide.');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await patchOwnerMenuItem(ownerId, restaurantId, menuItemId, {
        name: editName.trim(),
        description: editDesc.trim(),
        priceCents,
        allergens: [...parseAllergensCsv(editAllergens)],
      });
      applyMutation(res, 'Plat mis à jour.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (menuItemId: string) => {
    if (!ownerId || !restaurantId || !window.confirm('Retirer ce plat du menu ?')) {
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await deleteOwnerMenuItem(ownerId, restaurantId, menuItemId);
      applyMutation(res, 'Plat supprimé.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const onSetDailyStock = async (menuItemId: string) => {
    if (!ownerId || !restaurantId) {
      return;
    }
    const raw = stockDailyById[menuItemId] ?? '';
    const daily = Number.parseInt(raw, 10);
    if (!Number.isFinite(daily) || daily < 0) {
      setMsg('Stock journalier : entier positif ou zéro.');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await putOwnerMenuItemDailyStock(ownerId, restaurantId, menuItemId, daily);
      applyMutation(res, 'Stock journalier mis à jour (stock restant = stock du jour).');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dr-ops-page">
      <header className="dr-ops-header">
        <h1>Gestion du menu</h1>
        <p className="dr-ops-hint">
          Ajout, modification, suppression de plats et stock journalier.{' '}
          <button type="button" className="dr-inline-link" onClick={() => navigate('/cuisine')}>
            Espace cuisine
          </button>{' '}
          ·{' '}
          <button type="button" className="dr-inline-link" onClick={() => navigate('/')}>
            Boutique client
          </button>
        </p>
      </header>

      <div className="dr-ops-field">
        <label htmlFor="menu-rest">Restaurant</label>
        <select
          id="menu-rest"
          value={restaurantId}
          onChange={(e) => {
            setRestaurantId(e.target.value);
            setEditId(null);
            setMsg(null);
          }}
        >
          {(catalog ?? []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.id})
            </option>
          ))}
        </select>
      </div>

      {msg ? <p className="dr-ops-banner">{msg}</p> : null}

      <h2 className="dr-ops-sub">Ajouter un plat</h2>
      <div className="dr-menu-admin-form">
        <div className="dr-field">
          <label htmlFor="mn-name">Nom</label>
          <input id="mn-name" value={newName} disabled={busy} onChange={(e) => setNewName(e.target.value)} />
        </div>
        <div className="dr-field">
          <label htmlFor="mn-desc">Description</label>
          <input id="mn-desc" value={newDesc} disabled={busy} onChange={(e) => setNewDesc(e.target.value)} />
        </div>
        <div className="dr-field">
          <label htmlFor="mn-price">Prix (€)</label>
          <input id="mn-price" value={newPriceEuro} disabled={busy} onChange={(e) => setNewPriceEuro(e.target.value)} inputMode="decimal" />
        </div>
        <div className="dr-field">
          <label htmlFor="mn-all">Allergènes (virgule)</label>
          <input id="mn-all" value={newAllergens} disabled={busy} onChange={(e) => setNewAllergens(e.target.value)} />
        </div>
        <div className="dr-field">
          <label htmlFor="mn-daily">Stock journalier</label>
          <input id="mn-daily" type="number" min={0} step={1} value={newDaily} disabled={busy} onChange={(e) => setNewDaily(e.target.value)} />
        </div>
        <button type="button" className="dr-btn dr-btn-primary" disabled={busy || !ownerId} onClick={() => void onAddItem()}>
          Ajouter au menu
        </button>
      </div>

      <h2 className="dr-ops-sub">Plats · {selected?.name ?? '…'}</h2>
      {!selected ? (
        <p className="dr-empty">Chargement du catalogue…</p>
      ) : selected.menu.length === 0 ? (
        <p className="dr-empty">Aucun plat pour ce restaurant.</p>
      ) : (
        <ul className="dr-ops-list">
          {selected.menu.map((item) => (
            <li key={item.id} className="dr-ops-card">
              {editId === item.id ? (
                <>
                  <div className="dr-menu-admin-form">
                    <div className="dr-field">
                      <label htmlFor={`e-name-${item.id}`}>Nom</label>
                      <input id={`e-name-${item.id}`} value={editName} disabled={busy} onChange={(e) => setEditName(e.target.value)} />
                    </div>
                    <div className="dr-field">
                      <label htmlFor={`e-desc-${item.id}`}>Description</label>
                      <input id={`e-desc-${item.id}`} value={editDesc} disabled={busy} onChange={(e) => setEditDesc(e.target.value)} />
                    </div>
                    <div className="dr-field">
                      <label htmlFor={`e-price-${item.id}`}>Prix (€)</label>
                      <input
                        id={`e-price-${item.id}`}
                        value={editPriceEuro}
                        disabled={busy}
                        onChange={(e) => setEditPriceEuro(e.target.value)}
                        inputMode="decimal"
                      />
                    </div>
                    <div className="dr-field">
                      <label htmlFor={`e-all-${item.id}`}>Allergènes</label>
                      <input id={`e-all-${item.id}`} value={editAllergens} disabled={busy} onChange={(e) => setEditAllergens(e.target.value)} />
                    </div>
                  </div>
                  <div className="dr-ops-actions">
                    <button type="button" className="dr-btn dr-btn-primary" disabled={busy} onClick={() => void onSaveEdit(item.id)}>
                      Enregistrer
                    </button>
                    <button type="button" className="dr-btn dr-btn-muted" disabled={busy} onClick={() => setEditId(null)}>
                      Annuler
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="dr-ops-card-head">
                    <strong>{item.name}</strong>
                    <span className="dr-ops-badge">{formatEur(item.priceCents)}</span>
                    <span className="dr-ops-badge dr-ops-badge-muted">reste {item.remainingStock}</span>
                  </div>
                  <p className="dr-menu-admin-desc">{item.description || '—'}</p>
                  {item.allergens.length > 0 ? (
                    <p className="dr-menu-admin-all">Allergènes : {item.allergens.join(', ')}</p>
                  ) : null}
                  <p className="dr-menu-admin-meta">
                    Stock du jour : <strong>{item.dailyStock}</strong>
                  </p>
                  <div className="dr-ops-actions dr-ops-inline">
                    <label>
                      Nouveau stock du jour
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={stockDailyById[item.id] ?? String(item.dailyStock)}
                        disabled={busy}
                        onChange={(e) => setStockDailyById((m) => ({ ...m, [item.id]: e.target.value }))}
                      />
                    </label>
                    <button type="button" className="dr-btn dr-btn-muted" disabled={busy} onClick={() => void onSetDailyStock(item.id)}>
                      Appliquer stock
                    </button>
                    <button type="button" className="dr-btn dr-btn-primary" disabled={busy} onClick={() => startEdit(item)}>
                      Modifier le plat
                    </button>
                    <button type="button" className="dr-btn dr-btn-ghost" disabled={busy} onClick={() => void onDelete(item.id)}>
                      Supprimer
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
