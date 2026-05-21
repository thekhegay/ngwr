/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { KeyValuePipe, NgTemplateOutlet } from '@angular/common';
import type { TemplateRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  contentChildren,
  input,
  model,
  output,
} from '@angular/core';

import { WrSpinnerComponent } from 'ngwr/spinner';

import { WrTableCellDirective } from './table-cell.directive';
import { WrTableFilterComponent } from './table-filter.component';
import { WrTableSortComponent } from './table-sort.component';
import type {
  WrTableCellContext,
  WrTableColumns,
  WrTableFilterChange,
  WrTableFilterItem,
  WrTableSort,
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
  templateUrl: './table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-table' },
  imports: [NgTemplateOutlet, KeyValuePipe, WrSpinnerComponent, WrTableSortComponent, WrTableFilterComponent],
})
export class WrTableComponent {
  /** Column definitions, keyed by row property name. */
  readonly columns = input.required<WrTableColumns>();

  /** Row items. `null`/`undefined` → loading skeleton. */
  readonly items = input<readonly Record<string, unknown>[] | null | undefined>(null);

  /** Show the loading spinner overlay. @default false */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /** Two-way bindable sort array. Order in array = application order. */
  readonly sort = model<readonly WrTableSort[]>([]);

  /** Fires whenever a column's filter selection changes. */
  readonly filterChange = output<WrTableFilterChange>();

  private readonly cellTemplates = contentChildren(WrTableCellDirective);

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
