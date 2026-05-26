/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/**
 * Bottom bar of a {@link WrLayout}. Doesn't grow — sized by its
 * children.
 */
@Component({
  selector: 'wr-layout-footer',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-layout-footer', role: 'contentinfo' },
})
export class WrLayoutFooter {}
