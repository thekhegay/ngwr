import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';

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
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
})
export default class ShellComponent {
  constructor() {
    inject(MetaService).setRobots();
  }
}
