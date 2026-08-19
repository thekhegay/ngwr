/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';

import { filter, map, startWith } from 'rxjs';

import { useI18nText } from 'ngwr/i18n';
import { WrIcon } from 'ngwr/icon';

import type { WrSidebarEntry, WrSidebarGroup, WrSidebarItem } from './interfaces';

function isGroup(entry: WrSidebarEntry): entry is WrSidebarGroup {
  return 'children' in entry;
}

/**
 * Instance counter for the group-body ids. Deterministic under prerender, unlike
 * `randomId()`, and unique across sidebars — a title-only id collided between two
 * sidebars on one page, and `aria-controls` then pointed at the wrong body.
 */
let sidebarUid = 0;

/**
 * A `routerLink` segment array as an absolute path.
 *
 * The documented form carries the leading slash on the FIRST segment
 * (`['/settings', 'profile']`), and prefixing another one produced
 * `//settings/profile` — a path no URL ever equals, which is why auto-expand
 * never fired for anyone following the example. Both forms normalise here.
 */
function routePath(segments: readonly (string | number)[]): string {
  return `/${segments.join('/')}`.replace(/\/{2,}/g, '/');
}

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

/**
 * Data-driven sidebar nav. Pass `[entries]` — either flat
 * `WrSidebarItem`s (direct links) or `WrSidebarGroup`s (expand to reveal
 * child items). Active route auto-expands its containing group.
 *
 * @example
 * ```html
 * <wr-sidebar [entries]="[
 *   { title: 'Dashboard', icon: 'home', url: ['/dashboard'] },
 *   {
 *     title: 'Settings',
 *     icon: 'cog',
 *     children: [
 *       { title: 'Profile', url: ['/settings', 'profile'] },
 *       { title: 'Billing', url: ['/settings', 'billing'] }
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
  imports: [RouterLink, RouterLinkActive, WrIcon],
})
export class WrSidebar {
  readonly entries = input<readonly WrSidebarEntry[]>([]);

  /**
   * Accessible name for the navigation landmark. Falls back to `sidebar.label`,
   * then `'Sidebar'` — a page with a sidebar AND a table of contents has two
   * navigation landmarks, and an unnamed one is announced as just "navigation".
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'sidebar.label', 'Sidebar');

  /** Default icon for entries without one. @default 'folder' */
  readonly defaultGroupIcon = input<string>('folder');

  /** Default icon for items without one. @default 'caret-forward' */
  readonly defaultItemIcon = input<string>('caret-forward');

  /** Auto-expand the group containing the active route. @default true */
  readonly autoExpand = input(true, { transform: coerceBooleanProperty });

  protected readonly isGroup = isGroup;

  private readonly opened = signal<ReadonlySet<string>>(new Set());

  /** Group titles already seeded from `defaultOpen`, so it seeds once and not again. */
  private readonly seeded = new Set<string>();

  private readonly uid = ++sidebarUid;

  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  /**
   * Last URL we resolved to a group — prevents re-opening one the user collapsed.
   * A URL no entry claims is deliberately NOT recorded: see the effect below.
   */
  private lastAutoUrl: string | null = null;

  constructor() {
    // Seed `defaultOpen` groups — once per group, not once per `entries` emission.
    // Re-seeding meant any later change to the array (a badge count, a filtered
    // list) re-opened a group the user had deliberately collapsed.
    effect(() => {
      const fresh: string[] = [];
      for (const entry of this.entries()) {
        if (isGroup(entry) && entry.defaultOpen && !this.seeded.has(entry.title)) {
          this.seeded.add(entry.title);
          fresh.push(entry.title);
        }
      }
      if (fresh.length > 0) {
        this.opened.update(prev => new Set([...prev, ...fresh]));
      }
    });

    // Auto-expand the group containing the current URL.
    effect(() => {
      if (!this.autoExpand()) return;
      const url = this.currentUrl();
      if (url === this.lastAutoUrl) return;
      // Latch AFTER the lookup, never before it. `entries` often arrives from an
      // HTTP call, so the first run matches nothing — and latching first told the
      // re-run that landed with the real nav that this URL was already handled.
      // A deep link into a `defaultOpen: false` group then stayed collapsed, with
      // the active link out of the tab order, until the user navigated away and
      // back. Only a run that found a group has actually handled the URL; the
      // user-collapse latch is unaffected, since that run is also the one that
      // records it.
      const match = this.findGroupForUrl(url);
      if (!match) return;
      this.lastAutoUrl = url;
      if (this.opened().has(match)) return;
      this.opened.update(prev => {
        const next = new Set(prev);
        next.add(match);
        return next;
      });
    });
  }

  protected isOpen(title: string): boolean {
    return this.opened().has(title);
  }

  /**
   * Stable id for the group body, referenced by the toggle's `aria-controls`.
   * Scoped to this sidebar and stripped of anything that is not id-safe: a title
   * like `Data & charts` used to produce `wr-sidebar-group-data-&-charts`, which
   * no selector can address.
   */
  protected groupBodyId(title: string): string {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `wr-sidebar-${this.uid}-group-${slug}`;
  }

  protected toggleGroup(title: string): void {
    this.opened.update(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  protected asItem(entry: WrSidebarEntry): WrSidebarItem {
    return entry as WrSidebarItem;
  }

  protected asGroup(entry: WrSidebarEntry): WrSidebarGroup {
    return entry as WrSidebarGroup;
  }

  private findGroupForUrl(url: string): string | null {
    for (const entry of this.entries()) {
      if (!isGroup(entry)) continue;
      const hit = entry.children.some(child => matchesRoute(url, routePath(child.url)));
      if (hit) return entry.title;
    }
    return null;
  }
}
