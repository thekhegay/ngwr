import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrButtonComponent } from 'ngwr/button';
import {
  WrDialogCloseDirective,
  WrDialogContentDirective,
  WrDialogFooterDirective,
  WrDialogTitleDirective,
} from 'ngwr/dialog';
import { NewArrayPipe } from 'ngwr/pipes';

@Component({
  standalone: true,
  selector: 'ngwr-dialog-example',
  templateUrl: './dialog-example.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrButtonComponent,
    NewArrayPipe,
    WrDialogFooterDirective,
    WrDialogCloseDirective,
    WrDialogContentDirective,
    WrDialogTitleDirective,
  ],
})
export class DialogExampleComponent {}
