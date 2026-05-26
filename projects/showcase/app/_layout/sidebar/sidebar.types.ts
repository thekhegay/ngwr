/**
 * One leaf link inside a {@link SidebarGroup}.
 *
 * `url` absent or `disabled: true` renders the link as a non-interactive
 * "coming soon" row — useful for tracking planned pages.
 */
export interface SidebarLink {
  readonly title: string;
  readonly url?: string[];
  readonly disabled?: boolean;
}

/**
 * A top-level entry in the sidebar.
 *
 * - With `children`: renders as an expandable group (toggle + body of links).
 * - With `url`: renders as a single direct-link row (no expand toggle).
 *   Useful for one-page sections like Color or Directives.
 */
export interface SidebarGroup {
  readonly title: string;
  readonly url?: string[];
  readonly children?: readonly SidebarLink[];
}
