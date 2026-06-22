import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/getting-started/*` — onboarding plus framework primer
 * pages (color tokens, grid utilities, overlay primer) and reference
 * sections (configuration, schematics).
 *
 * Wired via `data: { sidebar: GETTING_STARTED_SIDEBAR }` on the
 * `/getting-started` route (see `routing.ts`).
 */
// Ordered by the path a new user follows: install the package, wire the
// providers, learn the CLI shortcut that automates both, then dig into
// the visual / advanced subsystems.
export const GETTING_STARTED_SIDEBAR: readonly SidebarGroup[] = [
  // 1. Get the package in your project.
  { title: 'Installation', url: ['/getting-started', 'installation'] },
  // 2. Understand what to wire at bootstrap.
  { title: 'Configuration', url: ['/getting-started', 'configuration'] },
  // 3. Tooling that automates steps 1–2 + day-to-day.
  { title: 'Schematics', url: ['/getting-started', 'schematics'] },
  // 4. Make it look right.
  { title: 'Theming', url: ['/getting-started', 'theming'] },
  { title: 'Color', url: ['/getting-started', 'color'] },
  { title: 'Grid', url: ['/getting-started', 'grid'] },
  // 5. Cross-cutting subsystems users typically meet later.
  { title: 'Overlay', url: ['/getting-started', 'overlay'] },
  { title: 'Mobile & responsive', url: ['/getting-started', 'mobile'] },
  { title: 'Internationalization (i18n)', url: ['/getting-started', 'i18n'] },
];
