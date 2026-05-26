/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * sRGB colour with straight alpha.
 *
 * - `r`, `g`, `b` ∈ `[0, 255]`
 * - `a` ∈ `[0, 1]`
 */
export interface WrRgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}
