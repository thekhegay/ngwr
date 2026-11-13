/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrTableRow } from './table-row';

/**
 * Context of the `[wrTableSelectionBar]` template, the actions of the bar the
 * table draws over its header while rows are selected.
 */
export interface WrTableSelectionContext<T extends WrTableRow = WrTableRow> {
  /**
   * The selected rows the table holds, in `items` order. In server mode
   * (`total` set) that is the selected rows of the current page: a key
   * selected on another page is counted and is not here.
   */
  readonly $implicit: readonly T[];
  /** How many keys `selection` holds. */
  readonly count: number;
  /** Empties the selection. Focus goes back to the table when it was in the bar. */
  readonly clear: () => void;
  /**
   * What the header select-all covers: `selectAllScope`, or `'page'` in server
   * mode, where the table holds one page.
   */
  readonly scope: 'page' | 'all';
}
