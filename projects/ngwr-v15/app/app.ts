import { Component, ViewEncapsulation, inject, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrDatePicker } from 'ngwr/date-picker';
import { WrDialog } from 'ngwr/dialog';
import { WrTheme } from 'ngwr/theme';

import { ConfirmDialog } from './confirm-dialog';

/** Does a pane carrying z-index 1050 outrank a dialog opened after it? */
@Component({
  selector: 'sbx-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [WrButton, WrDatePicker],
})
export class AppComponent {
  protected readonly theme = inject(WrTheme);
  protected toggleTheme(): void {
    this.theme.set(this.theme.resolved() === 'dark' ? 'light' : 'dark');
  }

  private readonly dialog = inject(WrDialog);
  protected readonly picked = signal<Date | null>(null);

  protected openDialog(): void {
    this.dialog.open(ConfirmDialog, { width: '28rem' });
  }
}
