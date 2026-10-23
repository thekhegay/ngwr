/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Maybe } from '../types';

/**
 * Type guard that checks if a value is neither `null` nor `undefined`.
 *
 * @example
 * ```ts
 * const maybeValue: Maybe<number> = getValue();
 *
 * if (isDefined(maybeValue)) {
 *   // here maybeValue is number
 *   console.log(maybeValue.toFixed(2));
 * }
 * ```
 *
 * @see {@link Maybe}
 */
export function isDefined<T>(value: Maybe<T>): value is T {
  return value !== null && value !== undefined;
}
