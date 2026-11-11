/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Reads the value a column sorts by; `key` is the column key. Pass one to
 * `wrSortRows` for a key that is not a field of the row: a computed column or
 * a nested value.
 */
export type WrTableSortAccessor<T> = (item: T, key: string) => string | number;
