import { ROUTES } from '#routes';
import type { SidebarGroup } from '#types';

/** The Directives group of the Reference sidebar — one row per directive. */
export const DIRECTIVES_GROUP: SidebarGroup = {
  title: 'Directives',
  children: [
    ROUTES.reference.directives.affix,
    ROUTES.reference.directives.autofocus,
    ROUTES.reference.directives.autosize,
    ROUTES.reference.directives.clickOutside,
    ROUTES.reference.directives.copyToClipboard,
    ROUTES.reference.directives.typography,
  ],
};
