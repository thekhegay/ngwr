import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, ElementRef, PLATFORM_ID, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { provideWrIcons, WrIcon, type WrBuiltInIconName, logoGithub, logoNpm, moon, sun } from 'ngwr/icon';
import { WrTheme } from 'ngwr/theme';

import { routes } from '#routing';

interface NavLink {
  readonly url: string[];
  readonly label: string;
}

interface ActionLink {
  readonly url: string;
  readonly icon: WrBuiltInIconName;
  readonly modifier: string;
  readonly label: string;
}

@Component({
  selector: 'ngwr-header',
  templateUrl: './header.html',
  styleUrl: './header.scss',
  imports: [RouterLink, RouterLinkActive, WrIcon],
  providers: [provideWrIcons([logoGithub, logoNpm, moon, sun])],
})
export class Header {
  protected readonly theme = inject(WrTheme);

  protected readonly routes = routes;
  protected readonly nav: readonly NavLink[] = [
    { url: [routes.index, routes.gettingStarted.index], label: 'Getting Started' },
    { url: [routes.index, routes.components.index], label: 'Components' },
    { url: [routes.index, routes.animations.index], label: 'Animations' },
    { url: [routes.index, routes.directives.index], label: 'Directives' },
    { url: [routes.index, routes.pipes.index], label: 'Pipes' },
    { url: [routes.index, routes.services.index], label: 'Services' },
    { url: [routes.index, routes.utils.index], label: 'Utils' },
  ];
  protected readonly actions: readonly ActionLink[] = [
    { url: 'https://github.com/thekhegay/ngwr', icon: 'logo-github', modifier: 'github', label: 'GitHub' },
    { url: 'https://www.npmjs.com/package/ngwr', icon: 'logo-npm', modifier: 'npm', label: 'npm' },
  ];

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
