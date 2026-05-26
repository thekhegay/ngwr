/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Hue / Saturation / Value with alpha.
 *
 * - `h` ∈ `[0, 360)` (degrees)
 * - `s`, `v`, `a` ∈ `[0, 1]`
 */
export interface WrHsv {
  readonly h: number;
  readonly s: number;
  readonly v: number;
  readonly a: number;
}
