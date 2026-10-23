/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The figures behind a chart, as {@link WrChartTable} renders them for assistive
 * technology: a caption, a row of column headings, and the rows in groups.
 *
 * Every string arrives written: a value as the chart prints it, a heading as the
 * chart names it. The table formats nothing and translates nothing.
 *
 * @internal
 */
export interface WrChartTableData {
  /** What the table is: the chart's accessible name, rendered as the `<caption>`. */
  readonly caption: string;
  /**
   * The heading of the row headers' column: what one row is — a day, a point, an
   * axis. Omitted or empty, that cell is an empty `<td>` rather than a `<th>` with
   * no name. The group headers' column, when there is one, is never headed.
   */
  readonly corner?: string;
  /** One heading per value column, in the order of every row's `cells`. */
  readonly columns: readonly string[];
  /**
   * The rows, one `<tbody>` per group. A chart with one set of rows — x labels down,
   * series across — passes a single group with no `header`; a scatter passes a group
   * per series, headed by the series' name.
   */
  readonly groups: readonly WrChartTableGroup[];
}

/**
 * One `<tbody>` of a {@link WrChartTableData}.
 *
 * @internal
 */
export interface WrChartTableGroup {
  /**
   * Names the group, as a `<th scope="rowgroup">` in a leading column that spans the
   * group's rows, so it heads every cell of the group. Once any group has a header the
   * table carries that column, and a group without one leaves its cell there empty.
   */
  readonly header?: string;
  /** The group's rows, in order. A group with none renders nothing. */
  readonly rows: readonly WrChartTableRow[];
}

/**
 * One row of a {@link WrChartTableGroup}.
 *
 * @internal
 */
export interface WrChartTableRow {
  /** What the row is, rendered as its `<th scope="row">`. */
  readonly header: string;
  /**
   * One value per column, written the way the chart prints it. A value the series
   * does not have — a gap in a line — is the chart's to write, as an empty string for
   * an empty cell or as its own word.
   */
  readonly cells: readonly string[];
}
