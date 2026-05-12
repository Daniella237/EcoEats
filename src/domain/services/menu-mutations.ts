import type { MenuItem } from '../entities/menu-item.js';

export function withMenuItemReplaced(
  menu: readonly MenuItem[],
  menuItemId: string,
  next: MenuItem,
): MenuItem[] {
  const idx = menu.findIndex((m) => m.id === menuItemId);
  if (idx === -1) {
    return [...menu, next];
  }
  return menu.map((m, i) => (i === idx ? next : m));
}

export function withMenuItemRemoved(menu: readonly MenuItem[], menuItemId: string): MenuItem[] {
  return menu.filter((m) => m.id !== menuItemId);
}
