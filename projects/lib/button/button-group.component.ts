/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, HostBinding, ViewEncapsulation } from '@angular/core';

/**
 * NGWR button group.
 *
 * Visually groups multiple buttons and merges their borders.
 *
 * @example
 * ```html
 * <wr-btn-group>
 *   <button wr-btn color="primary">Left</button>
 *   <button wr-btn color="primary">Middle</button>
 *   <button wr-btn color="primary">Right</button>
 * </wr-btn-group>
 * ```
 *
 * @see WrButtonComponent
 * @see http://ngwr.dev/docs/components/button-group
 *
 * @publicApi
 */
@Component({
  standalone: true,
  selector: 'wr-btn-group',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WrButtonGroupComponent {
  /**
   * Host CSS classes:
   */
  @HostBinding('class')
  get hostClasses(): Record<string, boolean> {
    return {
      'wr-btn-group': true,
    };
  }
}
