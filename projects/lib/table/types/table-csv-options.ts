/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Options for `WrTable.toCsv()` / `WrTable.exportCsv()`. */
export interface WrTableCsvOptions {
  /** Download filename. @default 'table.csv' */
  readonly filename?: string;
  /** Export only the selected rows (needs `rowSelection`). @default false */
  readonly selectedOnly?: boolean;
  /** Field delimiter — use `';'` for locales where Excel expects it. @default ',' */
  readonly delimiter?: string;
  /**
   * Prefix string values and `format` output starting with `= + - @` with a
   * quote so spreadsheets treat them as text instead of formulas. A plain figure
   * such as `-1,234.50`, from a string cell or `format`, is left alone. @default true
   */
  readonly escapeFormulas?: boolean;
}
