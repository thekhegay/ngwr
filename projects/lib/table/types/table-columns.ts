/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrClassInput } from 'ngwr/utils';

import type { WrTableFilterItem } from './table-filter-item';
import type { WrTableRow } from './table-row';
import type { WrTableSummaryContext } from './table-summary-context';

/**
 * A column's footer aggregate — a built-in over its numeric values, or a
 * function given the rows that returns the value to display. The function's
 * second argument says whether it is computing the grand total or a group's
 * subtotal; see {@link WrTableSummaryContext}.
 *
 * A built-in reads the column's cells, `null`, `undefined` and `''` left out.
 * Over `number` cells the arithmetic is the engine's and the result a number,
 * `avg` rounded to two places. A column holding decimal strings (`'19.99'`)
 * is aggregated exactly through `wrDecimal` from `ngwr/utils` and the result
 * is a string: `'0.1'` and `'0.2'` sum to `'0.3'`, and a value with more
 * digits than a double holds survives. One string in the column is enough; a
 * number beside it is read exactly too. `avg` then divides at the widest
 * scale among the cells, never fewer than two places, half away from zero. A
 * cell that is not a number (`'abc'`, `NaN`) is left out of either path, as
 * it always was, so a `count` beside a `sum` is the way to see it.
 */
export type WrTableSummary =
  | 'sum'
  | 'avg'
  | 'count'
  | 'min'
  | 'max'
  | ((rows: readonly Record<string, unknown>[], context: WrTableSummaryContext) => unknown);

/**
 * Where a column's text sits on the inline axis. Logical, like the rest of the
 * table: `end` is the right edge in LTR and the left one under `dir="rtl"`.
 */
export type WrTableColumnAlign = 'start' | 'center' | 'end';

/**
 * What a cell does with text wider than its column. `'tooltip'` keeps the
 * cell on one line behind an ellipsis and shows the full text in a tooltip on
 * hover and focus, only while the text is cut.
 */
export type WrTableTruncate = 'tooltip';

/**
 * A single column definition.
 *
 * `T` is the row, so `format` sees it typed. The default is `WrTableRow`
 * (`object`): a bare `WrTableColumn` still describes a column of any table, and
 * a `WrTableColumns<User>` binds only to a table whose `[items]` are `User`s.
 */
export interface WrTableColumn<T extends WrTableRow = WrTableRow> {
  /** Heading shown in the column's header. */
  readonly title: string;
  /**
   * A longer explanation of the column, shown as a tooltip on its header and
   * added to the names of its sort button and filter trigger. With an empty
   * `title` (an icon column) it is the column's name.
   */
  readonly headerHint?: string;
  /** Show a clickable sort indicator in the header. */
  readonly sortable?: boolean;
  /** When non-empty, shows a filter dropdown in the header. */
  readonly filterItems?: readonly WrTableFilterItem[];
  /**
   * Freeze the column against the left or right edge — it stays visible while
   * the rest of the table scrolls horizontally. Pin the leftmost columns
   * `'left'` and the rightmost `'right'`; several per side stack in order.
   */
  readonly pin?: 'left' | 'right';
  /**
   * `false` keeps the column out of reach of `hiddenColumns`: it is always
   * shown, and its checkbox in the column chooser is disabled.
   */
  readonly hideable?: boolean;
  /** Show a drag handle on the header edge to resize the column. */
  readonly resizable?: boolean;
  /** Initial column width in px. Overridden once the user drags to resize. */
  readonly width?: number;
  /**
   * Footer aggregate for this column — renders a summary row when any column
   * sets it. Computed over the current `items`, so in server-side mode
   * (`total` set) it reflects the current page, not the whole dataset.
   */
  readonly summary?: WrTableSummary;
  /**
   * Alignment of the header, body and summary cells, as
   * `.wr-table__th--align-<x>` on the header and `.wr-table__td--align-<x>` on
   * the body and footer cells. `end` is the numeric column's alignment, and it
   * brings tabular digits with it so the figures line up down the column.
   * Unset leaves the cells at `start`.
   */
  readonly align?: WrTableColumnAlign;
  /**
   * Text of a plain cell, from the value and its row - a date in the app's
   * format, a price with its currency. Not called for a cell with no value
   * (see `empty`), and never for a column a `[wrTableCell]` template draws: the
   * template owns its cell. The CSV export writes it either way.
   */
  readonly format?: (value: unknown, row: T) => string;
  /**
   * Placeholder for a cell whose value is `null`, `undefined` or `''`. `0` and
   * `false` are values and render as such. A `[wrTableCell]` template is not
   * replaced by it: the template reads the value and decides. The CSV export
   * writes the placeholder for a no-value cell.
   */
  readonly empty?: string;
  /**
   * `'tooltip'` cuts this column's cells to one line with an ellipsis and shows
   * a cut cell's full text in a tooltip. `null` turns the table's own
   * `truncate` off for this column; unset follows it. A cell is cut only where
   * the column cannot grow: give it a `width`.
   */
  readonly truncate?: WrTableTruncate | null;
  /**
   * Extra CSS classes for this column's header cell AND every body cell under
   * it - the one place to set a monospace face or any other treatment of your
   * own, since the `<th>` and `<td>` are ngwr's own elements and a cell
   * template renders INSIDE the `<td>` rather than as it.
   *
   * The summary and group-footer cells are deliberately left out: they are a
   * different row with their own classes. Alignment has its own key, `align`,
   * and that one reaches them, since a total belongs under its figures.
   */
  readonly class?: WrClassInput;
}

/**
 * Column map — keys are the row's property names; values are column defs.
 * Name the row type to have `format` see it: `WrTableColumns<User>`.
 *
 * @example
 * ```ts
 * const columns: WrTableColumns<User> = {
 *   name:  { title: 'Name', sortable: true },
 *   email: { title: 'Email', empty: '-' },
 *   role:  { title: 'Role', filterItems: [{ title: 'Admin', value: 'admin' }] },
 *   spent: { title: 'Spent', align: 'end', format: (value, row) => `${row.currency} ${value}` },
 * };
 * ```
 */
export type WrTableColumns<T extends WrTableRow = WrTableRow> = Record<string, WrTableColumn<T>>;
