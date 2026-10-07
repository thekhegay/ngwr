import { ROUTES, wrPath, type WrRoute } from '#routes';
import type { SidebarGroup, SidebarLink } from '#types';

const base = [ROUTES.reference, ROUTES.reference.directives];

/** A row takes its title and its link from the route node, so the two cannot disagree. */
const link = (route: WrRoute): SidebarLink => ({ title: route.title, url: wrPath(...base, route) });

/** The Directives group of the Reference sidebar — one row per directive. */
export const DIRECTIVES_GROUP: SidebarGroup = {
  title: 'Directives',
  children: [
    link(ROUTES.reference.directives.affix),
    link(ROUTES.reference.directives.autofocus),
    link(ROUTES.reference.directives.autosize),
    link(ROUTES.reference.directives.clickOutside),
    link(ROUTES.reference.directives.copyToClipboard),
    link(ROUTES.reference.directives.typography),
  ],
};
