/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrTableFilterItem } from './table-filter-item';

/** Payload emitted by `<wr-table>` when a column's filter selection changes. */
export interface WrTableFilterChange {
  readonly key: string;
  readonly items: readonly WrTableFilterItem[];
}
