/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrTableGroupContext } from './table-group-context';

/**
 * Which footer a summary FUNCTION is computing — its second argument.
 *
 * One `column.summary` feeds both the grand `<tfoot>` row and, with
 * `groupSummary`, the subtotal row under each group, and the rows alone cannot
 * tell the two apart: a table with one group hands the grand total the very
 * rows the subtotal had. `scope` says which one is being asked for, and a
 * subtotal also gets the group it belongs to.
 *
 * A one-argument function still fits, since TypeScript accepts a callback that
 * ignores trailing parameters, so a summary written before this existed keeps
 * compiling.
 *
 * @example
 * ```ts
 * region: { title: 'Region', summary: (rows, { scope }) => (scope === 'group' ? 'Subtotal' : 'Total') }
 * ```
 */
export type WrTableSummaryContext =
  | {
      /** The grand total in the `<tfoot>` row, over the whole client dataset. */
      readonly scope: 'total';
      /** No group: the total spans all of them. */
      readonly group: null;
    }
  | {
      /** A per-group subtotal row (`groupSummary`), over that group's rows on the current page. */
      readonly scope: 'group';
      /** The group being subtotalled — its value, label, rows and count. */
      readonly group: WrTableGroupContext;
    };
