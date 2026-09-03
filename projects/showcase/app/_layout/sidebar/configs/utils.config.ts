import type { SidebarGroup } from '../sidebar.types';

/**
 * The Utils group of the Reference sidebar — one row per helper.
 *
 * Flat and alphabetical rather than sub-grouped by purpose (CSS / Focus /
 * Math / …): the sidebar renders two levels, group then link, so a cluster
 * that is itself a top-level group has nowhere left to nest its categories.
 * Eighteen rows read fine in one run, and the categories still organise the
 * `/reference/utils` landing page, which is where a reader browsing by
 * purpose is.
 */
export const UTILS_GROUP: SidebarGroup = {
  title: 'Utils',
  children: [
    { title: 'badgeLog', url: ['/reference/utils', 'badge-log'] },
    { title: 'clamp', url: ['/reference/utils', 'clamp'] },
    { title: 'debounce', url: ['/reference/utils', 'debounce'] },
    { title: 'getFocusableElements', url: ['/reference/utils', 'get-focusable-elements'] },
    { title: 'getRootFontSize', url: ['/reference/utils', 'get-root-font-size'] },
    { title: 'hasModifier', url: ['/reference/utils', 'has-modifier'] },
    { title: 'isComposing', url: ['/reference/utils', 'is-composing'] },
    { title: 'isDefined', url: ['/reference/utils', 'is-defined'] },
    { title: 'isNonEmptyArray', url: ['/reference/utils', 'is-non-empty-array'] },
    { title: 'isObservable', url: ['/reference/utils', 'is-observable'] },
    { title: 'isPrintableKey', url: ['/reference/utils', 'is-printable-key'] },
    { title: 'KEYS', url: ['/reference/utils', 'keys'] },
    { title: 'noop', url: ['/reference/utils', 'noop'] },
    { title: 'numAttr', url: ['/reference/utils', 'num-attr'] },
    { title: 'randomId', url: ['/reference/utils', 'random-id'] },
    { title: 'resolveCssSize', url: ['/reference/utils', 'resolve-css-size'] },
    { title: 'round', url: ['/reference/utils', 'round'] },
    { title: 'throttle', url: ['/reference/utils', 'throttle'] },
    { title: 'trapFocus', url: ['/reference/utils', 'trap-focus'] },
  ],
};
