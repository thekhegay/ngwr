import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, ElementRef, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { Settings } from 'lucide';
import { WrBurger } from 'ngwr/burger';
import { WrDensity, type WrDensityValue } from 'ngwr/density';
import { WrDrawer } from 'ngwr/drawer';
import { WrDropdown, WrDropdownMenu } from 'ngwr/dropdown';
import { provideWrIcons, WrIcon } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrSegmented, type WrSegmentedOption } from 'ngwr/segmented';
import { WrTheme, type WrThemeMode } from 'ngwr/theme';

import { BRAND_ICONS } from '#core/icons';
import { PrimaryColor } from '#core/services';
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
  imports: [RouterLink, RouterLinkActive, WrBurger, WrDrawer, WrIcon, WrDropdown, WrDropdownMenu, WrSegmented],
  providers: [provideWrIcons([...BRAND_ICONS, ...lucideIcons({ settings: Settings })])],
})
export class Header {
  protected readonly theme = inject(WrTheme);
  protected readonly density = inject(WrDensity);
  protected readonly primary = inject(PrimaryColor);

  /** Theme segmented — user choice (`auto` resolves via `prefers-color-scheme`). */
  protected readonly themeOptions: readonly WrSegmentedOption<WrThemeMode>[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  /** Density segmented — sm / md / lg (the `touch` step is omitted here). */
  protected readonly densityOptions: readonly WrSegmentedOption<WrDensityValue>[] = [
    { value: 'sm', label: 'sm' },
    { value: 'md', label: 'md' },
    { value: 'lg', label: 'lg' },
  ];

  protected readonly routes = routes;
  protected readonly nav: readonly NavLink[] = [
    { url: [routes.index, routes.gettingStarted.index], label: 'Getting Started' },
    { url: [routes.index, routes.tokens.index], label: 'Design tokens' },
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

  /** Segmented emits `T | null`; the panel's options are never null, so just guard. */
  protected onThemeChange(mode: WrThemeMode | null): void {
    if (mode) this.theme.set(mode);
  }

  protected onDensityChange(density: WrDensityValue | null): void {
    if (density) this.density.set(density);
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
