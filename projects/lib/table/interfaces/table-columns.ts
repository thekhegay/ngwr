/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrTableFilterItem } from './table-filter-item';

/**
 * A column's footer aggregate — a built-in over its numeric values, or a
 * function given all rows that returns the value to display.
 */
export type WrTableSummary =
  'sum' | 'avg' | 'count' | 'min' | 'max' | ((rows: readonly Record<string, unknown>[]) => unknown);

/** A single column definition. */
export interface WrTableColumn {
  /** Heading shown in the column's header. */
  readonly title: string;
  /** Show a clickable sort indicator in the header. */
  readonly sortable?: boolean;
  /** When non-empty, shows a filter dropdown in the header. */
  readonly filterItems?: readonly WrTableFilterItem[];
  /**
   * Freeze the column against the left or right edge — it stays visible while
   * the rest of the table scrolls horizontally. Pin the leftmost columns
   * `'left'` and the rightmost `'right'`; several per side stack in order.
   */
  readonly pin?: 'left' | 'right';
  /** Show a drag handle on the header edge to resize the column. */
  readonly resizable?: boolean;
  /** Initial column width in px. Overridden once the user drags to resize. */
  readonly width?: number;
  /**
   * Footer aggregate for this column — renders a summary row when any column
   * sets it. Computed over the current `items`, so in server-side mode
   * (`totalItems` set) it reflects the current page, not the whole dataset.
   */
  readonly summary?: WrTableSummary;
}

/**
 * Column map — keys are the row's property names; values are column defs.
 *
 * @example
 * ```ts
 * const columns: WrTableColumns = {
 *   name:  { title: 'Name', sortable: true },
 *   email: { title: 'Email' },
 *   role:  { title: 'Role', filterItems: [{ title: 'Admin', value: 'admin' }] },
 * };
 * ```
 */
export type WrTableColumns = Record<string, WrTableColumn>;
