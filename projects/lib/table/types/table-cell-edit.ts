/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrTableRow } from './table-row';

/**
 * Payload emitted by `<wr-table>` when a cell edit commits. The table does not
 * write the value: the handler updates the data behind `items`.
 */
export interface WrTableCellEdit<T extends WrTableRow = WrTableRow> {
  /** The row's own object, as it sits in `items`. */
  readonly row: T;
  /** The column key of the edited cell. */
  readonly key: string;
  /** The committed value. */
  readonly value: unknown;
  /** The cell's value when the edit started. */
  readonly previous: unknown;
}
