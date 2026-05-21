/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Value type accepted by `<wr-slider>`:
 * - `number` for single-thumb sliders (`range="false"`, the default)
 * - `[number, number]` (`[low, high]`) for range sliders (`range="true"`)
 *
 * The component reads `range` at runtime and writes back the matching shape
 * through `ControlValueAccessor`.
 */
export type WrSliderValue = number | readonly [number, number];
