import type { SidebarGroup } from '../sidebar.types';

/**
 * The cluster switcher every `/reference/*` sidebar opens with.
 *
 * Reference is seven separate clusters — components, directives, pipes,
 * services, utils, validators, interfaces — and each one used to ship a sidebar
 * that listed only its own pages. "Reference" in the header lands on
 * `/reference/components`, whose sidebar is eighty-four links every one of
 * which points back into components, so from inside the section there was no
 * way to reach the other six at all. The only route to `WrStorage` in the whole
 * UI was a link in the FOOTER; a reader who never scrolled that far concluded
 * the services pages did not exist.
 *
 * One shared constant rather than seven copies: a cluster added to the site and
 * not to this list would be just as unreachable as the six were.
 */
const REFERENCE_CLUSTERS: SidebarGroup = {
  title: 'Reference',
  children: [
    { title: 'Components', url: ['/reference/components'] },
    { title: 'Directives', url: ['/reference/directives'] },
    { title: 'Pipes', url: ['/reference/pipes'] },
    { title: 'Services', url: ['/reference/services'] },
    { title: 'Utils', url: ['/reference/utils'] },
    { title: 'Validators', url: ['/reference/validators'] },
    { title: 'Interfaces', url: ['/reference/interfaces'] },
  ],
};

/**
 * Put the switcher in front of a cluster's own rows.
 *
 * It is a normal expandable group, so it starts collapsed and costs one row —
 * except that the sidebar auto-expands whichever group owns the active URL, and
 * every `/reference/...` URL starts with one of these seven prefixes. That
 * would leave it permanently open on top of the real navigation, so
 * `withReferenceClusters` is paired with the sidebar's `switcherTitle` guard
 * rather than left to the generic behaviour.
 */
const withReferenceClusters = (groups: readonly SidebarGroup[]): readonly SidebarGroup[] => [
  REFERENCE_CLUSTERS,
  ...groups,
];

export { REFERENCE_CLUSTERS, withReferenceClusters };
