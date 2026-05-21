import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { provideWrIcons, WrIconComponent, type WrBuiltInIconName, logoGithub, logoNpm } from 'ngwr/icon';

import { LayoutState } from '../layout-state.service';

type ActionLink = {
  readonly url: string;
  readonly icon: WrBuiltInIconName;
  readonly modifier: string;
  readonly label: string;
};

@Component({
  selector: 'ngwr-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ngwr-header', role: 'banner' },
  imports: [RouterLink, RouterLinkActive, WrIconComponent],
  providers: [provideWrIcons([logoGithub, logoNpm])],
})
export class HeaderComponent {
  protected readonly layoutState = inject(LayoutState);

  protected readonly actions: readonly ActionLink[] = [
    { url: 'https://github.com/thekhegay/ngwr', icon: 'logo-github', modifier: 'github', label: 'GitHub' },
    { url: 'https://www.npmjs.com/package/ngwr', icon: 'logo-npm', modifier: 'npm', label: 'npm' },
  ];

  protected onToggleSidebar(): void {
    this.layoutState.toggleSidebar();
  }
}
