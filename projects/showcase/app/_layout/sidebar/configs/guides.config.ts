import { ROUTES, wrLink } from '#routes';
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
  wrLink(ROUTES.guides, ROUTES.guides.theming),
  {
    title: 'Design tokens',
    children: [
      wrLink(ROUTES.guides, ROUTES.guides.tokens, ROUTES.guides.tokens.colors),
      wrLink(ROUTES.guides, ROUTES.guides.tokens, ROUTES.guides.tokens.sizing),
      wrLink(ROUTES.guides, ROUTES.guides.tokens, ROUTES.guides.tokens.typography),
      wrLink(ROUTES.guides, ROUTES.guides.tokens, ROUTES.guides.tokens.density),
      wrLink(ROUTES.guides, ROUTES.guides.tokens, ROUTES.guides.tokens.motion),
      wrLink(ROUTES.guides, ROUTES.guides.tokens, ROUTES.guides.tokens.builder),
    ],
  },
  {
    title: 'Typography',
    children: [
      wrLink(ROUTES.guides, ROUTES.guides.typography, ROUTES.guides.typography.overview),
      wrLink(ROUTES.guides, ROUTES.guides.typography, ROUTES.guides.typography.styles),
      wrLink(ROUTES.guides, ROUTES.guides.typography, ROUTES.guides.typography.headings),
      wrLink(ROUTES.guides, ROUTES.guides.typography, ROUTES.guides.typography.paragraphs),
      wrLink(ROUTES.guides, ROUTES.guides.typography, ROUTES.guides.typography.links),
      wrLink(ROUTES.guides, ROUTES.guides.typography, ROUTES.guides.typography.lists),
      wrLink(ROUTES.guides, ROUTES.guides.typography, ROUTES.guides.typography.code),
      // Leaves the guide on purpose — the API table is maintained once, in
      // reference. Headings, Paragraphs and Code each used to carry a partial
      // copy, and they had drifted into contradicting each other.
      wrLink(ROUTES.reference, ROUTES.reference.directives, ROUTES.reference.directives.typography),
    ],
  },
  wrLink(ROUTES.guides, ROUTES.guides.grid),
  // Cross-cutting subsystems users typically meet later.
  wrLink(ROUTES.guides, ROUTES.guides.forms),
  wrLink(ROUTES.guides, ROUTES.guides.overlay),
  wrLink(ROUTES.guides, ROUTES.guides.mobile),
  {
    title: 'Translations (i18n)',
    children: [
      wrLink(ROUTES.guides, ROUTES.guides.translations, ROUTES.guides.translations.overview),
      wrLink(ROUTES.guides, ROUTES.guides.translations, ROUTES.guides.translations.setup),
      wrLink(ROUTES.guides, ROUTES.guides.translations, ROUTES.guides.translations.usage),
      wrLink(ROUTES.guides, ROUTES.guides.translations, ROUTES.guides.translations.interpolation),
      wrLink(ROUTES.guides, ROUTES.guides.translations, ROUTES.guides.translations.scopes),
      // Same hand-off: the WrI18n table lives in reference, and the guide copy
      // that used to sit here had drifted ahead of the "real" one.
      wrLink(ROUTES.reference, ROUTES.reference.services, ROUTES.reference.services.i18n),
    ],
  },
  wrLink(ROUTES.guides, ROUTES.guides.keyboard),
  wrLink(ROUTES.guides, ROUTES.guides.ssr),
  wrLink(ROUTES.guides, ROUTES.guides.testing),
  wrLink(ROUTES.guides, ROUTES.guides.csp),
];
