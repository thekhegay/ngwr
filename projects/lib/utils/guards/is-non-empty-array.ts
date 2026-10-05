/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Maybe } from '../types';

/**
 * Type guard that checks if a value is an array with at least one element.
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
export function isNonEmptyArray<T>(value: Maybe<T[]>): value is [T, ...T[]] {
  return Array.isArray(value) && value.length > 0;
}
