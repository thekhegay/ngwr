/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Single picker entry inside a column's filter dropdown.
 */
export type WrTableFilterItem<T = unknown> = {
  readonly title: string;
  readonly value: T;
  selected?: boolean;
};
