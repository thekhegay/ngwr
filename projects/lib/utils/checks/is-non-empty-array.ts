/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Maybe } from '../types/maybe';

/**
 * Checks that a value is an array, and it contains at least one element.
 *
 * @example
 * ```ts
 * const items: Maybe<string[]> = getItems();
 *
 * if (isNonEmptyArray(items)) {
 *   // items is string[]
 *   console.log(items[0]);
 * }
 * ```
 */
export function isNonEmptyArray<T>(value: Maybe<T[]>): value is T[] {
  return Array.isArray(value) && value.length > 0;
}
