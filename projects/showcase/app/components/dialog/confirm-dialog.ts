import { Component, inject } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WR_DIALOG_DATA, WrDialogClose, WrDialogContent, WrDialogFooter, WrDialogTitle } from 'ngwr/dialog';

export interface ConfirmData {
  readonly title: string;
  readonly message: string;
}

@Component({
  selector: 'ngwr-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  imports: [WrButton, WrDialogTitle, WrDialogContent, WrDialogFooter, WrDialogClose],
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmData>(WR_DIALOG_DATA);
}
