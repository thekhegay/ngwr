import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/icons/*`. Top of the list is the overview / installation
 * primer; the rest are per-source browsers. Sources with a dedicated
 * adapter (Lucide, Feather) get full browser pages; SVG-only sources
 * (Tabler, Phosphor, Heroicons, …) get a primer page that documents the
 * `svgIcon()` pattern with a few sample icons.
 */
export const ICONS_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'Overview', url: ['/icons', 'overview'] },
  {
    title: 'With adapter',
    children: [
      { title: 'Lucide', url: ['/icons', 'lucide'] },
      { title: 'Feather', url: ['/icons', 'feather'] },
    ],
  },
  {
    title: 'With svgIcon()',
    children: [
      { title: 'Tabler', url: ['/icons', 'tabler'] },
      { title: 'Phosphor', url: ['/icons', 'phosphor'] },
      { title: 'Heroicons', url: ['/icons', 'heroicons'] },
      { title: 'Iconoir', url: ['/icons', 'iconoir'] },
      { title: 'Radix', url: ['/icons', 'radix'] },
      { title: 'Bootstrap', url: ['/icons', 'bootstrap'] },
    ],
  },
];
