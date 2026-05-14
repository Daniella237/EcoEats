/** Visuels distinctifs par restaurant (Unsplash, usage conforme aux conditions du site). */
export const RESTAURANT_COVER: Record<string, string> = {
  'rest-green':
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1400&q=80',
  'rest-pizza':
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1400&q=80',
};

const DISH_POOL = [
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad0?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=800&q=80',
];

export function dishPhotoUrl(menuItemId: string): string {
  let h = 0;
  for (let i = 0; i < menuItemId.length; i += 1) {
    h = (h + menuItemId.charCodeAt(i) * (i + 1)) % 2147483647;
  }
  return DISH_POOL[h % DISH_POOL.length] ?? DISH_POOL[0];
}

export function restaurantCoverUrl(restaurantId: string): string {
  return (
    RESTAURANT_COVER[restaurantId] ??
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=80'
  );
}
