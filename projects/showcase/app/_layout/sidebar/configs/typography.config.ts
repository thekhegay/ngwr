import type { SidebarGroup } from '../sidebar.types';

/** Sidebar for `/guides/typography/*` — full type-system tour grouped by purpose. */
export const TYPOGRAPHY_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'Overview',
    url: ['/guides/typography', 'overview'],
  },
  {
    title: 'Scale',
    children: [
      { title: 'Headings', url: ['/guides/typography', 'headings'] },
      { title: 'Paragraphs', url: ['/guides/typography', 'paragraphs'] },
      { title: 'Links', url: ['/guides/typography', 'links'] },
      { title: 'Lists', url: ['/guides/typography', 'lists'] },
    ],
  },
  {
    title: 'Inline',
    children: [{ title: 'Code', url: ['/guides/typography', 'code'] }],
  },
  {
    title: 'Reference',
    // Leaves the guide on purpose — the API table is maintained once. Headings,
    // Paragraphs and Code each used to carry a partial copy, and they had
    // drifted into contradicting each other on `tone`'s default.
    children: [
      { title: 'wrTypography API', url: ['/reference/directives', 'typography'] },
      { title: 'Typography tokens', url: ['/guides/tokens', 'typography'] },
    ],
  },
];
