import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/start/*` — everything about getting the library INTO an app,
 * and nothing about using a given subsystem (that is `/guides`).
 *
 * Wired via `data: { sidebar: START_SIDEBAR }` on the `/start` route
 * (see `routing.ts`).
 */
// Ordered by the path a new user actually walks: install the package, wire the
// providers, then learn the CLI shortcut that automates both. Migration sits
// last — it is the page you come back to, not the one you start on.
export const START_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'Installation', url: ['/start', 'installation'] },
  { title: 'Configuration', url: ['/start', 'configuration'] },
  { title: 'Schematics', url: ['/start', 'schematics'] },
  { title: 'Migration guide', url: ['/start', 'migration'] },
];
