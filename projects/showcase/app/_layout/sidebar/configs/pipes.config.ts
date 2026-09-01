import type { SidebarGroup } from '../sidebar.types';

/** The Pipes group of the Reference sidebar — one row per pipe. */
export const PIPES_GROUP: SidebarGroup = {
  title: 'Pipes',
  children: [
    { title: 'wrBytes', url: ['/reference/pipes', 'wr-bytes'] },
    { title: 'wrDate', url: ['/reference/pipes', 'wr-date'] },
    { title: 'wrMark', url: ['/reference/pipes', 'wr-mark'] },
    { title: 'wrNumber', url: ['/reference/pipes', 'wr-number'] },
    { title: 'wrPlural', url: ['/reference/pipes', 'wr-plural'] },
    { title: 'wrRange', url: ['/reference/pipes', 'wr-range'] },
    { title: 'wrTruncate', url: ['/reference/pipes', 'wr-truncate'] },
  ],
};
