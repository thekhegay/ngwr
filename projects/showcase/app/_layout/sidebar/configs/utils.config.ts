import { ROUTES, wrPath, type WrRoute } from '#routes';
import type { SidebarGroup, SidebarLink } from '#types';

const base = [ROUTES.reference, ROUTES.reference.utils];

/** A row takes its title and its link from the route node, so the two cannot disagree. */
const link = (route: WrRoute): SidebarLink => ({ title: route.title, url: wrPath(...base, route) });

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
    link(ROUTES.reference.utils.badgeLog),
    link(ROUTES.reference.utils.clamp),
    link(ROUTES.reference.utils.debounce),
    link(ROUTES.reference.utils.getFocusableElements),
    link(ROUTES.reference.utils.getRootFontSize),
    link(ROUTES.reference.utils.hasModifier),
    link(ROUTES.reference.utils.isComposing),
    link(ROUTES.reference.utils.isDefined),
    link(ROUTES.reference.utils.isNonEmptyArray),
    link(ROUTES.reference.utils.isObservable),
    link(ROUTES.reference.utils.isPrintableKey),
    link(ROUTES.reference.utils.keys),
    link(ROUTES.reference.utils.noop),
    link(ROUTES.reference.utils.numAttr),
    link(ROUTES.reference.utils.randomId),
    link(ROUTES.reference.utils.resolveCssSize),
    link(ROUTES.reference.utils.round),
    link(ROUTES.reference.utils.throttle),
    link(ROUTES.reference.utils.toClassList),
    link(ROUTES.reference.utils.trapFocus),
  ],
};
