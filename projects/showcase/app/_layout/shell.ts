import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { WrCommandPalette } from 'ngwr/command-palette';
import { cog, provideWrIcons } from 'ngwr/icon';

import { buildCommandItems } from './command-items';
import { FooterComponent } from './footer/footer';
import { HeaderComponent } from './header/header';
import { LayoutState } from './layout-state';

import { MetaService } from '#core/services';

/**
 * App-level shell. Always renders the header and footer; the body is a
 * single `<router-outlet>` that either shows the landing page or the
 * docs layout (sidebar + content) further down the route tree.
 */
@Component({
  selector: 'ngwr-shell',
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ngwr-shell' },
  imports: [RouterOutlet, HeaderComponent, FooterComponent, WrCommandPalette],
  providers: [provideWrIcons([cog])],
})
export default class ShellComponent {
  protected readonly layoutState = inject(LayoutState);
  protected readonly commandItems = buildCommandItems(inject(Router));

  constructor() {
    inject(MetaService).setRobots();
  }
}
