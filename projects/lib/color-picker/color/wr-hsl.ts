/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Hue / Saturation / Lightness with alpha.
 *
 * - `h` ∈ `[0, 360)` (degrees)
 * - `s`, `l`, `a` ∈ `[0, 1]`
 */
export interface WrHsl {
  readonly h: number;
  readonly s: number;
  readonly l: number;
  readonly a: number;
}
