import type { SidebarGroup } from '../sidebar.types';

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
  { title: 'Introduction', url: ['/docs', 'introduction'] },
  { title: 'Installation', url: ['/docs', 'installation'] },
  { title: 'Configuration', url: ['/docs', 'configuration'] },
  { title: 'Migration', url: ['/docs', 'migration'] },
  { title: 'Skills', url: ['/docs', 'skills'] },
  { title: 'MCP Server', url: ['/docs', 'mcp-server'] },
];
