import { ROUTES, wrLink } from '#routes';
import type { SidebarGroup } from '#types';

/**
 * Sidebar for `/docs/*` — everything about getting the library INTO an app,
 * and nothing about using a given subsystem (that is `/guides`).
 *
 * Wired via `data: { sidebar: DOCS_SIDEBAR }` on the `/docs` route
 * (see `routing.ts`).
 */
// Ordered by the path a new user walks: read what it is, install it, wire it,
// then come back for a major. Skills and the MCP server sit last because they
// are read by an agent rather than by the person installing.
export const DOCS_SIDEBAR: readonly SidebarGroup[] = [
  wrLink(ROUTES.docs, ROUTES.docs.introduction),
  wrLink(ROUTES.docs, ROUTES.docs.installation),
  wrLink(ROUTES.docs, ROUTES.docs.configuration),
  wrLink(ROUTES.docs, ROUTES.docs.migration),
  wrLink(ROUTES.docs, ROUTES.docs.skills),
  wrLink(ROUTES.docs, ROUTES.docs.mcp),
];
