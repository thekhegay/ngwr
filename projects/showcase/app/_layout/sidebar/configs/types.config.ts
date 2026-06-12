import type { SidebarGroup } from '../sidebar.types';

/** Sidebar for `/types/*` — shared type aliases and the full catalog. */
export const TYPES_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'Common', url: ['/types', 'common'] },
  { title: 'Theme', url: ['/types', 'theme'] },
  { title: 'Catalog', url: ['/types', 'catalog'] },
];
