/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrTableColumn } from './table-columns';
import type { WrTableRow } from './table-row';

/**
 * Context passed to a `[wrTableEditCell]` template, the editor of one cell.
 *
 * `T` is the row and `K` the column key, both from the directive's
 * `[wrTableEditCellOf]` input, the way `[wrTableCellOf]` types a cell template.
 *
 * `set` and `commit` take `unknown`: a control's own value type is often wider
 * than the cell's (a cleared number field emits `null`), and `cellEdit` hands
 * the value on as `unknown` for the handler to check.
 */
export interface WrTableEditCellContext<T extends WrTableRow = Record<string, unknown>, K extends string = string> {
  /**
   * The pending value: the cell's own when the edit starts, then whatever
   * `set` last took. Use as `let-value`.
   */
  readonly $implicit: K extends keyof T ? T[K] : unknown;
  /** The row being edited. */
  readonly row: T;
  /** The column definition. */
  readonly column: WrTableColumn<T>;
  /**
   * Keeps a value without ending the edit. Enter, Tab and a click outside the
   * cell commit the last one kept.
   */
  readonly set: (value: unknown) => void;
  /** Ends the edit with this value: the table emits `cellEdit` and focus returns to the cell. */
  readonly commit: (value: unknown) => void;
  /** Ends the edit and drops the pending value. Focus returns to the cell. */
  readonly cancel: () => void;
}
