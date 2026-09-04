import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/start/*` — everything about getting the library INTO an app,
 * and nothing about using a given subsystem (that is `/guides`).
 *
 * Wired via `data: { sidebar: START_SIDEBAR }` on the `/start` route
 * (see `routing.ts`).
 */
// Ordered by the path a new user actually walks: decide, try, trust the code,
// trust the release line, then install the package, wire the providers, and
// learn the CLI shortcut that automates both. `Versioning & support` sits with
// the pre-install group on purpose — semver, the support window and the Angular
// range are all questions asked before `pnpm add`, not after. Migration sits
// last: it is the page you come back to, not the one you start on.
export const START_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'Why ngwr', url: ['/start', 'comparison'] },
  { title: 'Playground', url: ['/start', 'playground'] },
  { title: 'Quality', url: ['/start', 'quality'] },
  { title: 'Versioning & support', url: ['/start', 'versioning'] },
  { title: 'Installation', url: ['/start', 'installation'] },
  { title: 'Configuration', url: ['/start', 'configuration'] },
  { title: 'Schematics', url: ['/start', 'schematics'] },
  { title: 'Migration guide', url: ['/start', 'migration'] },
];
