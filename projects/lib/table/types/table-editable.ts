/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrTableRow } from './table-row';

/**
 * Decides whether one cell can be edited, from its row and its column key. It
 * is asked only for a column that has a `[wrTableEditCell]` template and does
 * not say `editable: false`, and it runs during change detection: keep it a
 * pure read of the row.
 */
export type WrTableEditable<T extends WrTableRow = WrTableRow> = (row: T, key: string) => boolean;
