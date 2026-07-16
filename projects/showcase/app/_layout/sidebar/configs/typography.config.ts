import type { SidebarGroup } from '../sidebar.types';

/** Sidebar for `/guides/typography/*` — full type-system tour grouped by purpose. */
export const TYPOGRAPHY_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'Overview',
    url: ['/guides/typography', 'overview'],
  },
  {
    title: 'Inline',
    children: [
      { title: 'Code', url: ['/guides/typography', 'code'] },
      { title: 'Keyboard caps', url: ['/guides/typography', 'keyboard'] },
    ],
  },
  {
    title: 'Scale',
    children: [
      { title: 'Headings', url: ['/guides/typography', 'headings'] },
      { title: 'Links', url: ['/guides/typography', 'links'] },
      { title: 'Lists', url: ['/guides/typography', 'lists'] },
      { title: 'Paragraphs', url: ['/guides/typography', 'paragraphs'] },
    ],
  },
];
