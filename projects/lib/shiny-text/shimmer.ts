/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive } from '@angular/core';

/**
 * Gradient sweep over text. Applies a `background-clip: text` gradient
 * with a moving highlight — gives any text a subtle shimmer.
 *
 * The directive only adds the `wr-shimmer` host class. Pair with the
 * styles in `ngwr/animations` (which include the `wr-shimmer` keyframes).
 *
 * @example
 * ```html
 * <h1 wrShimmer>Premium</h1>
 * ```
 */
@Directive({
  selector: '[wrShimmer]',
  host: { class: 'wr-shimmer' },
})
export class WrShimmer {}
