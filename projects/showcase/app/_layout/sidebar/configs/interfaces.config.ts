import type { SidebarGroup } from '../sidebar.types';

import { withReferenceClusters } from './reference-clusters';

/** Sidebar for `/reference/interfaces/*` — shared shapes and the full catalog. */
export const INTERFACES_SIDEBAR: readonly SidebarGroup[] = withReferenceClusters([
  { title: 'Overview', url: ['/reference/interfaces', 'overview'] },
  { title: 'Catalog', url: ['/reference/interfaces', 'catalog'] },
  { title: 'Common', url: ['/reference/interfaces', 'common'] },
  { title: 'Theme', url: ['/reference/interfaces', 'theme'] },
]);
