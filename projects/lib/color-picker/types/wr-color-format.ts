/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Output format produced by `<wr-color-picker>` when it writes its `value`
 * model. Each format has an opaque and a translucent spelling, picked by the
 * picker's `alpha` input:
 *
 * - `hex`  — `#3969e2`, or `#3969e2ff` with alpha
 * - `rgba` — `rgb(57, 105, 226)`, or `rgba(57, 105, 226, 0.5)` with alpha
 * - `hsla` — `hsl(220, 73%, 56%)`, or `hsla(220, 73%, 56%, 0.5)` with alpha
 *
 * All three are also ACCEPTED on the way in, whichever one is set, so a
 * `[(value)]` binding round-trips its own output.
 */
export type WrColorFormat = 'hex' | 'rgba' | 'hsla';
