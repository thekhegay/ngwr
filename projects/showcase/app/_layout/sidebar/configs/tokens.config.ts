import type { SidebarGroup } from '../sidebar.types';

/** Sidebar for `/tokens/*` — the design-token reference (colors, sizing,
 * typography, density). */
export const TOKENS_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'Colors', url: ['/tokens', 'colors'] },
  { title: 'Sizing', url: ['/tokens', 'sizing'] },
  { title: 'Typography', url: ['/tokens', 'typography'] },
  { title: 'Density', url: ['/tokens', 'density'] },
];
