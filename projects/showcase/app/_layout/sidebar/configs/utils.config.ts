import { ROUTES, wrLink } from '#routes';
import type { SidebarGroup } from '#types';

/**
 * The Utils group of the Reference sidebar — one row per helper.
 *
 * Flat and alphabetical rather than sub-grouped by purpose (CSS / Focus /
 * Math / …): the sidebar renders two levels, group then link, so a cluster
 * that is itself a top-level group has nowhere left to nest its categories.
 * Nor is there a second place they survive — `/reference/utils` is a
 * `doc-index`, and a `doc-index` builds its sections from THIS array, so a
 * grouping dropped here is dropped everywhere. Alphabetical is the ordering
 * that needs no key, which is the right default for a list a reader scans for
 * a name they already know.
 */
export const UTILS_GROUP: SidebarGroup = {
  title: 'Utils',
  children: [
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.badgeLog),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.clamp),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.debounce),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.getFocusableElements),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.getRootFontSize),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.hasModifier),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.isComposing),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.isDefined),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.isNonEmptyArray),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.isObservable),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.isPrintableKey),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.keys),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.noop),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.numAttr),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.randomId),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.resolveCssSize),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.round),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.throttle),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.toClassList),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.trapFocus),
  ],
};
