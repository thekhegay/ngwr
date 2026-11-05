/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * What `<wr-input-number>` holds in `value`.
 *
 * - `'number'`: a `number | null`, the engine's double. The default.
 * - `'decimal'`: a `string | null` in the canonical form `wrDecimal` from
 *   `ngwr/utils` returns, exact to every digit typed. Stepping, `min`,
 *   `max` and `decimals` go through the same decimal core, so `0.2` stepped by
 *   `0.1` is `'0.3'`.
 */
export type WrInputNumberMode = 'number' | 'decimal';

/**
 * The `value` type a mode gives `<wr-input-number>`: `string | null` under
 * `'decimal'`, `number | null` under `'number'`. The component's generic is
 * inferred from the `mode` written in the template, so `[(value)]` and
 * `[formField]` type-check against the mode beside them; a `mode` bound to a
 * union of both widens the value to `string | number | null`.
 */
export type WrInputNumberValue<M extends WrInputNumberMode = WrInputNumberMode> = M extends 'decimal'
  ? string | null
  : number | null;
