/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { CdkDrag, type CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import type { ElementRef, TemplateRef } from '@angular/core';
import {
  Component,
  PLATFORM_ID,
  ViewEncapsulation,
  computed,
  contentChildren,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrCheckbox } from 'ngwr/checkbox';
import { WrPagination } from 'ngwr/pagination';
import { WrSpinner } from 'ngwr/spinner';

import type {
  WrTableCellContext,
  WrTableColumn,
  WrTableColumns,
  WrTableFilterChange,
  WrTableFilterItem,
  WrTableSortState,
  WrTableSortDirection,
} from './interfaces';
import { WrTableCell } from './table-cell';
import { WrTableFilter } from './table-filter';
import { WrTableSort } from './table-sort';

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
 * @see https://ngwr.dev/reference/components/table
 */
@Component({
  selector: 'wr-table',
  templateUrl: './table.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-table', '[class.wr-table--responsive]': 'responsive()' },
  imports: [
    NgTemplateOutlet,
    FormsModule,
    CdkDropList,
    CdkDrag,
    WrCheckbox,
    WrPagination,
    WrSpinner,
    WrTableSort,
    WrTableFilter,
  ],
})
export class WrTable {
  /** Column definitions, keyed by row property name. */
  readonly columns = input.required<WrTableColumns>();

  /** Row items. `null`/`undefined` → loading skeleton. */
  readonly items = input<readonly Record<string, unknown>[] | null | undefined>(null);

  /** Show the loading spinner overlay. @default false */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /**
   * Collapse each row to a labelled card when the table's own box is too narrow
   * for columns (a container query on its own width, not the viewport). Every
   * cell shows its column title as a label. @default false
   */
  readonly responsive = input(false, { transform: coerceBooleanProperty });

  /** Enable drag-to-reorder on the column headers. @default false */
  readonly reorderable = input(false, { transform: coerceBooleanProperty });

  /**
   * Two-way bindable column order — an array of column keys. Reflects and drives
   * the header order: the table falls back to declaration order for any key not
   * listed, and updates this on drag. Bind it to persist a user's arrangement.
   */
  readonly columnOrder = model<readonly string[]>([]);

  /**
   * Row selection with a leading checkbox column — `'multiple'` adds a
   * select-all header; `'single'` keeps one row selected. @default null (off)
   */
  readonly rowSelection = input<'single' | 'multiple' | null>(null);

  /**
   * How to identify a row for selection — a property name or a function.
   * Unset uses the row object itself (fine for a stable row array).
   */
  readonly rowKey = input<string | ((row: Record<string, unknown>) => unknown) | null>(null);

  /** Two-way bindable selected row keys. */
  readonly selection = model<readonly unknown[]>([]);

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

  // --- Column pinning -------------------------------------------------------

  private readonly platformId = inject(PLATFORM_ID);
  private readonly headerCells = viewChildren<ElementRef<HTMLElement>>('thCell');

  /**
   * Columns in render order — declaration order, overridden by `columnOrder`
   * once reordered; new keys append, removed keys drop out. Pin and resize
   * measurement key off this, so it must equal the rendered order.
   */
  protected readonly displayColumns = computed<readonly { key: string; column: WrTableColumn }[]>(() => {
    const cols = this.columns();
    const seen = new Set<string>();
    const result: { key: string; column: WrTableColumn }[] = [];
    for (const key of this.columnOrder()) {
      if (Object.hasOwn(cols, key) && !seen.has(key)) {
        result.push({ key, column: cols[key] });
        seen.add(key);
      }
    }
    for (const key of Object.keys(cols)) {
      if (!seen.has(key)) {
        result.push({ key, column: cols[key] });
        seen.add(key);
      }
    }
    return result;
  });

  /**
   * Sticky offsets for pinned columns, measured from the header cells so any
   * number of columns can stack per side. Also names the inner-edge column on
   * each side (where the separating shadow sits). Empty until measured in the
   * browser; on the server the pins stay at offset 0, corrected on hydration.
   */
  private readonly pins = signal<{
    left: ReadonlyMap<string, number>;
    right: ReadonlyMap<string, number>;
    leftEdge: string | null;
    rightEdge: string | null;
  }>({ left: new Map(), right: new Map(), leftEdge: null, rightEdge: null });

  constructor() {
    // Re-measure whenever the columns or their rendered widths change. Tables
    // with no pinned column skip the observer entirely.
    effect(onCleanup => {
      const cells = this.headerCells();
      const cols = this.displayColumns();
      if (!cols.some(c => c.column.pin)) {
        this.pins.set({ left: new Map(), right: new Map(), leftEdge: null, rightEdge: null });
        return;
      }
      if (!isPlatformBrowser(this.platformId) || typeof ResizeObserver === 'undefined') {
        this.measurePins(cols, cells);
        return;
      }
      const observer = new ResizeObserver(() => this.measurePins(cols, cells));
      for (const cell of cells) observer.observe(cell.nativeElement);
      this.measurePins(cols, cells);
      onCleanup(() => observer.disconnect());
    });

    // Reset resize state when the column KEY SET changes (added/removed/renamed)
    // so a stale frozen width can't collapse a new column under the latched
    // fixed layout. Keyed on sorted keys, not object identity (which churns).
    effect(() => {
      const keys = Object.keys(this.columns()).sort().join('\n');
      if (keys === this.lastColumnKeys) return;
      this.lastColumnKeys = keys;
      this.resizeWidths.set(new Map());
      this.fixedLayout.set(false);
    });
  }

