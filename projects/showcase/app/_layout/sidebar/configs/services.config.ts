import { ROUTES } from '#routes';
import type { SidebarGroup } from '#types';

/** The Services group of the Reference sidebar — one row per injectable. */
export const SERVICES_GROUP: SidebarGroup = {
  title: 'Services',
  children: [
    ROUTES.reference.services.clipboard,
    ROUTES.reference.services.cookie,
    ROUTES.reference.services.density,
    ROUTES.reference.services.hotkey,
    ROUTES.reference.services.i18n,
    ROUTES.reference.services.loadingBar,
    ROUTES.reference.services.media,
    ROUTES.reference.services.meta,
    ROUTES.reference.services.platform,
    ROUTES.reference.services.scroll,
    ROUTES.reference.services.storage,
    ROUTES.reference.services.theme,
    ROUTES.reference.services.tour,
  ],
};
