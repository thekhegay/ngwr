/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Output format produced by `<wr-color-picker>` when emitting through its
 * `ControlValueAccessor`:
 *
 * - `hex`  — `#3969e2` or `#3969e2ff` when alpha is enabled
 * - `rgba` — `rgba(57, 105, 226, 0.5)`
 * - `hsla` — `hsla(220, 73%, 56%, 0.5)`
 */
export type WrColorFormat = 'hex' | 'rgba' | 'hsla';
