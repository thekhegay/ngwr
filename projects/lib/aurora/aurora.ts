/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, input } from '@angular/core';

/**
 * Animated multi-layer gradient background. Drop inside a positioned
 * container — the component fills its parent absolutely.
 *
 * @example
 * ```html
 * <div style="position: relative; min-height: 24rem; overflow: hidden">
 *   <wr-aurora />
 *   <h1 style="position: relative">Welcome aboard</h1>
 * </div>
 * ```
 *
 * @see https://ngwr.dev/docs/components/aurora
 */
@Component({
  selector: 'wr-aurora',
  templateUrl: './aurora.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-aurora' },
})
export class WrAurora {
  /** First gradient layer. @default primary blob */
  readonly colorA = input<string>('radial-gradient(closest-side, rgba(57, 105, 226, 0.55), transparent)');

  /** Second gradient layer. @default secondary blob */
  readonly colorB = input<string>('radial-gradient(closest-side, rgba(245, 28, 106, 0.45), transparent)');

  /** Third gradient layer. @default success blob */
  readonly colorC = input<string>('radial-gradient(closest-side, rgba(0, 164, 0, 0.35), transparent)');
}
