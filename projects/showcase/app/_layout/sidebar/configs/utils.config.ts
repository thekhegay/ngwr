import { ROUTES } from '#routes';
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
    ROUTES.reference.utils.badgeLog,
    ROUTES.reference.utils.clamp,
    ROUTES.reference.utils.debounce,
    ROUTES.reference.utils.getFocusableElements,
    ROUTES.reference.utils.getRootFontSize,
    ROUTES.reference.utils.hasModifier,
    ROUTES.reference.utils.isComposing,
    ROUTES.reference.utils.isDefined,
    ROUTES.reference.utils.isNonEmptyArray,
    ROUTES.reference.utils.isObservable,
    ROUTES.reference.utils.isPrintableKey,
    ROUTES.reference.utils.keys,
    ROUTES.reference.utils.noop,
    ROUTES.reference.utils.numAttr,
    ROUTES.reference.utils.randomId,
    ROUTES.reference.utils.resolveCssSize,
    ROUTES.reference.utils.round,
    ROUTES.reference.utils.throttle,
    ROUTES.reference.utils.toClassList,
    ROUTES.reference.utils.trapFocus,
  ],
};
