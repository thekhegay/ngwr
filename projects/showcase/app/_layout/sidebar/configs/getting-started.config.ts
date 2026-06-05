import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/getting-started/*` — onboarding plus framework primer
 * pages (color tokens, grid utilities, overlay primer) and reference
 * sections (configuration, schematics).
 *
 * Wired via `data: { sidebar: GETTING_STARTED_SIDEBAR }` on the
 * `/getting-started` route (see `routing.ts`).
 */
export const GETTING_STARTED_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'Installation', url: ['/getting-started', 'installation'] },
  { title: 'Theming', url: ['/getting-started', 'theming'] },
  { title: 'Color', url: ['/getting-started', 'color'] },
  { title: 'Grid', url: ['/getting-started', 'grid'] },
  { title: 'Overlay', url: ['/getting-started', 'overlay'] },
  { title: 'Internationalization (i18n)', url: ['/getting-started', 'i18n'] },
  { title: 'Configuration', url: ['/getting-started', 'configuration'] },
  { title: 'Schematics', url: ['/getting-started', 'schematics'] },
];
