import type { SidebarGroup } from '../sidebar.types';

/**
 * Flat sidebar for `/reference/pipes/*` — no parent toggle, just one direct-link
 * row per pipe (a `SidebarGroup` with `url` renders as a direct link).
 */
export const PIPES_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'wrBytes', url: ['/reference/pipes', 'wr-bytes'] },
  { title: 'wrDate', url: ['/reference/pipes', 'wr-date'] },
  { title: 'wrMark', url: ['/reference/pipes', 'wr-mark'] },
  { title: 'wrNumber', url: ['/reference/pipes', 'wr-number'] },
  { title: 'wrPlural', url: ['/reference/pipes', 'wr-plural'] },
  { title: 'wrRange', url: ['/reference/pipes', 'range'] },
  { title: 'wrTruncate', url: ['/reference/pipes', 'wr-truncate'] },
];
