import { ROUTES, wrLink } from '#routes';
import type { SidebarGroup } from '#types';

/** The Interfaces group of the Reference sidebar — shared shapes and the full catalog. */
export const INTERFACES_GROUP: SidebarGroup = {
  title: 'Interfaces',
  children: [
    wrLink(ROUTES.reference, ROUTES.reference.interfaces, ROUTES.reference.interfaces.overview),
    wrLink(ROUTES.reference, ROUTES.reference.interfaces, ROUTES.reference.interfaces.catalog),
    wrLink(ROUTES.reference, ROUTES.reference.interfaces, ROUTES.reference.interfaces.common),
    wrLink(ROUTES.reference, ROUTES.reference.interfaces, ROUTES.reference.interfaces.theme),
  ],
};
