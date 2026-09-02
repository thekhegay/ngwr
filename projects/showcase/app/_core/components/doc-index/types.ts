import type { SidebarGroup, SidebarLink } from '../../../_layout/sidebar/sidebar.types';

/**
 * What a `DocIndexComponent` route carries in `data.index`.
 *
 * `groups` is the section's own sidebar config — the SAME array the nav
 * renders, not a second list beside it. A catalog page that keeps its own
 * copy of the catalog is a copy that goes stale, and this one cannot: a page
 * added to the sidebar appears here, and a page missing from the sidebar is
 * missing from both, which is a defect with one cause instead of two.
 */
export interface DocIndexData {
  /** H1 and document title. */
  readonly title: string;
  /** Lede under the title, also the meta description. */
  readonly description: string;
  /** Page-scoped keywords, appended to the global set. */
  readonly keywords?: readonly string[];
  /**
   * Nav groups to draw from. Narrowed to the links that sit under the route's
   * own path, so one config serves the section root and every cluster in it.
   */
  readonly groups: readonly SidebarGroup[];
}

/** One rendered group: a heading and the links under it. */
export interface DocIndexSection {
  readonly title: string;
  readonly links: readonly SidebarLink[];
}
