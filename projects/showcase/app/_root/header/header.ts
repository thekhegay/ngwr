import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, ElementRef, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { Moon, Sun } from 'lucide';
import { WrBurger } from 'ngwr/burger';
import { WrDrawer } from 'ngwr/drawer';
import { provideWrIcons, WrIcon } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrTheme } from 'ngwr/theme';

import { BRAND_ICONS } from '#core/icons';
import { routes } from '#routing';

interface NavLink {
  readonly url: string[];
  readonly label: string;
}

interface ActionLink {
  readonly url: string;
  readonly icon: string;
  readonly modifier: string;
  readonly label: string;
}

@Component({
  selector: 'ngwr-header',
  templateUrl: './header.html',
  styleUrl: './header.scss',
  imports: [RouterLink, RouterLinkActive, WrBurger, WrDrawer, WrIcon],
  providers: [provideWrIcons([...BRAND_ICONS, ...lucideIcons({ moon: Moon, sun: Sun })])],
})
export class Header {
  protected readonly theme = inject(WrTheme);

  protected readonly routes = routes;
  protected readonly nav: readonly NavLink[] = [
    { url: [routes.index, routes.gettingStarted.index], label: 'Getting Started' },
    { url: [routes.index, routes.components.index], label: 'Components' },
    { url: [routes.index, routes.typography.index], label: 'Typography' },
    { url: [routes.index, routes.icons.index], label: 'Icons' },
    { url: [routes.index, routes.animations.index], label: 'Animations' },
    { url: [routes.index, routes.directives.index], label: 'Directives' },
    { url: [routes.index, routes.pipes.index], label: 'Pipes' },
    { url: [routes.index, routes.services.index], label: 'Services' },
    { url: [routes.index, routes.translate.index], label: 'Translate' },
    { url: [routes.index, routes.interfaces.index], label: 'Interfaces' },
    { url: [routes.index, routes.utils.index], label: 'Utils' },
    { url: [routes.index, routes.validators.index], label: 'Validators' },
  ];
  protected readonly actions: readonly ActionLink[] = [
    { url: 'https://github.com/thekhegay/ngwr', icon: 'github', modifier: 'github', label: 'GitHub' },
    { url: 'https://www.npmjs.com/package/ngwr', icon: 'npm', modifier: 'npm', label: 'npm' },
  ];

  /** Mobile nav sheet — the inline nav collapses to a burger below `xl`. */
  protected readonly menuOpen = signal(false);

  protected onToggleTheme(): void {
    this.theme.toggle();
  }

  /**
   * Publish the header's rendered height as `--ngwr-header-height` on
   * `<html>` so descendants (sticky sidebar, scroll-padding, etc.) can
   * react to the actual measured value instead of a hard-coded `4rem`.
   *
   * ResizeObserver fires on every layout-affecting change (responsive
   * wrap, font-loading shift, mobile chrome resize) and writes the
   * current `offsetHeight` in `px`. Cleared on destroy so a stale value
   * doesn't leak.
   */
  constructor() {
    const platformId = inject(PLATFORM_ID);
    if (!isPlatformBrowser(platformId)) return;

    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const root = document.documentElement;

    const publish = (): void => {
      root.style.setProperty('--ngwr-header-height', `${host.offsetHeight}px`);
    };

    const observer = new ResizeObserver(publish);
    observer.observe(host);
    publish();

    inject(DestroyRef).onDestroy(() => {
      observer.disconnect();
      root.style.removeProperty('--ngwr-header-height');
    });
  }
}
