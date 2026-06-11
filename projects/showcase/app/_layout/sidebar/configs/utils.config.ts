import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/utils/*` — grouped by purpose. Mirrors the categories
 * in `routes.utils` (see `routing.ts`).
 */
export const UTILS_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'CSS',
    children: [
      { title: 'resolveCssSize', url: ['/utils', 'resolve-css-size'] },
      { title: 'getRootFontSize', url: ['/utils', 'get-root-font-size'] },
    ],
  },
  {
    title: 'IDs',
    children: [{ title: 'randomId', url: ['/utils', 'random-id'] }],
  },
  {
    title: 'Type guards',
    children: [
      { title: 'isDefined', url: ['/utils', 'is-defined'] },
      { title: 'types', url: ['/utils', 'types'] },
      { title: 'isNonEmptyArray', url: ['/utils', 'is-non-empty-array'] },
      { title: 'isObservable', url: ['/utils', 'is-observable'] },
    ],
  },
  {
    title: 'Keyboard',
    children: [
      { title: 'KEYS', url: ['/utils', 'keys'] },
      { title: 'hasModifier', url: ['/utils', 'has-modifier'] },
      { title: 'isPrintableKey', url: ['/utils', 'is-printable-key'] },
    ],
  },
  {
    title: 'Functional',
    children: [
      { title: 'noop', url: ['/utils', 'noop'] },
      { title: 'badgeLog', url: ['/utils', 'badge-log'] },
      { title: 'debounce', url: ['/utils', 'debounce'] },
      { title: 'throttle', url: ['/utils', 'throttle'] },
    ],
  },
  {
    title: 'Focus',
    children: [
      { title: 'getFocusableElements', url: ['/utils', 'get-focusable-elements'] },
      { title: 'trapFocus', url: ['/utils', 'trap-focus'] },
    ],
  },
];
