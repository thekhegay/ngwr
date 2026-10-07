import { ROUTES } from '#routes';
import type { SidebarGroup } from '#types';

/** The Interfaces group of the Reference sidebar — shared shapes and the full catalog. */
export const INTERFACES_GROUP: SidebarGroup = {
  title: 'Interfaces',
  children: [
    ROUTES.reference.interfaces.overview,
    ROUTES.reference.interfaces.catalog,
    ROUTES.reference.interfaces.common,
    ROUTES.reference.interfaces.theme,
  ],
};
