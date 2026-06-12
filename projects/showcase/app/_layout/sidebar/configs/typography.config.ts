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
      { title: 'Headings', url: ['/typography', 'headings'] },
      { title: 'Paragraphs', url: ['/typography', 'paragraphs'] },
      { title: 'Lists', url: ['/typography', 'lists'] },
      { title: 'Links', url: ['/typography', 'links'] },
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
