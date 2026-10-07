import { ROUTES, wrLink } from '#routes';
import type { SidebarGroup } from '#types';

/** The Directives group of the Reference sidebar — one row per directive. */
export const DIRECTIVES_GROUP: SidebarGroup = {
  title: 'Directives',
  children: [
    wrLink(ROUTES.reference, ROUTES.reference.directives, ROUTES.reference.directives.affix),
    wrLink(ROUTES.reference, ROUTES.reference.directives, ROUTES.reference.directives.autofocus),
    wrLink(ROUTES.reference, ROUTES.reference.directives, ROUTES.reference.directives.autosize),
    wrLink(ROUTES.reference, ROUTES.reference.directives, ROUTES.reference.directives.clickOutside),
    wrLink(ROUTES.reference, ROUTES.reference.directives, ROUTES.reference.directives.copyToClipboard),
    wrLink(ROUTES.reference, ROUTES.reference.directives, ROUTES.reference.directives.typography),
  ],
};
