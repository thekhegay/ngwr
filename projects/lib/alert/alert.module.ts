/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { NgModule } from '@angular/core';

import { WrAlertComponent } from './alert.component';

@NgModule({
  imports: [WrAlertComponent],
  exports: [WrAlertComponent],
})
export class WrAlertModule {}
