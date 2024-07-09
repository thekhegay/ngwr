/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { NgModule } from '@angular/core';

import { WrDialogCloseDirective } from './dialog-close.directive';
import { WrDialogContentDirective } from './dialog-content.directive';
import { WrDialogFooterDirective } from './dialog-footer.directive';
import { WrDialogTitleDirective } from './dialog-title.directive';
import { WrDialogComponent } from './dialog.component';
import { WrDialogService } from './dialog.service';

@NgModule({
  imports: [
    WrDialogComponent,
    WrDialogFooterDirective,
    WrDialogContentDirective,
    WrDialogCloseDirective,
    WrDialogTitleDirective,
  ],
  exports: [WrDialogCloseDirective, WrDialogFooterDirective, WrDialogContentDirective, WrDialogTitleDirective],
  providers: [WrDialogService],
})
export class WrDialogModule {}
