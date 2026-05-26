import type { SidebarGroup } from '../sidebar.types';

/** Flat sidebar for `/utils/*` — one direct-link row per util. */
export const UTILS_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'resolveCssSize', url: ['/utils', 'resolve-css-size'] },
  { title: 'getRootFontSize', url: ['/utils', 'get-root-font-size'] },
  { title: 'randomId', url: ['/utils', 'random-id'] },
  { title: 'isDefined', url: ['/utils', 'is-defined'] },
  { title: 'isNonEmptyArray', url: ['/utils', 'is-non-empty-array'] },
  { title: 'isObservable', url: ['/utils', 'is-observable'] },
  { title: 'KEYS', url: ['/utils', 'keys'] },
  { title: 'hasModifier', url: ['/utils', 'has-modifier'] },
  { title: 'isPrintableKey', url: ['/utils', 'is-printable-key'] },
  { title: 'noop', url: ['/utils', 'noop'] },
  { title: 'badgeLog', url: ['/utils', 'badge-log'] },
  { title: 'debounce', url: ['/utils', 'debounce'] },
  { title: 'throttle', url: ['/utils', 'throttle'] },
  { title: 'getFocusableElements', url: ['/utils', 'get-focusable-elements'] },
  { title: 'trapFocus', url: ['/utils', 'trap-focus'] },
];
