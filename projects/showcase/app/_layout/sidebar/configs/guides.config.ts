import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/guides/*` — how to do a job that spans several APIs. Each
 * guide links out to the `/reference` pages for the APIs it uses.
 *
 * Wired via `data: { sidebar: GUIDES_SIDEBAR }` on the `/guides` route
 * (see `routing.ts`).
 *
 * `Tokens`, `Translations` and `Typography` arrived as whole top-level
 * sections and still carry their own child sidebars, so entering one swaps
 * this nav out. Folding them into the guides they belong to (Theming / i18n)
 * is the next pass — until then they are listed here as their own entries.
 */
export const GUIDES_SIDEBAR: readonly SidebarGroup[] = [
  // Make it look right.
  { title: 'Theming', url: ['/guides', 'theming'] },
  { title: 'Color', url: ['/guides', 'color'] },
  { title: 'Design tokens', url: ['/guides', 'tokens'] },
  { title: 'Typography', url: ['/guides', 'typography'] },
  { title: 'Grid', url: ['/guides', 'grid'] },
  // Cross-cutting subsystems users typically meet later.
  { title: 'Overlay', url: ['/guides', 'overlay'] },
  { title: 'Mobile & responsive', url: ['/guides', 'mobile'] },
  { title: 'Translations (i18n)', url: ['/guides', 'translations'] },
  { title: 'Keyboard', url: ['/guides', 'keyboard'] },
];
