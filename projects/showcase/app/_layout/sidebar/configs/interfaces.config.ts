import type { SidebarGroup } from '../sidebar.types';

/** Sidebar for `/interfaces/*` — shared shapes and the full catalog. */
export const INTERFACES_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'Common', url: ['/interfaces', 'common'] },
  { title: 'Theme', url: ['/interfaces', 'theme'] },
  { title: 'Catalog', url: ['/interfaces', 'catalog'] },
];
