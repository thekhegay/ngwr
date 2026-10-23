import type { WrSidebarBadge, WrSidebarEntry, WrSidebarItem } from 'ngwr/sidebar';

import { type DocLinkMark, isOptionalLink, linkMark } from '#core/utils';
import type { SidebarGroup, SidebarLink } from '#types';

/**
 * The page's own version marks (`linkMark()`), one badge each. `New` is the one
 * a reader scans for, so it alone takes the loud tone. `Updated` and `Removed`
 * are neutral: the sidebar has no calmer intent than `primary`, and the word
 * carries the meaning, the tone only repeats it.
 */
const MARK_BADGES: Readonly<Record<DocLinkMark, WrSidebarBadge>> = {
  new: { text: 'New', tone: 'primary' },
  updated: { text: 'Updated', tone: 'neutral' },
  removed: { text: 'Removed', tone: 'neutral' },
};

/** The page documents an opt-in part of ngwr (`isOptionalLink()`). */
const OPTIONAL: WrSidebarBadge = { text: 'Optional', tone: 'neutral' };

/** A planned page: the row is disabled, and the badge says why. */
const SOON: WrSidebarBadge = { text: 'Soon', tone: 'neutral' };

/** Whether a row points at a tombstone page (`removed` on its `<ngwr-doc-page>`). */
function isRemoved(link: SidebarLink, current: string | undefined): boolean {
  return !link.disabled && linkMark(link.url, current) === 'removed';
}

/**
 * Live rows first, tombstones after, each run in config order. Decided here
 * rather than by where a config happens to list the row, so a removed page goes
 * to the end of its group the day it is declared and a config never has to know.
 */
function liveFirst<T extends SidebarLink>(links: readonly T[], current: string | undefined): readonly T[] {
  return [...links.filter(l => !isRemoved(l, current)), ...links.filter(l => isRemoved(l, current))];
}

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
 * Nothing about a mark is stored in a config. `New`, `Updated` and `Removed`
 * are read from the versions the page declares (`#core/generated/since`,
 * compared with `NGWR_VERSION`), so the first two leave on their own the
 * release after and `Removed` leaves with the page; `Optional` from
 * `OPTIONAL_ROUTES`, which the page header reads too. A group whose every page
 * is optional carries the badge once, and its pages do not repeat it. A row is
 * given one badge: a version mark wins over `Optional`, since it is the mark a
 * reader scans for.
 *
 * A removed page is a tombstone, not a page of the catalog, so it sorts after
 * the live rows of its group and stays out of the group's count.
 *
 * Plain data in and out, with no component around it, so `since.spec.ts` can
 * run the shipped configs through it. `current` is the release line `New` and
 * `Updated` are judged against, `NGWR_VERSION` when omitted; the spec pins it.
 */
export function sidebarEntries(groups: readonly SidebarGroup[], current?: string): readonly WrSidebarEntry[] {
  return liveFirst(groups, current).map((group): WrSidebarEntry => {
    const children = group.children ?? [];
    if (children.length === 0) return page(group, false, current);

    const optional = children.every(child => isOptionalLink(child.url));
    const pages = children.filter(child => !child.disabled && child.url && !isRemoved(child, current)).length;
    return {
      title: group.title,
      ...(group.url ? { url: [group.url] } : {}),
      ...(optional ? { badge: OPTIONAL } : {}),
      count: pages,
      countLabel: pages === 1 ? '1 page' : `${pages} pages`,
      children: liveFirst(children, current).map(child => page(child, optional, current)),
    };
  });
}
