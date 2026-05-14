import { dishPhotoUrl, restaurantCoverUrl } from '../restaurantMedia';
import { formatEur } from '../api';
import type { MenuItem, Restaurant } from '../types';

export type RestaurantBoardProps = {
  readonly catalog: readonly Restaurant[];
  readonly selectedRestaurantId: string | null;
  readonly onSelectRestaurant: (id: string) => void;
  readonly etaForRestaurant: (r: Restaurant) => string;
  readonly busy: boolean;
  readonly onAddItem: (restaurantId: string, item: MenuItem) => void;
};

export function RestaurantBoard({
  catalog,
  selectedRestaurantId,
  onSelectRestaurant,
  etaForRestaurant,
  busy,
  onAddItem,
}: RestaurantBoardProps) {
  const selected = selectedRestaurantId ? catalog.find((r) => r.id === selectedRestaurantId) ?? null : null;

  return (
    <>
      <h2 className="dr-section-title">Restaurants</h2>
      <div className="dr-rest-scroll">
        {catalog.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`dr-rest-card${selectedRestaurantId === r.id ? ' is-active' : ''}`}
            onClick={() => onSelectRestaurant(r.id)}
          >
            <img src={restaurantCoverUrl(r.id)} alt="" loading="lazy" />
            <div className="dr-rest-card-body">
              <h3>{r.name}</h3>
              <div className="dr-rest-meta">{etaForRestaurant(r)}</div>
            </div>
          </button>
        ))}
      </div>

      {selected ? (
        <>
          <h2 className="dr-section-title">Menu — {selected.name}</h2>
          <div className="dr-menu">
            {selected.menu.map((item) => (
              <article key={item.id} className="dr-dish">
                <div className="dr-dish-img">
                  <img src={dishPhotoUrl(item.id)} alt="" loading="lazy" />
                </div>
                <div className="dr-dish-main">
                  <h4>{item.name}</h4>
                  <p className="dr-dish-desc">{item.description}</p>
                  {item.allergens.length > 0 ? (
                    <div className="dr-dish-allergens">Allergènes : {item.allergens.join(', ')}</div>
                  ) : null}
                </div>
                <div className="dr-dish-side">
                  <div className="dr-price">{formatEur(item.priceCents)}</div>
                  <button
                    type="button"
                    className="dr-btn dr-btn-primary dr-btn-add"
                    disabled={busy || item.remainingStock <= 0}
                    title={item.remainingStock <= 0 ? 'Indisponible' : undefined}
                    onClick={() => void onAddItem(selected.id, item)}
                  >
                    Ajouter
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
