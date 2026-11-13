/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrTableSortState } from './table-sort';

/**
 * Everything a reader can change about a `<wr-table>`, in one object: what
 * `(stateChange)` emits and `[state]` restores. It holds plain data, so a
 * state whose filter values are primitives survives `JSON.stringify`.
 */
export interface WrTableState {
  /** The sort, in application order: the `sort` model. */
  readonly sort: readonly WrTableSortState[];
  /**
   * The selected filter values per column key. A column with nothing selected
   * has no entry.
   */
  readonly filters: Readonly<Record<string, readonly unknown[]>>;
  /** The 1-based current page: the `page` model. */
  readonly page: number;
  /** The rows per page in force, `0` when the table does not page. */
  readonly pageSize: number;
  /** The `columnOrder` model: empty until a column is dragged. */
  readonly columnOrder: readonly string[];
  /** The `hiddenColumns` model. */
  readonly hiddenColumns: readonly string[];
}
