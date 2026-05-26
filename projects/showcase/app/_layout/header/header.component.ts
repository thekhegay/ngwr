import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';

import { filter, map } from 'rxjs';

import { provideWrIcons, WrIconComponent, type WrBuiltInIconName, logoGithub, logoNpm, moon, sun } from 'ngwr/icon';
import { WrThemeService } from 'ngwr/theme';

import { LayoutState } from '../layout-state.service';

interface ActionLink {
  readonly url: string;
  readonly icon: WrBuiltInIconName;
  readonly modifier: string;
  readonly label: string;
}

@Component({
  selector: 'ngwr-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ngwr-header', role: 'banner' },
  imports: [RouterLink, RouterLinkActive, WrIconComponent],
  providers: [provideWrIcons([logoGithub, logoNpm, moon, sun])],
})
export class HeaderComponent {
  protected readonly layoutState = inject(LayoutState);
  protected readonly theme = inject(WrThemeService);
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  /** Mobile toggle + sidebar only matter on `/docs/*` routes. */
  protected readonly isDocsRoute = computed(() => this.url().startsWith('/docs'));

  protected readonly actions: readonly ActionLink[] = [
    { url: 'https://github.com/thekhegay/ngwr', icon: 'logo-github', modifier: 'github', label: 'GitHub' },
    { url: 'https://www.npmjs.com/package/ngwr', icon: 'logo-npm', modifier: 'npm', label: 'npm' },
  ];

  protected onToggleSidebar(): void {
    this.layoutState.toggleSidebar();
  }

  protected onToggleTheme(): void {
    this.theme.toggle();
  }

  protected onOpenPalette(): void {
    this.layoutState.openPalette();
  }

  /** Render ⌘ on macOS, Ctrl elsewhere. */
  protected readonly isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
}
