import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { WrButtonComponent } from 'ngwr/button';
import {
  WR_DIALOG_DATA,
  WrDialogCloseDirective,
  WrDialogContentDirective,
  WrDialogFooterDirective,
  WrDialogTitleDirective,
} from 'ngwr/dialog';

export interface ConfirmData {
  readonly title: string;
  readonly message: string;
}

@Component({
  selector: 'ngwr-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrButtonComponent,
    WrDialogTitleDirective,
    WrDialogContentDirective,
    WrDialogFooterDirective,
    WrDialogCloseDirective,
  ],
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmData>(WR_DIALOG_DATA);
}
