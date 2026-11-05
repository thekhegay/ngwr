/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrTableColumn } from './table-columns';
import type { WrTableRow } from './table-row';

/**
 * Implicit context passed to a `[wrTableCell]` template.
 *
 * `T` is the row and `K` the column key. The value is `T[K]` when the key is a
 * property of the row, and `unknown` for a column of the table's own (an
 * `actions` column has no value). Both come from the directive's
 * `[wrTableCellOf]` input; without it the row is `any`, as it always was.
 */
export interface WrTableCellContext<T extends WrTableRow = Record<string, unknown>, K extends string = string> {
  /** Cell value (alias for `item[columnKey]`). Use as `let-value`. */
  readonly $implicit: K extends keyof T ? T[K] : unknown;
  /** The full row item. */
  readonly item: T;
  /** The column definition. */
  readonly column: WrTableColumn<T>;
}
