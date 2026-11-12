/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrTableRow } from './table-row';

/** Payload emitted by `<wr-table>` when a body row is clicked. */
export interface WrTableRowClick<T extends WrTableRow = WrTableRow> {
  /** The row's own object, as it sits in `items` (or in a parent's children in tree mode). */
  readonly row: T;
  /**
   * Position of the row in `items`, whatever the page, sort, group or scroll
   * window on screen. `-1` for a child row in tree mode, which `items` does
   * not hold.
   */
  readonly index: number;
  /** The click itself, for its modifier keys. */
  readonly event: MouseEvent;
}
