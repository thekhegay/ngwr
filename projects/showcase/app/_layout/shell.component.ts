import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { WrCommandPaletteComponent } from 'ngwr/command-palette';
import { cog, provideWrIcons } from 'ngwr/icon';

import { buildCommandItems } from './command-items';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { LayoutState } from './layout-state.service';

import { MetaService } from '#core/services';

/**
 * App-level shell. Always renders the header and footer; the body is a
 * single `<router-outlet>` that either shows the landing page or the
 * docs layout (sidebar + content) further down the route tree.
 */
@Component({
  selector: 'ngwr-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ngwr-shell' },
  imports: [RouterOutlet, HeaderComponent, FooterComponent, WrCommandPaletteComponent],
  providers: [provideWrIcons([cog])],
})
export default class ShellComponent {
  protected readonly layoutState = inject(LayoutState);
  protected readonly commandItems = buildCommandItems(inject(Router));

  constructor() {
    inject(MetaService).setRobots();
  }
}
