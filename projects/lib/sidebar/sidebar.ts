/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  isDevMode,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  type IsActiveMatchOptions,
  NavigationEnd,
  Router,
  RouterLink,
  containsTree,
} from '@angular/router';

import { filter, map, startWith } from 'rxjs';

import { readI18nText, useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { WrIcon } from 'ngwr/icon';

import type { WrSidebarActiveOptions, WrSidebarBadgeTone, WrSidebarEntry, WrSidebarGroup } from './types';

function isGroup(entry: WrSidebarEntry): entry is WrSidebarGroup {
  return 'children' in entry;
}

/** How deep the design goes. Deeper entries still render, with a dev-mode warning. */
const MAX_LEVEL = 3;

/**
 * Joins the titles on a path into the key the open state is stored under. A path
 * rather than a title, so two groups called "Overview" in different sections stop
 * opening and closing together; a control character, so no title can forge it.
 */
const KEY_SEPARATOR = '\u001f';

/** `{ exact: true }`, spelled the way `RouterLinkActive` spells it. */
const EXACT_MATCH: IsActiveMatchOptions = {
  paths: 'exact',
  queryParams: 'exact',
  matrixParams: 'ignored',
  fragment: 'ignored',
};

/** `{ exact: false }`, the router's default and this component's. */
const SUBSET_MATCH: IsActiveMatchOptions = {
  paths: 'subset',
  queryParams: 'subset',
  matrixParams: 'ignored',
  fragment: 'ignored',
};

/**
 * A group's own link: the exact path, since the children own the paths below it.
 * A prefix match would mark the group AND its current child as the current page.
 */
const GROUP_MATCH: Partial<IsActiveMatchOptions> = { paths: 'exact', queryParams: 'subset' };

function matchOptions(options: WrSidebarActiveOptions | undefined): Partial<IsActiveMatchOptions> {
  if (!options) return SUBSET_MATCH;
  if ('exact' in options) return options.exact ? EXACT_MATCH : SUBSET_MATCH;
  return options;
}

/** A string that says something, or `null`: an empty title part draws nothing. */
function filled(value: string | null | undefined): string | null {
  return value === '' ? null : (value ?? null);
}

/** The commands an entry links to, or `null` when it renders as text or as a plain toggle. */
function linkOf(entry: WrSidebarEntry): readonly (string | number)[] | null {
  if (isGroup(entry)) return entry.url?.length ? entry.url : null;
  return !entry.disabled && entry.url.length ? entry.url : null;
}

/**
 * Instance counter for the row ids. Deterministic under prerender, unlike
 * `randomId()`, and unique across sidebars: a title-only id collided between two
 * sidebars on one page, and `aria-controls` then pointed at the wrong body.
 */
let sidebarUid = 0;

/**
 * Whether `url` is `route` or something below it. A bare `startsWith` matched a
 * SIBLING whose path merely began the same way, so visiting `/table` expanded the
 * group that owns `/tabs`.
 */
function matchesRoute(url: string, route: string): boolean {
  if (!url.startsWith(route)) return false;
  const rest = url.slice(route.length);
  return rest === '' || rest.startsWith('/') || rest.startsWith('?') || rest.startsWith('#');
}

/** One rendered row, with everything the template needs already decided. */
interface SidebarNode {
  /** The title path: what the open state and `track` key on. */
  readonly key: string;
  /** The group body's id, for `aria-controls`. Unique per sidebar and per position. */
  readonly listId: string;
  /** The subtitle's id, for `aria-describedby`, or `null` with no subtitle. */
  readonly subtitleId: string | null;
  readonly title: string;
  readonly subtitle: string | null;
  readonly icon: string | null;
  readonly badge: { readonly text: string; readonly tone: WrSidebarBadgeTone } | null;
  readonly count: string | null;
  readonly countLabel: string | null;
  /** The hidden separator after the title, the badge and the count, when another piece follows. */
  readonly titleTail: string;
  readonly badgeTail: string;
  readonly countTail: string;
  /** Where the row links to. `null` is plain text for a page, a whole-row toggle for a group. */
  readonly url: readonly (string | number)[] | null;
  readonly children: readonly SidebarNode[] | null;
  readonly open: boolean;
  readonly active: boolean;
  /** A collapsed, visible group with the current page somewhere below it. */
  readonly holdsActive: boolean;
  readonly rowClass: string;
}

/**
 * Navigation drawn from data: pages, and groups of pages that open and close,
 * three levels deep. Every row can carry a subtitle, a word badge and a count.
 *
 * Each title and subtitle takes one line and ends in an ellipsis when it does
 * not fit; the full text stays the accessible name and becomes a tooltip on the
 * part that was cut, measured after render in the browser. A group is a
 * `<button aria-expanded>` that opens its children, or, when it carries a `url`
 * of its own, a link with a separate arrow button beside it. The current page
 * gets `aria-current="page"`, and a collapsed group holding it shows a dot and
 * says so (`sidebar.containsCurrent`).
 *
 * Rows are 32px. Under a coarse pointer (a phone, a tablet) they grow to 44px,
 * and the split arrow to 44 by 44, with no input: the size follows the pointer
 * rather than the container, so the same sidebar in a drawer on a laptop keeps
 * its 32px rows. To force either size, set `--wr-sidebar-row-height`,
 * `--wr-sidebar-row-padding-y` and `--wr-sidebar-chevron-size` on `.wr-sidebar`.
 *
 * The host pads its rows by `--wr-sidebar-padding` (`0.5rem`), so a hovered or
 * current row's tint stays off the edge of whatever holds the nav. Where the
 * container already supplies the inset, set the hook to `0` on `.wr-sidebar`,
 * not on the container: the host declares its own default, which shadows an
 * inherited one.
 *
 * @example
 * ```html
 * <wr-sidebar [entries]="[
 *   { title: 'Dashboard', url: ['/dashboard'] },
 *   {
 *     title: 'Settings',
 *     count: 2,
 *     countLabel: '2 pages',
 *     children: [
 *       { title: 'Profile', url: ['/settings', 'profile'] },
 *       { title: 'Billing', url: ['/settings', 'billing'], badge: { text: 'New', tone: 'primary' } }
 *     ]
 *   }
 * ]" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/sidebar
 */
@Component({
  selector: 'wr-sidebar',
  templateUrl: './sidebar.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-sidebar', role: 'navigation', '[attr.aria-label]': 'resolvedAriaLabel()' },
  imports: [NgTemplateOutlet, RouterLink, WrIcon],
})
export class WrSidebar {
  /**
   * The navigation tree. An entry with `children` is a group, which opens on
   * click and on its own when the current route is below it.
   */
  readonly entries = input<readonly WrSidebarEntry[]>([]);

