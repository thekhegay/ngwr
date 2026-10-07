import { ROUTES, wrPath, type WrRoute } from '#routes';
import type { SidebarGroup, SidebarLink } from '#types';

const base = [ROUTES.icons];

/** A row takes its title and its link from the route node, so the two cannot disagree. */
const link = (route: WrRoute): SidebarLink => ({ title: route.title, url: wrPath(...base, route) });

/**
 * Sidebar for `/icons/*`. Flat list — Overview at the top, then every
 * supported icon set as its own entry so visitors can see which sets
 * ngwr ships an adapter or recipe for at a glance.
 */
export const ICONS_SIDEBAR: readonly SidebarGroup[] = [
  link(ROUTES.icons.overview),
  link(ROUTES.icons.bootstrap),
  link(ROUTES.icons.feather),
  link(ROUTES.icons.heroicons),
  link(ROUTES.icons.iconoir),
  link(ROUTES.icons.lucide),
  link(ROUTES.icons.phosphor),
  link(ROUTES.icons.radix),
  link(ROUTES.icons.tabler),
];
