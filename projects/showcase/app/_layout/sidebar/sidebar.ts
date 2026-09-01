import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';

import { filter, map, startWith } from 'rxjs';

import { WrIcon } from 'ngwr/icon';

import type { SidebarGroup } from './sidebar.types';

/**
 * Section-aware sidebar. The active route declares its nav via
 * `data: { sidebar: <readonly SidebarGroup[]> }` (see `routing.ts`);
 * we walk the activated-route tree on every navigation and render the
 * deepest match. Sections inherit unless they declare their own, which is
 * how `/reference` works: it attaches one config at the section root and
 * every cluster under it renders the same nav.
 */
@Component({
  selector: 'ngwr-sidebar',
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  imports: [RouterLink, RouterLinkActive, WrIcon],
})
export class Sidebar {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Latest URL — used both to look up the active sidebar config and to auto-expand the right group. */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  /** Resolve `data.sidebar` from the deepest activated route on every navigation. */
  protected readonly groups = computed<readonly SidebarGroup[]>(() => {
    // Re-evaluate on URL change.
    this.currentUrl();
    return this.deepestData<readonly SidebarGroup[]>('sidebar') ?? [];
  });

  /** Titles of currently expanded groups. All collapsed by default. */
  private readonly opened = signal<ReadonlySet<string>>(new Set());

  /** Last URL we auto-expanded for — prevents re-opening a group the user just collapsed. */
  private lastAutoUrl: string | null = null;

  /** The group the last navigation opened, so the next one can close it again. */
  private autoOpened: string | null = null;

  constructor() {
    // When the route changes, auto-expand the group that owns the active link
    // and collapse the one the previous navigation opened — the reference nav
    // is fifteen expandable groups long, and an additive set would leave the
    // reader scrolling past every section they had visited to reach the
    // current one.
    // A group the reader opened BY HAND survives: only our own last pick is
    // withdrawn. Re-entering the same URL is a no-op, so collapsing the active
    // group sticks until navigation.
    effect(() => {
      const url = this.currentUrl();
      if (url === this.lastAutoUrl) return;
      this.lastAutoUrl = url;

      const match = this.findGroupForUrl(url);
      if (match === this.autoOpened && (!match || this.opened().has(match))) return;

      const next = new Set(this.opened());
      if (this.autoOpened && this.autoOpened !== match) next.delete(this.autoOpened);
      if (match) next.add(match);
      this.autoOpened = match;
      this.opened.set(next);
    });
  }

  protected isOpen(title: string): boolean {
    return this.opened().has(title);
  }

  protected toggleGroup(title: string): void {
    const next = new Set(this.opened());
    if (next.has(title)) next.delete(title);
    else next.add(title);
    this.opened.set(next);
  }

  /** Walks `route.root → firstChild → …` and returns the deepest `data[key]` value. */
  private deepestData<T>(key: string): T | undefined {
    let r = this.route.root;
    let value: T | undefined;

    while (r) {
      const v: T | undefined = (r.snapshot.data as Record<string, T> | undefined)?.[key];
      if (v !== undefined) value = v;
      if (!r.firstChild) break;
      r = r.firstChild;
    }
    return value;
  }

  /**
   * The title of the group owning `url`, or `null` for a direct-link row (which
   * has no body to open) and for a URL this sidebar does not list.
   *
   * Every row here is a real page, so a prefix match resolves to one group. It
   * did not always: the reference sidebars used to open with a switcher whose
   * seven links were the `/reference/<cluster>` PREFIXES, matching every URL in
   * the section and, sitting first, winning the auto-expand from whichever
   * group owned the page. The clusters are top-level rows now, so the switcher
   * is gone and the guard that had to skip it went with it.
   */
  private findGroupForUrl(url: string): string | null {
    for (const group of this.groups()) {
      if (group.children?.some(l => l.url && url.startsWith(l.url.join('/')))) {
        return group.title;
      }
    }
    return null;
  }
}
