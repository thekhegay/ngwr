/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrTableRow } from './table-row';

/**
 * Where a body row leads: an href, or `null` for a row that leads nowhere.
 *
 * With `WrTableRouting` from `ngwr/table/router` on the table the value is a
 * router link instead, a URL string or an array of commands, the two forms
 * `routerLink` takes. An array needs the adapter: without it the row gets no
 * link.
 *
 * It runs for every rendered row when the rows, the function or a signal it
 * reads change: keep it a pure read of the row.
 */
export type WrTableRowLink<T extends WrTableRow = WrTableRow> = (
  row: T
) => string | readonly unknown[] | null | undefined;
