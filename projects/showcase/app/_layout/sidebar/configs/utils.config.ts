import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/reference/utils/*` — grouped by purpose. Mirrors the categories
 * in `routes.utils` (see `routing.ts`).
 */
export const UTILS_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'CSS',
    children: [
      { title: 'getRootFontSize', url: ['/reference/utils', 'get-root-font-size'] },
      { title: 'resolveCssSize', url: ['/reference/utils', 'resolve-css-size'] },
    ],
  },
  {
    title: 'Focus',
    children: [
      { title: 'getFocusableElements', url: ['/reference/utils', 'get-focusable-elements'] },
      { title: 'trapFocus', url: ['/reference/utils', 'trap-focus'] },
    ],
  },
  {
    title: 'Functional',
    children: [
      { title: 'badgeLog', url: ['/reference/utils', 'badge-log'] },
      { title: 'debounce', url: ['/reference/utils', 'debounce'] },
      { title: 'noop', url: ['/reference/utils', 'noop'] },
      { title: 'throttle', url: ['/reference/utils', 'throttle'] },
    ],
  },
  {
    title: 'IDs',
    children: [{ title: 'randomId', url: ['/reference/utils', 'random-id'] }],
  },
  {
    title: 'Keyboard',
    children: [
      { title: 'hasModifier', url: ['/reference/utils', 'has-modifier'] },
      { title: 'isPrintableKey', url: ['/reference/utils', 'is-printable-key'] },
      { title: 'KEYS', url: ['/reference/utils', 'keys'] },
    ],
  },
  {
    title: 'Math',
    children: [
      { title: 'clamp', url: ['/reference/utils', 'clamp'] },
      { title: 'numAttr', url: ['/reference/utils', 'num-attr'] },
      { title: 'round', url: ['/reference/utils', 'round'] },
    ],
  },
  {
    title: 'Type guards',
    children: [
      { title: 'isDefined', url: ['/reference/utils', 'is-defined'] },
      { title: 'isNonEmptyArray', url: ['/reference/utils', 'is-non-empty-array'] },
      { title: 'isObservable', url: ['/reference/utils', 'is-observable'] },
    ],
  },
];
