import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, WrIcon],
  providers: [provideWrIcons([logoGithub, logoNpm, moon, sun])],
})
export class Header {
  protected readonly theme = inject(WrTheme);

  protected readonly routes = routes;
  protected readonly nav: readonly NavLink[] = [
    { url: [routes.index, routes.docs.index], label: 'Docs' },
    { url: [routes.index, routes.components.index], label: 'Components' },
  ];
  protected readonly actions: readonly ActionLink[] = [
    { url: 'https://github.com/thekhegay/ngwr', icon: 'logo-github', modifier: 'github', label: 'GitHub' },
    { url: 'https://www.npmjs.com/package/ngwr', icon: 'logo-npm', modifier: 'npm', label: 'npm' },
  ];

  protected onToggleTheme(): void {
    this.theme.toggle();
  }
}
