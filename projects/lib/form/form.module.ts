/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { NgModule } from '@angular/core';

import { WrFormErrorComponent } from './form-error.component';
import { WrFormItemComponent } from './form-item.component';

@NgModule({
  imports: [WrFormItemComponent, WrFormErrorComponent],
  exports: [WrFormItemComponent, WrFormErrorComponent],
})
export class WrFormModule {}
