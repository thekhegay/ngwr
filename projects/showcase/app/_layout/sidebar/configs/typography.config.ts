import type { SidebarGroup } from '../sidebar.types';

/** Sidebar for `/typography/*` — full type-system tour grouped by purpose. */
export const TYPOGRAPHY_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'Overview',
    url: ['/typography', 'overview'],
  },
  {
    title: 'Inline',
    children: [
      { title: 'Code', url: ['/typography', 'code'] },
      { title: 'Keyboard caps', url: ['/typography', 'keyboard'] },
    ],
  },
  {
    title: 'Scale',
    children: [
      { title: 'Headings', url: ['/typography', 'headings'] },
      { title: 'Links', url: ['/typography', 'links'] },
      { title: 'Lists', url: ['/typography', 'lists'] },
      { title: 'Paragraphs', url: ['/typography', 'paragraphs'] },
    ],
  },
];