  /**
   * Accessible name for the navigation landmark. Falls back to `sidebar.label`,
   * then `'Sidebar'`: a page with a sidebar AND a table of contents has two
   * navigation landmarks, and an unnamed one is announced as just "navigation".
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'sidebar.label', 'Sidebar');

  /** Icon for a group that names none. `null` draws no icon. @default null */
  readonly defaultGroupIcon = input<string | null>(null);

  /** Icon for a page that names none. `null` draws no icon. @default null */
  readonly defaultItemIcon = input<string | null>(null);

  /**
   * Open every group above the current route, once per navigation: a group the
   * user closes stays closed until the route changes. @default true
   */
  readonly autoExpand = input(true, { transform: coerceBooleanProperty });

  /**
   * Close the groups the previous navigation opened when the next one leaves
   * them, so a long nav does not keep every visited section expanded. A group
   * the user opened or closed by hand is never closed for them. Needs
   * `autoExpand`. @default false
   */
  readonly autoCollapse = input(false, { transform: coerceBooleanProperty });

  /** Spoken after a collapsed group that holds the current page. */
  protected readonly containsCurrentLabel = readI18nText('sidebar.containsCurrent', 'contains the current page');

  /** The split arrow's name: the group's title is the link beside it. */
  protected readonly subpagesLabel = useI18nFormatter('sidebar.subpages', 'Sub-pages of {{title}}');

  /** Joins a row's title, badge and count into one name: `،` in Arabic, `、` in Japanese. */
  protected readonly separator = readI18nText('sidebar.separator', ',');

  private readonly opened = signal<ReadonlySet<string>>(new Set());

  /** Group keys already seeded from `defaultOpen`, so it seeds once and not again. */
  private readonly seeded = new Set<string>();

  private readonly uid = ++sidebarUid;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  /**
   * The keys of the entries that are the current page, matched the way
   * `RouterLinkActive` matches: an entry's `activeOptions`, a prefix by default.
   * One computation drives `aria-current`, the bar, the ancestors and the dot,
   * so the four cannot disagree.
   */
  private readonly activeKeys = computed<ReadonlySet<string>>(() => {
    const current = this.router.parseUrl(this.currentUrl());
    const out = new Set<string>();
    const visit = (entries: readonly WrSidebarEntry[], parent: string): void => {
      for (const entry of entries) {
        const key = parent ? `${parent}${KEY_SEPARATOR}${entry.title}` : entry.title;
        const url = linkOf(entry);
        if (url) {
          const tree = this.router.createUrlTree([...url], { relativeTo: this.route });
          const options = isGroup(entry) ? GROUP_MATCH : matchOptions(entry.activeOptions);
          if (containsTree(current, tree, options)) out.add(key);
        }
        if (isGroup(entry)) visit(entry.children, key);
      }
    };
    visit(this.entries(), '');
    return out;
  });

