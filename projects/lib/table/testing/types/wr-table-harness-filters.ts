/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-table>` a harness query matches. */
export interface WrTableHarnessFilters extends BaseHarnessFilters {
  /**
   * Match a table that renders a column with this header title — the readable way
   * to tell two tables on one page apart. A string is an exact match, a RegExp is
   * tested.
   */
  readonly columnTitle?: string | RegExp;
  /** Match only hierarchies (`true` — a `treegrid`) or only flat tables (`false`). */
  readonly tree?: boolean;
}

/** Narrows which body row a harness query matches. */
export interface WrTableRowHarnessFilters extends BaseHarnessFilters {
  /** Match a row where ANY data cell's text matches. A string is exact, a RegExp is tested. */
  readonly cellText?: string | RegExp;
  /** Match only selected (`true`) or only unselected (`false`) rows. */
  readonly selected?: boolean;
  /** Match only open (`true`) or only closed (`false`) rows — a detail row or a tree branch. */
  readonly expanded?: boolean;
  /**
   * Match the row's 1-based `aria-level`, i.e. its depth in a tree. Rows of a flat
   * table announce no level and never match.
   */
  readonly level?: number;
}

/** Narrows which data cell a harness query matches. */
export interface WrTableCellHarnessFilters extends BaseHarnessFilters {
  /** Match the cell's text — a string is an exact match, a RegExp is tested. */
  readonly text?: string | RegExp;
  /** Match the title of the column the cell sits in. */
  readonly columnTitle?: string | RegExp;
}

/** Narrows which column header a harness query matches. */
export interface WrTableHeaderCellHarnessFilters extends BaseHarnessFilters {
  /** Match the column title — a string is an exact match, a RegExp is tested. */
  readonly text?: string | RegExp;
  /** Match only sortable (`true`) or only plain (`false`) columns. */
  readonly sortable?: boolean;
}
