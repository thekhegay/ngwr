/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation } from '@angular/core';

/**
 * Main content area of a {@link WrLayout}. Flex-grows to fill
 * remaining space.
 */
@Component({
  selector: 'wr-layout-content',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-layout-content', role: 'main' },
})
export class WrLayoutContent {}
