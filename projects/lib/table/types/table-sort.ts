/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrTableSortDirection } from './table-sort-direction';

/**
 * Per-column sort state. The full sort emitted by `<wr-table>` is an
 * array of these — the order in the array is the application order.
 */
export interface WrTableSortState {
  readonly key: string;
  readonly direction: WrTableSortDirection;
}
