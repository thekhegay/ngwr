import type { SidebarGroup } from '../sidebar.types';

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
    { title: 'toClassList', url: ['/reference/utils', 'to-class-list'] },
    { title: 'trapFocus', url: ['/reference/utils', 'trap-focus'] },
  ],
};
