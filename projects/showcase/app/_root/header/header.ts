import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, ElementRef, PLATFORM_ID, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { WrI18n, WrTPipe } from 'ngwr/i18n';
import { provideWrIcons, WrIcon, type WrBuiltInIconName, globe, logoGithub, logoNpm, moon, sun } from 'ngwr/icon';
import { WrTheme } from 'ngwr/theme';

import { routes } from '#routing';

interface NavLink {
  readonly url: string[];
  /** Translation key (e.g. `'nav.components'`). */
  readonly key: string;
  /** English fallback when no i18n catalog is loaded. */
  readonly fallback: string;
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
  imports: [RouterLink, RouterLinkActive, WrIcon, WrTPipe],
  providers: [provideWrIcons([globe, logoGithub, logoNpm, moon, sun])],
})
export class Header {
  protected readonly theme = inject(WrTheme);
  protected readonly i18n = inject(WrI18n);

  protected readonly currentLocale = this.i18n.locale;
  protected readonly availableLocales = this.i18n.available();

  protected readonly routes = routes;
  protected readonly nav: readonly NavLink[] = [
    { url: [routes.index, routes.gettingStarted.index], key: 'nav.gettingStarted', fallback: 'Getting Started' },
    { url: [routes.index, routes.components.index], key: 'nav.components', fallback: 'Components' },
    { url: [routes.index, routes.animations.index], key: 'nav.animations', fallback: 'Animations' },
    { url: [routes.index, routes.directives.index], key: 'nav.directives', fallback: 'Directives' },
    { url: [routes.index, routes.pipes.index], key: 'nav.pipes', fallback: 'Pipes' },
    { url: [routes.index, routes.services.index], key: 'nav.services', fallback: 'Services' },
    { url: [routes.index, routes.utils.index], key: 'nav.utils', fallback: 'Utils' },
    { url: [routes.index, routes.validators.index], key: 'nav.validators', fallback: 'Validators' },
  ];
  protected readonly actions: readonly ActionLink[] = [
    { url: 'https://github.com/thekhegay/ngwr', icon: 'logo-github', modifier: 'github', label: 'GitHub' },
    { url: 'https://www.npmjs.com/package/ngwr', icon: 'logo-npm', modifier: 'npm', label: 'npm' },
  ];

  protected onToggleTheme(): void {
    this.theme.toggle();
  }

  protected setLocale(locale: string): void {
    this.i18n.use(locale);
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
