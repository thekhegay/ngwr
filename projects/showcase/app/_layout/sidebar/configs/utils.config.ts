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
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrBadgeLog),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrClamp),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrDebounce),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrGetFocusableElements),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrGetRootFontSize),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrHasModifier),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrIsComposing),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrIsDefined),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrIsNonEmptyArray),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrIsObservable),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrIsPrintableKey),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrKeys),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrNoop),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrNumAttr),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrRandomId),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrResolveCssColor),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrResolveCssSize),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrRound),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrThrottle),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrToClassList),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrTrapFocus),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrAction),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrDecimal),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrDownloadBlob),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrInitials),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrPoll),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrQueryParam),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.withRenderOnNavigation),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrFeature),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrIsSafeCssValue),
    wrLink(ROUTES.reference, ROUTES.reference.utils, ROUTES.reference.utils.wrLiveLocale),
  ],
};
