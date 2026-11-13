/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * A preset colour in `<wr-color-picker>`'s `swatches`: a bare colour string, or
 * a colour with the name its button announces. A bare string announces itself.
 */
export type WrColorPickerSwatch = string | { readonly value: string; readonly label: string };
