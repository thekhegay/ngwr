import { ROUTES, wrLink } from '#routes';
import type { SidebarGroup } from '#types';

/**
 * Sidebar for `/icons/*`. Flat list — Overview at the top, then every
 * supported icon set as its own entry so visitors can see which sets
 * ngwr ships an adapter or recipe for at a glance.
 */
export const ICONS_SIDEBAR: readonly SidebarGroup[] = [
  wrLink(ROUTES.icons, ROUTES.icons.overview),
  wrLink(ROUTES.icons, ROUTES.icons.bootstrap),
  wrLink(ROUTES.icons, ROUTES.icons.feather),
  wrLink(ROUTES.icons, ROUTES.icons.heroicons),
  wrLink(ROUTES.icons, ROUTES.icons.iconoir),
  wrLink(ROUTES.icons, ROUTES.icons.lucide),
  wrLink(ROUTES.icons, ROUTES.icons.phosphor),
  wrLink(ROUTES.icons, ROUTES.icons.radix),
  wrLink(ROUTES.icons, ROUTES.icons.tabler),
];
