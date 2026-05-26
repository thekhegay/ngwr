/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/**
 * Visually group buttons by merging their borders.
 *
 * @example
 * ```html
 * <wr-btn-group>
 *   <button wr-btn>Left</button>
 *   <button wr-btn>Middle</button>
 *   <button wr-btn>Right</button>
 * </wr-btn-group>
 * ```
 *
 * @see https://ngwr.dev/docs/components/button-group
 */
@Component({
  selector: 'wr-btn-group',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-btn-group', role: 'group' },
})
export class WrButtonGroup {}
