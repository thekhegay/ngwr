import { Component, ViewEncapsulation, inject, signal } from '@angular/core';

import { WrButton, WrButtonGroup } from 'ngwr/button';
import { WrIcon } from 'ngwr/icon';
import { type WrSpeedDialAction, type WrSpeedDialDirection, WrSpeedDial } from 'ngwr/speed-dial';
import { WrTheme } from 'ngwr/theme';

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
  imports: [WrButton, WrButtonGroup, WrIcon, WrSpeedDial],
})
export class AppComponent {
  protected readonly theme = inject(WrTheme);

  protected toggleTheme(): void {
    this.theme.set(this.theme.resolved() === 'dark' ? 'light' : 'dark');
  }

  // --- Button -------------------------------------------------------------
  protected readonly loading = signal(false);

  // --- Speed Dial ---------------------------------------------------------
  protected readonly actions: readonly WrSpeedDialAction[] = [
    { id: 'copy', label: 'Copy', icon: 'copy' },
    { id: 'download', label: 'Download', icon: 'download' },
    { id: 'trash', label: 'Delete', icon: 'trash' },
  ];
  protected readonly directions: readonly WrSpeedDialDirection[] = ['up', 'down', 'left', 'right'];
  protected readonly picked = signal<string>('—');

  protected onPick(action: WrSpeedDialAction): void {
    this.picked.set(action.label);
  }
}
