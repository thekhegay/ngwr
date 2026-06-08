import type { SidebarGroup } from '../sidebar.types';

/** Sidebar for `/typography/*` — full type-system tour grouped by purpose. */
export const TYPOGRAPHY_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'Overview',
    url: ['/typography', 'overview'],
  },
  {
    title: 'Scale',
    children: [
      { title: 'Headings & display', url: ['/typography', 'headings'] },
      { title: 'Body text', url: ['/typography', 'text'] },
    ],
  },
  {
    title: 'Inline',
    children: [
      { title: 'Code', url: ['/typography', 'code'] },
      { title: 'Keyboard caps', url: ['/typography', 'keyboard'] },
    ],
  },
];
