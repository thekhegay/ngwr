import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/icons/*`. Flat list — Overview at the top, then every
 * supported icon set as its own entry so visitors can see which sets
 * ngwr ships an adapter or recipe for at a glance.
 */
export const ICONS_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'Overview', url: ['/icons', 'overview'] },
  { title: 'Bootstrap', url: ['/icons', 'bootstrap'] },
  { title: 'Feather', url: ['/icons', 'feather'] },
  { title: 'Heroicons', url: ['/icons', 'heroicons'] },
  { title: 'Iconoir', url: ['/icons', 'iconoir'] },
  { title: 'Lucide', url: ['/icons', 'lucide'] },
  { title: 'Phosphor', url: ['/icons', 'phosphor'] },
  { title: 'Radix', url: ['/icons', 'radix'] },
  { title: 'Tabler', url: ['/icons', 'tabler'] },
];
