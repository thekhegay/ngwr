/**
 * One leaf link inside a {@link SidebarGroup}.
 *
 * Built from a {@link WrRoute} by each config's own `link()` helper, which is
 * what stops the nav and the route tree disagreeing: the title and the path
 * come from the same node. A node carries only its own segment, so the helper
 * is also the one place its cluster prefix is written.
 */
export interface SidebarLink {
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
