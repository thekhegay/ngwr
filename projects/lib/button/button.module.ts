/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { NgModule } from '@angular/core';

import { WrButtonGroupComponent } from './button-group.component';
import { WrButtonComponent } from './button.component';

@NgModule({
  imports: [WrButtonComponent, WrButtonGroupComponent],
  exports: [WrButtonComponent, WrButtonGroupComponent],
})
export class WrButtonModule {}
