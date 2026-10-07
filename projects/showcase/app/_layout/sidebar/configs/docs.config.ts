import { ROUTES, wrPath, type WrRoute } from '#routes';
import type { SidebarGroup, SidebarLink } from '#types';

const base = [ROUTES.docs];

/** A row takes its title and its link from the route node, so the two cannot disagree. */
const link = (route: WrRoute): SidebarLink => ({ title: route.title, url: wrPath(...base, route) });

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
  link(ROUTES.docs.introduction),
  link(ROUTES.docs.installation),
  link(ROUTES.docs.configuration),
  link(ROUTES.docs.migration),
  link(ROUTES.docs.skills),
  link(ROUTES.docs.mcp),
];
