import { Component, ElementRef, booleanAttribute, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';

import { filter, map, startWith } from 'rxjs';

import { WrSidebar } from 'ngwr/sidebar';

import { sidebarEntries } from './entries';

import type { SidebarGroup } from '#types';

/**
 * Section-aware sidebar, drawn by the library's own `<wr-sidebar>`. The active
 * route declares its nav via `data: { sidebar: <readonly SidebarGroup[]> }`
 * (see `routing.ts`); we walk the activated-route tree on every navigation and
 * render the deepest match. Sections inherit unless they declare their own,
 * which is how `/reference` works: it attaches one config at the section root
 * and every cluster under it renders the same nav.
 *
 * `<wr-sidebar>` does the rest: it marks the current page, opens every group
 * above it on each navigation, and leaves a group the reader closed by hand
 * closed until the route changes. `autoCollapse` closes the group the previous
 * navigation opened: the reference nav is fifteen groups long, and an additive
 * set left the reader scrolling past every section they had visited. A group
 * the reader opened by hand stays open.
 */
@Component({
  selector: 'ngwr-sidebar',
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  imports: [WrSidebar],
  host: { '[class.ngwr-sidebar--touch]': 'touch()' },
})
export class Sidebar {
  /**
   * 44px rows and a 44px split arrow, whatever the pointer. The layout sets it
   * on the copy inside the mobile drawer, which the design draws at touch size;
   * `<wr-sidebar>` on its own only grows under `pointer: coarse`.
   */
  readonly touch = input(false, { transform: booleanAttribute });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  /**
   * The deepest `data.sidebar`, re-read on every navigation. The SAME array
   * comes back while the reader stays in one section, so `entries` below is
   * rebuilt only when the section changes.
   */
  private readonly config = computed<readonly SidebarGroup[]>(() => {
    this.currentUrl();
    return this.deepestData<readonly SidebarGroup[]>('sidebar') ?? [];
  });

  protected readonly entries = computed(() => sidebarEntries(this.config()));

  /**
   * Scroll this column so the current row is in view, when it is not already.
   * Called by the layout once the drawer has opened: a drawer that opens on the
   * top of a fifteen-group list leaves the reader hunting for where they are.
   * A collapsed group that holds the current page stands in for it.
   */
  revealCurrent(): void {
    const box = this.host.nativeElement;
    const row = box.querySelector<HTMLElement>('.wr-sidebar__row--active, .wr-sidebar__row--holds-active');
    if (!row) return;

    const outer = box.getBoundingClientRect();
    const inner = row.getBoundingClientRect();
    if (inner.top >= outer.top && inner.bottom <= outer.bottom) return;
    box.scrollTop += inner.top - outer.top - (box.clientHeight - inner.height) / 2;
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
}