  /** The tree as the template draws it. */
  protected readonly nodes = computed<readonly SidebarNode[]>(() => {
    const opened = this.opened();
    const active = this.activeKeys();
    const groupIcon = this.defaultGroupIcon();
    const itemIcon = this.defaultItemIcon();
    const sep = this.separator();

    const build = (
      entries: readonly WrSidebarEntry[],
      level: number,
      parentKey: string,
      parentId: string,
      visible: boolean
    ): { nodes: readonly SidebarNode[]; holds: boolean } => {
      let holds = false;
      const nodes = entries.map((entry, index) => {
        const key = parentKey ? `${parentKey}${KEY_SEPARATOR}${entry.title}` : entry.title;
        const id = `${parentId}-${index}`;
        const group = isGroup(entry);
        const open = group && opened.has(key);
        const sub = group ? build(entry.children, level + 1, key, id, visible && open) : null;
        const isActive = active.has(key);
        const below = sub?.holds ?? false;
        holds ||= isActive || below;

        const holdsActive = group && !open && below && visible;
        const ancestor = group && open && below;
        const url = linkOf(entry);
        const classes = ['wr-sidebar__row', `wr-sidebar__row--level-${Math.min(level, MAX_LEVEL)}`];
        if (group) classes.push('wr-sidebar__row--group');
        if (!group && !url) classes.push('wr-sidebar__row--disabled');
        if (isActive) classes.push('wr-sidebar__row--active');
        if (ancestor) classes.push('wr-sidebar__row--ancestor');
        if (holdsActive) classes.push('wr-sidebar__row--holds-active');

        const raw = entry.count ?? null;
        const count = raw === null ? null : String(raw);
        const subtitle = filled(entry.subtitle);
        const badge = entry.badge?.text ? { text: entry.badge.text, tone: entry.badge.tone ?? 'neutral' } : null;
        return {
          key,
          listId: `${id}-list`,
          subtitleId: subtitle === null ? null : `${id}-subtitle`,
          title: entry.title,
          subtitle,
          icon: filled(entry.icon) ?? filled(group ? groupIcon : itemIcon),
          badge,
          count,
          countLabel: count === null ? null : filled(entry.countLabel),
          titleTail: badge || count !== null || holdsActive ? sep : '',
          badgeTail: badge && (count !== null || holdsActive) ? sep : '',
          countTail: count !== null && holdsActive ? sep : '',
          url,
          children: sub?.nodes ?? null,
          open,
          active: isActive,
          holdsActive,
          rowClass: classes.join(' '),
        } satisfies SidebarNode;
      });
      return { nodes, holds };
    };

    return build(this.entries(), 1, '', `wr-sidebar-${this.uid}`, true).nodes;
  });

  /**
   * Last URL resolved to a set of groups, so a group the user collapsed is not
   * re-opened on the same route. A URL no group holds clears it rather than
   * being recorded: see the effect below.
   */
  private lastAutoUrl: string | null = null;

  /** Groups the last navigation opened, which `autoCollapse` may close again. */
  private autoOpened = new Set<string>();

  private warnedDepth = false;

