import type { SidebarGroup } from '../sidebar.types';

/** The Interfaces group of the Reference sidebar — shared shapes and the full catalog. */
export const INTERFACES_GROUP: SidebarGroup = {
  title: 'Interfaces',
  children: [
    { title: 'Overview', url: ['/reference/interfaces', 'overview'] },
    { title: 'Catalog', url: ['/reference/interfaces', 'catalog'] },
    { title: 'Common', url: ['/reference/interfaces', 'common'] },
    { title: 'Theme', url: ['/reference/interfaces', 'theme'] },
  ],
};
