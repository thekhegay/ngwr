/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrClassInput } from 'ngwr/utils';

/**
 * Decides the extra classes on one body row.
 *
 * Called with the row and its index in the rendered body, so a table that is
 * grouped, sorted, tree-flattened or virtualized passes the index of the row as
 * DRAWN rather than its position in `items` — the number beside it on screen.
 *
 * It runs during change detection for every visible row, so keep it a pure read
 * of the row: a lookup that allocates, or one that reads a signal it also
 * writes, is paid once per row per pass.
 *
 * The row arrives as `Record<string, unknown>` rather than as the app's own
 * model, the same way `rowKey` takes it: `[items]` is `object` so that an
 * `interface User` can bind at all, and a callback typed against that would
 * accept nothing. An inline arrow infers the parameter and needs no annotation;
 * a named function wants its own cast.
 */
export type WrTableRowClass = (row: Record<string, unknown>, index: number) => WrClassInput;
