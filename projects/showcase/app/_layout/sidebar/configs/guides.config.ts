import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/guides/*` — how to do a job that spans several APIs. Each
 * guide links out to the `/reference` pages for the APIs it uses.
 *
 * Wired via `data: { sidebar: GUIDES_SIDEBAR }` on the `/guides` route
 * (see `routing.ts`), and it is the ONLY sidebar under `/guides`.
 *
 * Tokens, Typography and Translations are multi-page clusters, so they nest
 * here rather than declaring their own `data.sidebar`. The sidebar resolves
 * from the deepest activated route, so a child sidebar would replace this one
 * on entry and cost the reader every other guide. Reference does swap that
 * way on purpose — 100+ components cannot nest — but a five-page cluster can.
 */
export const GUIDES_SIDEBAR: readonly SidebarGroup[] = [
  // Make it look right.
  { title: 'Theming', url: ['/guides', 'theming'] },
  {
    title: 'Design tokens',
    children: [
      { title: 'Colors', url: ['/guides/tokens', 'colors'] },
      { title: 'Sizing', url: ['/guides/tokens', 'sizing'] },
      { title: 'Typography', url: ['/guides/tokens', 'typography'] },
      { title: 'Density', url: ['/guides/tokens', 'density'] },
      { title: 'Motion', url: ['/guides/tokens', 'motion'] },
    ],
  },
  {
    title: 'Typography',
    children: [
      { title: 'Overview', url: ['/guides/typography', 'overview'] },
      { title: 'Headings', url: ['/guides/typography', 'headings'] },
      { title: 'Paragraphs', url: ['/guides/typography', 'paragraphs'] },
      { title: 'Links', url: ['/guides/typography', 'links'] },
      { title: 'Lists', url: ['/guides/typography', 'lists'] },
      { title: 'Code', url: ['/guides/typography', 'code'] },
      // Leaves the guide on purpose — the API table is maintained once, in
      // reference. Headings, Paragraphs and Code each used to carry a partial
      // copy, and they had drifted into contradicting each other.
      { title: 'wrTypography API', url: ['/reference/directives', 'typography'] },
    ],
  },
  { title: 'Grid', url: ['/guides', 'grid'] },
  // Cross-cutting subsystems users typically meet later.
  { title: 'Overlay', url: ['/guides', 'overlay'] },
  { title: 'Mobile & responsive', url: ['/guides', 'mobile'] },
  {
    title: 'Translations (i18n)',
    children: [
      { title: 'Overview', url: ['/guides/translations', 'overview'] },
      { title: 'Setup & loaders', url: ['/guides/translations', 'setup'] },
      { title: 'Usage in templates', url: ['/guides/translations', 'usage'] },
      { title: 'Interpolation', url: ['/guides/translations', 'interpolation'] },
      { title: 'Scopes', url: ['/guides/translations', 'scopes'] },
      // Same hand-off: the WrI18n table lives in reference, and the guide copy
      // that used to sit here had drifted ahead of the "real" one.
      { title: 'WrI18n API', url: ['/reference/services', 'i18n'] },
    ],
  },
  { title: 'Keyboard', url: ['/guides', 'keyboard'] },
];
