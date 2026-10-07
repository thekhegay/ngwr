import type { WrRoute } from '../constants/routes';

/**
 * One leaf link inside a {@link SidebarGroup}.
 *
 * A row is normally a {@link WrRoute} straight out of `ROUTES` — the node
 * already carries both the title and the URL, which is what stops the nav and
 * the route tree disagreeing. The optional fields are for the two cases a node
 * cannot express: a row shown under a different name than the page's own
 * title, and a planned page with no route yet.
 */
export interface SidebarLink extends Partial<WrRoute> {
  readonly title: string;
  readonly url?: string;
  /** Renders as a non-interactive "coming soon" row. */
  readonly disabled?: boolean;
}

/**
 * A top-level entry in the sidebar.
 *
 * - With `children`: an expandable group (toggle + body of links).
 * - With `url`: a single direct-link row, no toggle.
 */
export interface SidebarGroup {
  readonly title: string;
  readonly url?: string;
  readonly children?: readonly SidebarLink[];
}
