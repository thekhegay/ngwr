import { type Direction, Directionality } from '@angular/cdk/bidi';
import { isPlatformBrowser } from '@angular/common';
import { Component, DOCUMENT, DestroyRef, ElementRef, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ChevronDown, Settings } from 'lucide';
import { WrBurger } from 'ngwr/burger';
import { WrDensity, type WrDensityValue } from 'ngwr/density';
import { WrDrawer } from 'ngwr/drawer';
import { WrDropdown, WrDropdownMenu } from 'ngwr/dropdown';
import { provideWrIcons, WrIcon } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrSegmented, type WrSegmentedOption } from 'ngwr/segmented';
import { WrTheme, type WrThemeMode } from 'ngwr/theme';
import { NGWR_VERSION_TOKEN } from 'ngwr/version';

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

/** First major with an archived docs snapshot — nothing older was ever frozen. */
const OLDEST_ARCHIVED_MAJOR = 7;

/** Archived majors, newest first: v7 … v(current − 1). */
function archivedMajors(current: number): readonly number[] {
  return Array.from({ length: Math.max(0, current - OLDEST_ARCHIVED_MAJOR) }, (_, i) => current - 1 - i);
}

@Component({
  selector: 'ngwr-header',
  templateUrl: './header.html',
  styleUrl: './header.scss',
  imports: [RouterLink, RouterLinkActive, WrBurger, WrDrawer, WrIcon, WrDropdown, WrDropdownMenu, WrSegmented],
  providers: [provideWrIcons([...BRAND_ICONS, ...lucideIcons({ settings: Settings, 'chevron-down': ChevronDown })])],
})
export class Header {
  protected readonly theme = inject(WrTheme);
  protected readonly density = inject(WrDensity);
  protected readonly primary = inject(PrimaryColor);
  protected readonly directionality = inject(Directionality);
  private readonly document = inject(DOCUMENT);

  /** Current major (e.g. `v8`) shown on the version-switcher trigger. */
  protected readonly major = `v${String(inject(NGWR_VERSION_TOKEN)).split('.')[0]}`;

  /**
   * Documentation versions, each a separate static deployment. The live site is
   * `latest`; older majors are archived snapshots served from a versioned path
   * (so these are full-page `href` links, not in-app routes).
   *
   * Derived, not listed by hand. `publish.yml` freezes the superseded major on
   * every major release, so the archives are exactly v7 … v(current − 1) — and a
   * hand-written list is precisely what went wrong before: v8 and v9 were
   * archived and deployed, but nobody added them here, so for two majors the
   * snapshots existed on the server with nothing linking to them.
   */
  protected readonly docVersions: readonly { readonly label: string; readonly url: string }[] = [
    { label: `${this.major} · latest`, url: '/' },
    ...archivedMajors(Number(this.major.slice(1))).map(v => ({ label: `v${v}`, url: `/v${v}/` })),
  ];

  /** Theme segmented — user choice (`auto` resolves via `prefers-color-scheme`). */
  protected readonly themeOptions: readonly WrSegmentedOption<WrThemeMode>[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  /**
   * Direction segmented — the switch that makes RTL reviewable at all.
   *
   * Both halves have to move together or the toggle lies. `dir` on the document
   * is what mirrors the CSS (every logical property resolves against it), and
   * `Directionality` is what the components read for their keyboard and pointer
   * maths — a slider's arrows, a tree's expand key, a table's column drag. The
   * CDK's ambient instance reads the document ONCE, in its constructor, so
   * flipping the attribute alone would mirror the layout and leave every
   * interaction facing the old way. Writing its `valueSignal` is the documented
   * way to move the other half.
   */
  protected readonly directionOptions: readonly WrSegmentedOption<Direction>[] = [
    { value: 'ltr', label: 'LTR' },
    { value: 'rtl', label: 'RTL' },
  ];

  /** Density segmented — sm / md / lg (the `touch` step is omitted here). */
  protected readonly densityOptions: readonly WrSegmentedOption<WrDensityValue>[] = [
    { value: 'sm', label: 'sm' },
    { value: 'md', label: 'md' },
    { value: 'lg', label: 'lg' },
  ];

  protected readonly routes = routes;
  /**
   * Five doors, ordered by what the reader is doing. The previous thirteen
   * mirrored how the code is organised (Components / Directives / Pipes /
   * Services / Utils…), which is not a question anyone arrives with — those
   * are all one thing now, `Reference`, and you reach them from the guide for
   * the job you are actually doing.
   */
  protected readonly nav: readonly NavLink[] = [
    { url: [routes.index, routes.start.index], label: 'Start' },
    { url: [routes.index, routes.guides.index], label: 'Guides' },
    { url: [routes.index, routes.reference.index], label: 'Reference' },
    { url: [routes.index, routes.icons.index], label: 'Icons' },
    { url: [routes.index, routes.animations.index], label: 'Animations' },
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

  protected onDirectionChange(direction: Direction | null): void {
    if (!direction) return;

    this.document.documentElement.dir = direction;
    this.directionality.valueSignal.set(direction);
    // Components that cache a direction-derived value listen to `change` rather
    // than reading the signal, so a write alone would leave those stale.
    this.directionality.change.emit(direction);
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
