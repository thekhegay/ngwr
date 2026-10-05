import { Component, ViewEncapsulation, inject } from '@angular/core';

import { WrAlert } from 'ngwr/alert';
import { WrBadge } from 'ngwr/badge';
import { WrButton } from 'ngwr/button';
import { WrIcon } from 'ngwr/icon';
import { WrTheme, type WrColor } from 'ngwr/theme';

/**
 * The sandbox host.
 *
 * `ViewEncapsulation.None` on purpose: the library's own components are
 * unencapsulated and their `.wr-*` classes are public API, so a host that
 * scopes its styles would behave differently from the app a consumer writes.
 */
@Component({
  selector: 'sbx-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [WrAlert, WrBadge, WrButton, WrIcon],
})
export class AppComponent {
  protected readonly theme = inject(WrTheme);

  protected readonly colors: readonly WrColor[] = ['primary', 'success', 'warning', 'danger', 'info'];

  protected toggleTheme(): void {
    this.theme.set(this.theme.resolved() === 'dark' ? 'light' : 'dark');
  }
}
