import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/getting-started/*` — onboarding plus framework basics
 * (color tokens, grid utilities, overlay primer). Components, directives,
 * pipes, services and utils each have their own top-level section and
 * their own sidebar config.
 *
 * Wired via `data: { sidebar: GETTING_STARTED_SIDEBAR }` on the
 * `/getting-started` route (see `routing.ts`).
 */
export const GETTING_STARTED_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'Installation', url: ['/getting-started', 'installation'] },
  { title: 'Color', url: ['/getting-started', 'color'] },
  { title: 'Grid', url: ['/getting-started', 'grid'] },
  { title: 'Overlay', url: ['/getting-started', 'overlay'] },
];
