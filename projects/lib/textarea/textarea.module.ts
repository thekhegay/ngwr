/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { NgModule } from '@angular/core';

import { WrTextareaComponent } from './textarea.component';

@NgModule({
  imports: [WrTextareaComponent],
  exports: [WrTextareaComponent],
})
export class WrTextareaModule {}
