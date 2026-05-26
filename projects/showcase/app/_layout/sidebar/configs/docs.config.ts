import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/docs/*` — guides, primitives and supporting APIs that
 * aren't UI components. Attached via `data: { sidebar: DOCS_SIDEBAR }`
 * on the `/docs` route (see `routing.ts`).
 */
export const DOCS_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'Getting started',
    children: [{ title: 'Installation', url: ['/docs', 'getting-started', 'installation'] }],
  },
  { title: 'Color', url: ['/docs', 'core', 'color'] },
  { title: 'Directives', url: ['/docs', 'core', 'directives'] },
  { title: 'Grid', url: ['/docs', 'core', 'grid'] },
  { title: 'Overlay', url: ['/docs', 'core', 'overlay'] },
  {
    title: 'Pipes',
    children: [
      { title: 'wrNumber', url: ['/docs', 'core', 'pipes', 'wr-number'] },
      { title: 'wrBytes', url: ['/docs', 'core', 'pipes', 'wr-bytes'] },
      { title: 'wrDate', url: ['/docs', 'core', 'pipes', 'wr-date'] },
      { title: 'wrTruncate', url: ['/docs', 'core', 'pipes', 'wr-truncate'] },
      { title: 'wrRange', url: ['/docs', 'core', 'pipes', 'range'] },
    ],
  },
  {
    title: 'Services',
    children: [
      { title: 'WrTheme', url: ['/docs', 'core', 'services', 'theme'] },
      { title: 'WrScroll', url: ['/docs', 'core', 'services', 'scroll'] },
      { title: 'WrHotkey', url: ['/docs', 'core', 'services', 'hotkey'] },
      { title: 'WrMedia', url: ['/docs', 'core', 'services', 'media'] },
      { title: 'WrPlatform', url: ['/docs', 'core', 'services', 'platform'] },
      { title: 'WrMeta', url: ['/docs', 'core', 'services', 'meta'] },
    ],
  },
  {
    title: 'Utils',
    children: [
      { title: 'resolveCssSize', url: ['/docs', 'core', 'utils', 'css-size'] },
      { title: 'randomId', url: ['/docs', 'core', 'utils', 'random-id'] },
      { title: 'Type guards', url: ['/docs', 'core', 'utils', 'guards'] },
      { title: 'Keyboard', url: ['/docs', 'core', 'utils', 'keys'] },
      { title: 'Misc', url: ['/docs', 'core', 'utils', 'misc'] },
    ],
  },
];
