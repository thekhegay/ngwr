import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';

import { filter } from 'rxjs';

import { Menu } from 'lucide';
import { WrDrawer } from 'ngwr/drawer';
import { provideWrIcons, WrIcon } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

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
   * note there for why this is CSS rather than a `WrMedia` signal.
   */
  protected readonly sidebarOpen = signal(false);

  constructor() {
    // Close the drawer once the picked page has loaded.
    inject(Router)
      .events.pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.sidebarOpen.set(false));
  }
}
