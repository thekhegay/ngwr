/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  effect,
  forwardRef,
  inject,
  input,
} from '@angular/core';

import { WrSquircle } from 'ngwr/squircle';

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
  host: {
    class: 'wr-btn-group',
    role: 'group',
    '[class.wr-btn-group--squircle]': "shape() === 'squircle'",
  },
  providers: [{ provide: WR_BUTTON_GROUP, useExisting: forwardRef(() => WrButtonGroup) }],
  hostDirectives: [WrSquircle],
})
export class WrButtonGroup implements WrButtonGroupContext {
  /**
   * Corner treatment enforced on every child `<wr-btn>`. Child `[shape]`
   * inputs are ignored when this is set — the group exists to make a
   * uniform control. `null` (default) leaves children alone.
   *
   * For `'squircle'`, the squircle clip-path is applied to the GROUP
   * wrapper (not each child) so the row is cropped as one shape;
   * children render as plain rounded segments inside the clip.
   *
   * @default null
   */
  readonly shape = input<WrButtonShape | null>(null);

  constructor() {
    // Drive the host-composed WrSquircle: enable it only when the group
    // shape is squircle. Children read `shape()` via WR_BUTTON_GROUP and
    // skip their own per-button squircle (see WrButton.effectiveShape).
    const squircle = inject(WrSquircle, { self: true });
    effect(() => squircle.enabled.set(this.shape() === 'squircle'));
  }
}
