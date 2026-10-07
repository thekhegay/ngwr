import { ROUTES } from '#routes';
import type { SidebarGroup } from '#types';

/**
 * Sidebar for `/icons/*`. Flat list — Overview at the top, then every
 * supported icon set as its own entry so visitors can see which sets
 * ngwr ships an adapter or recipe for at a glance.
 */
export const ICONS_SIDEBAR: readonly SidebarGroup[] = [
  ROUTES.icons.overview,
  ROUTES.icons.bootstrap,
  ROUTES.icons.feather,
  ROUTES.icons.heroicons,
  ROUTES.icons.iconoir,
  ROUTES.icons.lucide,
  ROUTES.icons.phosphor,
  ROUTES.icons.radix,
  ROUTES.icons.tabler,
];
