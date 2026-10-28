import type { WrSidebarBadge, WrSidebarEntry, WrSidebarItem } from 'ngwr/sidebar';

import { type DocLinkMark, isOptionalLink, linkMark } from '#core/utils';
import type { SidebarGroup, SidebarLink } from '#types';

/**
 * The page's own version marks (`linkMark()`), one badge each. `New` is the one
 * a reader scans for, so it alone takes the loud tone. `Updated` is neutral:
 * the sidebar has no calmer intent than `primary`, and the word carries the
 * meaning, the tone only repeats it.
 */
const MARK_BADGES: Readonly<Record<DocLinkMark, WrSidebarBadge>> = {
  new: { text: 'New', tone: 'primary' },
  updated: { text: 'Updated', tone: 'neutral' },
};

/** The page documents an opt-in part of ngwr (`isOptionalLink()`). */
const OPTIONAL: WrSidebarBadge = { text: 'Optional', tone: 'neutral' };

/** A planned page: the row is disabled, and the badge says why. */
const SOON: WrSidebarBadge = { text: 'Soon', tone: 'neutral' };

/** One page row. A group whose every page is optional has said so already. */
function page(link: SidebarLink, inOptionalGroup: boolean, current: string | undefined): WrSidebarItem {
  if (link.disabled || !link.url) return { title: link.title, url: [], disabled: true, badge: SOON };

  const mark = linkMark(link.url, current);
  const badge = mark ? MARK_BADGES[mark] : !inOptionalGroup && isOptionalLink(link.url) ? OPTIONAL : null;
  return { title: link.title, url: [link.url], ...(badge ? { badge } : {}) };
}

/**
 * A section's sidebar config as `<wr-sidebar>` entries.
 *
 * Nothing about a mark is stored in a config. `New` and `Updated` are read from
 * the versions the page declares (`#core/generated/since`, judged against
 * `markVersion()`), so they leave on their own when the next feature release
 * declares its first page; `Optional` from `OPTIONAL_ROUTES`, which the page
 * header reads too. A group whose every page is optional carries the badge
 * once, and its pages do not repeat it. A row is given one badge: a version
 * mark wins over `Optional`, since it is the mark a reader scans for.
 *
 * Plain data in and out, with no component around it, so `since.spec.ts` can
 * run the shipped configs through it. `current` is the version `New` and
 * `Updated` are judged against, `markVersion()` when omitted; the spec pins it.
 */
export function sidebarEntries(groups: readonly SidebarGroup[], current?: string): readonly WrSidebarEntry[] {
  return groups.map((group): WrSidebarEntry => {
    const children = group.children ?? [];
    if (children.length === 0) return page(group, false, current);

    const optional = children.every(child => isOptionalLink(child.url));
    const pages = children.filter(child => !child.disabled && child.url).length;
    return {
      title: group.title,
      ...(group.url ? { url: [group.url] } : {}),
      ...(optional ? { badge: OPTIONAL } : {}),
      count: pages,
      countLabel: pages === 1 ? '1 page' : `${pages} pages`,
      children: children.map(child => page(child, optional, current)),
    };
  });
}