  private measurePins(
    cols: readonly { key: string; column: WrTableColumn }[],
    cells: readonly ElementRef<HTMLElement>[]
  ): void {
    const left = new Map<string, number>();
    const right = new Map<string, number>();
    let leftEdge: string | null = null;
    let rightEdge: string | null = null;

    let acc = 0;
    for (let i = 0; i < cols.length; i++) {
      if (cols[i].column.pin === 'left') {
        left.set(cols[i].key, acc);
        acc += cells[i]?.nativeElement.offsetWidth ?? 0;
        leftEdge = cols[i].key;
      }
    }
    acc = 0;
    for (let i = cols.length - 1; i >= 0; i--) {
      if (cols[i].column.pin === 'right') {
        right.set(cols[i].key, acc);
        acc += cells[i]?.nativeElement.offsetWidth ?? 0;
        rightEdge = cols[i].key;
      }
    }
    this.pins.set({ left, right, leftEdge, rightEdge });
  }

  /** Sticky `left` offset (px) for a left-pinned column, else `null`. */
  protected leftPin(key: string): number | null {
    return this.pins().left.get(key) ?? null;
  }

  /** Sticky `right` offset (px) for a right-pinned column, else `null`. */
  protected rightPin(key: string): number | null {
    return this.pins().right.get(key) ?? null;
  }

  /** Whether `key` is the inner-edge pinned column on `side` (carries the shadow). */
  protected isPinEdge(key: string, side: 'left' | 'right'): boolean {
    return (side === 'left' ? this.pins().leftEdge : this.pins().rightEdge) === key;
  }

  // --- Column resizing ------------------------------------------------------

  private readonly resizeWidths = signal<ReadonlyMap<string, number>>(new Map());
  private resizeKey: string | null = null;
  private resizeStartX = 0;
  private resizeStartWidth = 0;
  private lastColumnKeys = '';

  /**
   * Once a column has been dragged, the table switches to fixed layout so the
   * `<col>` widths are honoured exactly (auto layout treats them as minimums).
   */
  protected readonly fixedLayout = signal(false);

  /** Current width (px) for a column, or `null` for auto — a live resize wins. */
  protected colWidth(key: string): number | null {
    return this.resizeWidths().get(key) ?? this.columns()[key]?.width ?? null;
  }

  protected onResizeStart(event: PointerEvent, key: string, th: HTMLElement): void {
    event.preventDefault();
    event.stopPropagation();
    // Freeze every column at its current rendered width, then switch to fixed
    // layout — the drag then resizes precisely (both directions) without the
    // content-sized columns jumping.
    if (!this.fixedLayout()) {
      const cols = this.displayColumns();
      const cells = this.headerCells();
      const frozen = new Map(this.resizeWidths());
      for (let i = 0; i < cols.length; i++) {
        if (!frozen.has(cols[i].key)) {
          const width = cells[i]?.nativeElement.offsetWidth;
          if (width) frozen.set(cols[i].key, width);
        }
      }
      this.resizeWidths.set(frozen);
      this.fixedLayout.set(true);
    }
    this.resizeKey = key;
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = th.offsetWidth;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected onResizeMove(event: PointerEvent): void {
    if (this.resizeKey === null) return;
    const width = Math.max(48, this.resizeStartWidth + (event.clientX - this.resizeStartX));
    this.resizeWidths.set(new Map(this.resizeWidths()).set(this.resizeKey, width));
  }

  protected onResizeEnd(event: PointerEvent): void {
    if (this.resizeKey === null) return;
    const target = event.target as HTMLElement;
    if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId);
    this.resizeKey = null;
  }

  protected onColumnDrop(event: CdkDragDrop<unknown>): void {
    if (event.previousIndex === event.currentIndex) return;
    const order = this.displayColumns().map(c => c.key);
    moveItemInArray(order, event.previousIndex, event.currentIndex);
    this.columnOrder.set(order);
  }

  /**
   * Keep pinned columns anchored — a drop can't land on a pinned column's slot,
   * so a scrollable column can't be dragged into the frozen region at either edge.
   */
  protected readonly sortPredicate = (index: number): boolean => !this.displayColumns()[index]?.column.pin;

  // --- Row selection --------------------------------------------------------

  private rowKeyOf(row: Record<string, unknown>): unknown {
    const rk = this.rowKey();
    if (typeof rk === 'function') return rk(row);
    if (typeof rk === 'string') return row[rk];
    return row;
  }

  /** Keys of the rows on the current page — the select-all scope. */
  private readonly pageRowKeys = computed<readonly unknown[]>(() =>
    (this.visibleItems() ?? []).map(row => this.rowKeyOf(row))
  );

  protected isRowSelected(row: Record<string, unknown>): boolean {
    return this.selection().includes(this.rowKeyOf(row));
  }

  /** Every current-page row selected (drives the header checkbox). */
  protected readonly allSelected = computed<boolean>(() => {
    const keys = this.pageRowKeys();
    if (keys.length === 0) return false;
    const sel = this.selection();
    return keys.every(key => sel.includes(key));
  });

  /** Some but not all selected (drives the header indeterminate). */
  protected readonly someSelected = computed<boolean>(() => {
    const sel = this.selection();
    return this.pageRowKeys().some(key => sel.includes(key)) && !this.allSelected();
  });

  protected toggleRow(row: Record<string, unknown>, checked: boolean): void {
    const key = this.rowKeyOf(row);
    if (this.rowSelection() === 'single') {
      this.selection.set(checked ? [key] : []);
      return;
    }
    const sel = this.selection();
    this.selection.set(checked ? [...sel, key] : sel.filter(k => k !== key));
  }

  protected toggleAll(checked: boolean): void {
    const keys = this.pageRowKeys();
    const sel = this.selection();
    if (checked) {
      const merged = new Set(sel);
      for (const key of keys) merged.add(key);
      this.selection.set([...merged]);
    } else {
      const drop = new Set(keys);
      this.selection.set(sel.filter(k => !drop.has(k)));
    }
  }

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
