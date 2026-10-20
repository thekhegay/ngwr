import { Component, Injector, afterNextRender, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';

import { filter } from 'rxjs';

import { Menu } from 'lucide';
import { WrDrawer } from 'ngwr/drawer';
import { lucideIcons, provideWrIcons, WrIcon } from 'ngwr/icon';

import { Footer } from './footer/footer';
import { Sidebar } from './sidebar/sidebar';

@Component({
  selector: 'ngwr-layout',
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
  imports: [RouterOutlet, Sidebar, Footer, WrDrawer, WrIcon],
  providers: [provideWrIcons(lucideIcons({ menu: Menu }))],
})
export default class Layout {
  /**
   * Below `md` the sidebar moves into an off-canvas drawer. Both shapes are
   * always in the DOM and `layout.scss` picks one per breakpoint — see the
   * note there for why this is CSS rather than a `matchMedia` signal.
   */
  protected readonly sidebarOpen = signal(false);

  private readonly drawerNav = viewChild.required('drawerNav', { read: Sidebar });

  constructor() {
    // Open the drawer on the current row rather than on the top of the list.
    // After render: the drawer moves its content into the overlay as it opens,
    // and the column has no box to scroll before then.
    const injector = inject(Injector);
    effect(() => {
      if (!this.sidebarOpen()) return;
      afterNextRender(() => this.drawerNav().revealCurrent(), { injector });
    });

    // Close the drawer once the picked page has loaded.
    inject(Router)
      .events.pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.sidebarOpen.set(false));
  }
}
