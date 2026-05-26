/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/**
 * Top bar of a {@link WrLayout}. Stretches across the parent;
 * size and stickiness are app-controlled via CSS.
 */
@Component({
  selector: 'wr-layout-header',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-layout-header', role: 'banner' },
})
export class WrLayoutHeader {}
