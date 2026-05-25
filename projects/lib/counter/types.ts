/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Animation mode for {@link WrCounterComponent}.
 *
 * - `odometer` — digits roll vertically like a mechanical counter.
 * - `tween` — single eased interpolation from the previous value to the new
 *   one (matches `<wr-count-up>` behavior, formatted inline).
 */
export type WrCounterMode = 'odometer' | 'tween';
