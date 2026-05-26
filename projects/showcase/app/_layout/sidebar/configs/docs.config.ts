import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/docs/*` — guides, primitives and supporting APIs that
 * aren't UI components. Attached via `data: { sidebar: DOCS_SIDEBAR }`
 * on the `/docs` route (see `routing.ts`).
 *
 * Pipes / Services / Utils / Directives moved to their own top-level
 * sections and have their own sidebar configs.
 */
export const DOCS_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'Getting started',
    children: [{ title: 'Installation', url: ['/docs', 'getting-started', 'installation'] }],
  },
  { title: 'Color', url: ['/docs', 'core', 'color'] },
  { title: 'Grid', url: ['/docs', 'core', 'grid'] },
  { title: 'Overlay', url: ['/docs', 'core', 'overlay'] },
];
