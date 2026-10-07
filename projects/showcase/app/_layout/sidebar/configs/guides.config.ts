import { ROUTES } from '#routes';
import type { SidebarGroup } from '#types';

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
  ROUTES.guides.theming,
  {
    title: 'Design tokens',
    children: [
      ROUTES.guides.tokens.colors,
      ROUTES.guides.tokens.sizing,
      ROUTES.guides.tokens.typography,
      ROUTES.guides.tokens.density,
      ROUTES.guides.tokens.motion,
      ROUTES.guides.tokens.builder,
    ],
  },
  {
    title: 'Typography',
    children: [
      ROUTES.guides.typography.overview,
      ROUTES.guides.typography.headings,
      ROUTES.guides.typography.paragraphs,
      ROUTES.guides.typography.links,
      ROUTES.guides.typography.lists,
      ROUTES.guides.typography.code,
      // Leaves the guide on purpose — the API table is maintained once, in
      // reference. Headings, Paragraphs and Code each used to carry a partial
      // copy, and they had drifted into contradicting each other.
      ROUTES.reference.directives.typography,
    ],
  },
  ROUTES.guides.grid,
  // Cross-cutting subsystems users typically meet later.
  ROUTES.guides.forms,
  ROUTES.guides.overlay,
  ROUTES.guides.mobile,
  {
    title: 'Translations (i18n)',
    children: [
      ROUTES.guides.translations.overview,
      ROUTES.guides.translations.setup,
      ROUTES.guides.translations.usage,
      ROUTES.guides.translations.interpolation,
      ROUTES.guides.translations.scopes,
      // Same hand-off: the WrI18n table lives in reference, and the guide copy
      // that used to sit here had drifted ahead of the "real" one.
      ROUTES.reference.services.i18n,
    ],
  },
  ROUTES.guides.keyboard,
  ROUTES.guides.ssr,
  ROUTES.guides.testing,
  ROUTES.guides.csp,
];
