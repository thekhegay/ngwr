/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { KeyValuePipe, NgTemplateOutlet } from '@angular/common';
import type { TemplateRef } from '@angular/core';
import { Component, ViewEncapsulation, computed, contentChildren, input, model, output } from '@angular/core';

import { WrPagination } from 'ngwr/pagination';
import { WrSpinner } from 'ngwr/spinner';

import { WrTableCell } from './table-cell';
import { WrTableFilter } from './table-filter';
import { WrTableSort } from './table-sort';
import type {
  WrTableCellContext,
  WrTableColumns,
  WrTableFilterChange,
  WrTableFilterItem,
  WrTableSortState,
  WrTableSortDirection,
} from './types';

/**
 * Data table with sortable / filterable headers and custom cell templates.
 *
 * Columns are defined via the `columns` input (a `Record<key, column>`).
 * Rows are objects whose property names match the column keys. Cells can
 * be customised by projecting an `[wrTableCell]="key"` template.
 *
 * @example
 * ```html
 * <wr-table
 *   [columns]="columns"
 *   [items]="rows"
 *   [(sort)]="sort"
 *   (filterChange)="onFilter($event)"
 * >
 *   <ng-template wrTableCell="role" let-value>
 *     <wr-tag [color]="value === 'admin' ? 'danger' : 'medium'">{{ value }}</wr-tag>
 *   </ng-template>
 * </wr-table>
 * ```
 *
 * @see https://ngwr.dev/docs/components/table
 */
@Component({
  selector: 'wr-table',
  templateUrl: './table.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-table' },
  imports: [NgTemplateOutlet, KeyValuePipe, WrPagination, WrSpinner, WrTableSort, WrTableFilter],
})
export class WrTable {
  /** Column definitions, keyed by row property name. */
  readonly columns = input.required<WrTableColumns>();

  /** Row items. `null`/`undefined` → loading skeleton. */
  readonly items = input<readonly Record<string, unknown>[] | null | undefined>(null);

  /** Show the loading spinner overlay. @default false */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /** Two-way bindable sort array. Order in array = application order. */
  readonly sort = model<readonly WrTableSortState[]>([]);

  /** Fires whenever a column's filter selection changes. */
  readonly filterChange = output<WrTableFilterChange>();

  /**
   * Rows per page. Set to `0` (default) to disable client-side pagination
   * and render every row at once.
   */
  readonly pageSize = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /** Two-way bindable 1-based current page. */
  readonly page = model<number>(1);

  /**
   * Total row count for server-side pagination — when set, the table
   * shows the pager but does NOT slice `items` (you provide the current
   * page's slice yourself and react to `(page)` changes).
   */
  readonly totalItems = input<number | null>(null);

  /** Total row count derived for the pager (server-mode wins). */
  protected readonly resolvedTotal = computed<number>(() => {
    const server = this.totalItems();
    if (server !== null) return server;
    return this.items()?.length ?? 0;
  });

  /** Items visible on the current page (client mode slices; server mode passes through). */
  protected readonly visibleItems = computed<readonly Record<string, unknown>[] | null | undefined>(() => {
    const items = this.items();
    if (!items) return items;
    const size = this.pageSize();
    if (size <= 0 || this.totalItems() !== null) return items;
    const start = (this.page() - 1) * size;
    return items.slice(start, start + size);
  });

  /** Show the pager footer only when paging is enabled and rows overflow. */
  protected readonly showPager = computed<boolean>(() => {
    const size = this.pageSize();
    return size > 0 && this.resolvedTotal() > size;
  });

  private readonly cellTemplates = contentChildren(WrTableCell);

  /** Map of column key → custom template (if provided via `[wrTableCell]`). */
  protected readonly cellMap = computed(() => {
    const map = new Map<string, TemplateRef<WrTableCellContext>>();
    for (const cell of this.cellTemplates()) map.set(cell.columnKey(), cell.template);
    return map;
  });

  /** Keep KeyValuePipe in declaration order (comparator that treats all keys as equal). */
  protected readonly keepOrder = (): number => 0;

  protected directionFor(key: string): WrTableSortDirection {
    return this.sort().find(s => s.key === key)?.direction ?? null;
  }

  protected cycleSort(key: string): void {
    const current = this.directionFor(key);
    const next: WrTableSortDirection = current === null ? 'asc' : current === 'asc' ? 'desc' : null;

    const list = this.sort().filter(s => s.key !== key);
    if (next !== null) list.push({ key, direction: next });
    this.sort.set(list);
  }

  protected onFilter(key: string, items: readonly WrTableFilterItem[]): void {
    this.filterChange.emit({ key, items });
  }

  protected cellContext(item: Record<string, unknown>, key: string, column: unknown): WrTableCellContext {
    return { $implicit: item[key], item, column: column as WrTableCellContext['column'] };
  }

  protected getValue(item: Record<string, unknown>, key: unknown): unknown {
    return item[String(key)];
  }

  protected templateFor(key: unknown): TemplateRef<WrTableCellContext> | undefined {
    return this.cellMap().get(String(key));
  }
}
