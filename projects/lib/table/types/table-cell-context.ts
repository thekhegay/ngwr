/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrTableColumn } from './table-columns';

/**
 * Implicit context passed to a `[wrTableCell]` template.
 */
export interface WrTableCellContext {
  /** Cell value (alias for `item[columnKey]`). Use as `let-value`. */
  readonly $implicit: unknown;
  /** The full row item. */
  readonly item: Record<string, unknown>;
  /** The column definition. */
  readonly column: WrTableColumn;
}
