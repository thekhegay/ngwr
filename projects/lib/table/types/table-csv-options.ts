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
   * Prefix string values starting with `= + - @` with a quote so spreadsheets
   * treat them as text instead of formulas. @default true
   */
  readonly escapeFormulas?: boolean;
}
