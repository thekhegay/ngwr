import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/utils/*` — grouped by purpose. Mirrors the categories
 * in `routes.utils` (see `routing.ts`).
 */
export const UTILS_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'CSS',
    children: [
      { title: 'getRootFontSize', url: ['/utils', 'get-root-font-size'] },
      { title: 'resolveCssSize', url: ['/utils', 'resolve-css-size'] },
    ],
  },
  {
    title: 'Focus',
    children: [
      { title: 'getFocusableElements', url: ['/utils', 'get-focusable-elements'] },
      { title: 'trapFocus', url: ['/utils', 'trap-focus'] },
    ],
  },
  {
    title: 'Functional',
    children: [
      { title: 'badgeLog', url: ['/utils', 'badge-log'] },
      { title: 'debounce', url: ['/utils', 'debounce'] },
      { title: 'noop', url: ['/utils', 'noop'] },
      { title: 'throttle', url: ['/utils', 'throttle'] },
    ],
  },
  {
    title: 'IDs',
    children: [{ title: 'randomId', url: ['/utils', 'random-id'] }],
  },
  {
    title: 'Keyboard',
    children: [
      { title: 'hasModifier', url: ['/utils', 'has-modifier'] },
      { title: 'isPrintableKey', url: ['/utils', 'is-printable-key'] },
      { title: 'KEYS', url: ['/utils', 'keys'] },
    ],
  },
  {
    title: 'Math',
    children: [
      { title: 'clamp', url: ['/utils', 'clamp'] },
      { title: 'numAttr', url: ['/utils', 'num-attr'] },
      { title: 'round', url: ['/utils', 'round'] },
    ],
  },
  {
    title: 'Type guards',
    children: [
      { title: 'isDefined', url: ['/utils', 'is-defined'] },
      { title: 'isNonEmptyArray', url: ['/utils', 'is-non-empty-array'] },
      { title: 'isObservable', url: ['/utils', 'is-observable'] },
    ],
  },
];
