import { Component, inject } from '@angular/core';

import { WrButton } from 'ngwr/button';
import {
  WR_DIALOG_DATA,
  WrDialogClose,
  WrDialogContent,
  WrDialogFooter,
  type WrDialogSize,
  WrDialogTitle,
} from 'ngwr/dialog';
import { WrFormField } from 'ngwr/form';
import { WrInput } from 'ngwr/input';

@Component({
  selector: 'ngwr-sized-dialog',
  templateUrl: './sized-dialog.html',
  imports: [WrButton, WrFormField, WrInput, WrDialogTitle, WrDialogContent, WrDialogFooter, WrDialogClose],
})
export class SizedDialogComponent {
  protected readonly size = inject<WrDialogSize>(WR_DIALOG_DATA);
}
