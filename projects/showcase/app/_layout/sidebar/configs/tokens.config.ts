import type { SidebarGroup } from '../sidebar.types';

/** Sidebar for `/guides/tokens/*` — the design-token reference (colors, sizing,
 * typography, density, motion). */
export const TOKENS_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'Colors', url: ['/guides/tokens', 'colors'] },
  { title: 'Sizing', url: ['/guides/tokens', 'sizing'] },
  { title: 'Typography', url: ['/guides/tokens', 'typography'] },
  { title: 'Density', url: ['/guides/tokens', 'density'] },
  { title: 'Motion', url: ['/guides/tokens', 'motion'] },
];
