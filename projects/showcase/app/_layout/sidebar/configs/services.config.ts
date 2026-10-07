import { ROUTES, wrLink } from '#routes';
import type { SidebarGroup } from '#types';

/** The Services group of the Reference sidebar — one row per injectable. */
export const SERVICES_GROUP: SidebarGroup = {
  title: 'Services',
  children: [
    wrLink(ROUTES.reference, ROUTES.reference.services, ROUTES.reference.services.clipboard),
    wrLink(ROUTES.reference, ROUTES.reference.services, ROUTES.reference.services.cookie),
    wrLink(ROUTES.reference, ROUTES.reference.services, ROUTES.reference.services.density),
    wrLink(ROUTES.reference, ROUTES.reference.services, ROUTES.reference.services.hotkey),
    wrLink(ROUTES.reference, ROUTES.reference.services, ROUTES.reference.services.i18n),
    wrLink(ROUTES.reference, ROUTES.reference.services, ROUTES.reference.services.loadingBar),
    wrLink(ROUTES.reference, ROUTES.reference.services, ROUTES.reference.services.media),
    wrLink(ROUTES.reference, ROUTES.reference.services, ROUTES.reference.services.meta),
    wrLink(ROUTES.reference, ROUTES.reference.services, ROUTES.reference.services.platform),
    wrLink(ROUTES.reference, ROUTES.reference.services, ROUTES.reference.services.scroll),
    wrLink(ROUTES.reference, ROUTES.reference.services, ROUTES.reference.services.storage),
    wrLink(ROUTES.reference, ROUTES.reference.services, ROUTES.reference.services.theme),
    wrLink(ROUTES.reference, ROUTES.reference.services, ROUTES.reference.services.tour),
  ],
};
