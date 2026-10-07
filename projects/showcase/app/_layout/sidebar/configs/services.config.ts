import { ROUTES, wrPath, type WrRoute } from '#routes';
import type { SidebarGroup, SidebarLink } from '#types';

const base = [ROUTES.reference, ROUTES.reference.services];

/** A row takes its title and its link from the route node, so the two cannot disagree. */
const link = (route: WrRoute): SidebarLink => ({ title: route.title, url: wrPath(...base, route) });

/** The Services group of the Reference sidebar — one row per injectable. */
export const SERVICES_GROUP: SidebarGroup = {
  title: 'Services',
  children: [
    link(ROUTES.reference.services.clipboard),
    link(ROUTES.reference.services.cookie),
    link(ROUTES.reference.services.density),
    link(ROUTES.reference.services.hotkey),
    link(ROUTES.reference.services.i18n),
    link(ROUTES.reference.services.loadingBar),
    link(ROUTES.reference.services.media),
    link(ROUTES.reference.services.meta),
    link(ROUTES.reference.services.platform),
    link(ROUTES.reference.services.scroll),
    link(ROUTES.reference.services.storage),
    link(ROUTES.reference.services.theme),
    link(ROUTES.reference.services.tour),
  ],
};