  constructor() {
    // Seed `defaultOpen` groups, once per group and not once per `entries`
    // emission. Re-seeding meant any later change to the array (a count, a
    // filtered list) re-opened a group the user had deliberately collapsed.
    effect(() => {
      const fresh: string[] = [];
      const visit = (entries: readonly WrSidebarEntry[], parent: string): void => {
        for (const entry of entries) {
          if (!isGroup(entry)) continue;
          const key = parent ? `${parent}${KEY_SEPARATOR}${entry.title}` : entry.title;
          if (entry.defaultOpen && !this.seeded.has(key)) {
            this.seeded.add(key);
            fresh.push(key);
          }
          visit(entry.children, key);
        }
      };
      visit(this.entries(), '');
      if (fresh.length > 0) this.opened.update(prev => new Set([...prev, ...fresh]));
    });

    // Open every group above the current URL, and with `autoCollapse` close
    // the ones the previous navigation opened and this one leaves.
    effect(() => {
      if (!this.autoExpand()) return;
      const url = this.currentUrl();
      if (url === this.lastAutoUrl) return;
      const keys = this.groupsAbove(url, this.entries());
      const collapse = this.autoCollapse();
      untracked(() => {
        // Latch AFTER the lookup, never before it. `entries` often arrives from
        // an HTTP call, so the first run matches nothing, and latching first told
        // the re-run that landed with the real nav that this URL was already
        // handled: a deep link stayed collapsed, with the current link out of
        // the tab order. A URL no group holds CLEARS the latch instead, or the
        // way back to a page whose group was closed by hand (Back, an in-page
        // link) found the latch still set and left that group closed.
        this.lastAutoUrl = keys.length === 0 ? null : url;

        const opened = this.opened();
        const next = new Set(opened);
        if (collapse) {
          for (const key of this.autoOpened) if (!keys.includes(key)) next.delete(key);
        }
        const fresh = keys.filter(key => !opened.has(key));
        for (const key of fresh) next.add(key);
        this.autoOpened = new Set([...fresh, ...[...this.autoOpened].filter(key => keys.includes(key))]);

        if (next.size !== opened.size || [...next].some(key => !opened.has(key))) this.opened.set(next);
      });
    });

    if (isDevMode()) {
      effect(() => {
        const depth = this.depthOf(this.entries());
        if (depth <= MAX_LEVEL || this.warnedDepth) return;
        this.warnedDepth = true;
        // eslint-disable-next-line no-console -- dev-mode validation
        console.warn(
          `[NGWR] <wr-sidebar>: an entry sits at level ${depth}. The sidebar is designed for ` +
            `${MAX_LEVEL} levels; deeper rows still render, indented once more per level.`
        );
      });
    }

    // A tooltip only where the text is actually cut, and on the cut text itself.
    // A `title` on the row would also become the row's description, so a row
    // named "Charts, 18 pages" would read its title a second time.
    afterRenderEffect(() => {
      this.nodes();
      this.markCut();
    });

    // The width can change with nothing re-rendering: a drawer opening, a
    // resized window, a web font arriving after first paint.
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => this.markCut());
        observer.observe(this.host.nativeElement);
        destroyRef.onDestroy(() => observer.disconnect());
      }
      if ('fonts' in document) void document.fonts.ready.then(() => this.markCut());
    });
  }

  protected toggle(key: string): void {
    // Opened or closed by hand, so never closed for the user afterwards.
    this.autoOpened.delete(key);
    this.opened.update(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /** Types the template's recursive context, which `ng-template` leaves as `any`. */
  protected asNodes(value: unknown): readonly SidebarNode[] {
    return value as readonly SidebarNode[];
  }

  protected asNode(value: unknown): SidebarNode {
    return value as SidebarNode;
  }

  /**
   * A `routerLink` command array as the absolute path it navigates to — resolved
   * against the declaring route, the way `[routerLink]` and `activeKeys` resolve
   * it. Joining the segments by hand read a RELATIVE link (`['settings']`) as
   * `/settings`, so on `/admin/settings` the row lit up as the current page while
   * `autoExpand` left the group above it closed.
   */
  private resolve(link: readonly (string | number)[]): string {
    return this.router.serializeUrl(this.router.createUrlTree([...link], { relativeTo: this.route }));
  }

  /** Every group whose subtree links to `url` or above it, by path prefix. */
  private groupsAbove(url: string, entries: readonly WrSidebarEntry[]): string[] {
    const out: string[] = [];
    const visit = (list: readonly WrSidebarEntry[], parent: string): boolean => {
      let hit = false;
      for (const entry of list) {
        const key = parent ? `${parent}${KEY_SEPARATOR}${entry.title}` : entry.title;
        const link = linkOf(entry);
        let self = link !== null && matchesRoute(url, this.resolve(link));
        if (isGroup(entry) && visit(entry.children, key)) {
          out.push(key);
          self = true;
        }
        hit ||= self;
      }
      return hit;
    };
    visit(entries, '');
    return out;
  }

  private depthOf(entries: readonly WrSidebarEntry[], level = 1): number {
    let deepest = entries.length > 0 ? level : level - 1;
    for (const entry of entries) {
      if (isGroup(entry)) deepest = Math.max(deepest, this.depthOf(entry.children, level + 1));
    }
    return deepest;
  }

  private markCut(): void {
    const cuttable = this.host.nativeElement.querySelectorAll<HTMLElement>('.wr-sidebar__title, .wr-sidebar__subtitle');
    for (const el of cuttable) {
      // A pixel of slack: a fractional width rounds the two reads apart. The
      // tooltip is the element's own text, without the hidden comma inside it.
      if (el.scrollWidth > el.clientWidth + 1) {
        el.title = [...el.childNodes]
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent)
          .join('')
          .trim();
      } else {
        el.removeAttribute('title');
      }
    }
  }
}
