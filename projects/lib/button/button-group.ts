/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, forwardRef, input } from '@angular/core';

import { WR_BUTTON_GROUP, type WrButtonGroupContext } from './tokens';
import type { WrButtonShape } from './types';

/**
 * Visually group buttons by merging their borders. Optionally enforce a
 * single corner treatment across every child via `[shape]` — child
 * `<wr-btn>` `[shape]` inputs are ignored when set on the group.
 *
 * @example
 * ```html
 * <wr-btn-group>
 *   <button wr-btn>Left</button>
 *   <button wr-btn>Middle</button>
 *   <button wr-btn>Right</button>
 * </wr-btn-group>
 *
 * <wr-btn-group shape="pill">
 *   <button wr-btn>Pill</button>
 *   <button wr-btn>Group</button>
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
  providers: [{ provide: WR_BUTTON_GROUP, useExisting: forwardRef(() => WrButtonGroup) }],
})
export class WrButtonGroup implements WrButtonGroupContext {
  /**
   * Corner treatment enforced on every child `<wr-btn>`. Child `[shape]`
   * inputs are ignored when this is set — the group exists to make a
   * uniform control. `null` (default) leaves children alone.
   *
   * @default null
   */
  readonly shape = input<WrButtonShape | null>(null);
}
