import type { SidebarGroup } from '../sidebar.types';

/**
 * Flat sidebar for `/pipes/*` — no parent toggle, just one direct-link
 * row per pipe (a `SidebarGroup` with `url` renders as a direct link).
 */
export const PIPES_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'wrNumber', url: ['/pipes', 'wr-number'] },
  { title: 'wrBytes', url: ['/pipes', 'wr-bytes'] },
  { title: 'wrDate', url: ['/pipes', 'wr-date'] },
  { title: 'wrTruncate', url: ['/pipes', 'wr-truncate'] },
  { title: 'wrMark', url: ['/pipes', 'wr-mark'] },
  { title: 'wrRange', url: ['/pipes', 'range'] },
];
