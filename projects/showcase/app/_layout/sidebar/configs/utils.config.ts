import type { SidebarGroup } from '../sidebar.types';

/** Flat sidebar for `/utils/*` — one direct-link row per util page. */
export const UTILS_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'resolveCssSize', url: ['/utils', 'css-size'] },
  { title: 'randomId', url: ['/utils', 'random-id'] },
  { title: 'Type guards', url: ['/utils', 'guards'] },
  { title: 'Keyboard', url: ['/utils', 'keys'] },
  { title: 'Misc', url: ['/utils', 'misc'] },
];
