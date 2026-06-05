import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/icons/*`. Flat list — Overview at the top, then every
 * supported icon set as its own entry so visitors can see which sets
 * ngwr ships an adapter or recipe for at a glance.
 */
export const ICONS_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'Overview', url: ['/icons', 'overview'] },
  { title: 'Lucide', url: ['/icons', 'lucide'] },
  { title: 'Feather', url: ['/icons', 'feather'] },
  { title: 'Tabler', url: ['/icons', 'tabler'] },
  { title: 'Phosphor', url: ['/icons', 'phosphor'] },
  { title: 'Heroicons', url: ['/icons', 'heroicons'] },
  { title: 'Iconoir', url: ['/icons', 'iconoir'] },
  { title: 'Bootstrap', url: ['/icons', 'bootstrap'] },
];
