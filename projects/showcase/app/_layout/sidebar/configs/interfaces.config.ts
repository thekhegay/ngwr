import { ROUTES, wrPath, type WrRoute } from '#routes';
import type { SidebarGroup, SidebarLink } from '#types';

const base = [ROUTES.reference, ROUTES.reference.interfaces];

/** A row takes its title and its link from the route node, so the two cannot disagree. */
const link = (route: WrRoute): SidebarLink => ({ title: route.title, url: wrPath(...base, route) });

/** The Interfaces group of the Reference sidebar — shared shapes and the full catalog. */
export const INTERFACES_GROUP: SidebarGroup = {
  title: 'Interfaces',
  children: [
    link(ROUTES.reference.interfaces.overview),
    link(ROUTES.reference.interfaces.catalog),
    link(ROUTES.reference.interfaces.common),
    link(ROUTES.reference.interfaces.theme),
  ],
};
