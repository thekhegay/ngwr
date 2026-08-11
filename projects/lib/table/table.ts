/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { CdkDrag, type CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { DOCUMENT, NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import type { ElementRef, TemplateRef } from '@angular/core';
import {
  Component,
  PLATFORM_ID,
  ViewEncapsulation,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';

import { WrCheckbox } from 'ngwr/checkbox';
import { useI18nText } from 'ngwr/i18n';
import { WrPagination } from 'ngwr/pagination';
import { WrSpinner } from 'ngwr/spinner';

import type {
  WrTableCellContext,
  WrTableColumn,
  WrTableColumns,
  WrTableCsvOptions,
  WrTableExpandContext,
  WrTableFilterChange,
  WrTableFilterItem,
  WrTableGroupContext,
  WrTableSortState,
  WrTableSortDirection,
  WrTableSummary,
} from './interfaces';
import { WrTableCell } from './table-cell';
import { WrTableExpand } from './table-expand';
import { WrTableFilter } from './table-filter';
import { WrTableGroupHeader } from './table-group-header';
import { WrTableSort } from './table-sort';

/** Sentinel value for the single synthetic bucket used when grouping is off. */
const WR_TABLE_UNGROUPED = Symbol('wr-table-ungrouped');

/** One `<tbody>` row descriptor. Not exported — same precedent as the tree's flat node. */
type RenderRow =
  | { readonly kind: 'group'; readonly id: string; readonly group: WrTableGroupContext }
  | {
      readonly kind: 'row';
      readonly id: string;
      readonly row: Record<string, unknown>;
      /** 0 for a flat table and for every root; +1 per level in tree mode. */
      readonly depth: number;
      /** Whether this row owns a child array — drives the toggle vs the spacer. */
      readonly parent: boolean;
      /** Open state, `null` for a leaf (so `aria-expanded` is omitted entirely). */
      readonly open: boolean | null;
      /** 1-based position among its siblings, for `aria-posinset`. */
      readonly posinset: number;
      /** Sibling count, for `aria-setsize`. */
      readonly setsize: number;
    }
  | { readonly kind: 'group-foot'; readonly id: string; readonly summaries: ReadonlyMap<string, unknown> };

/** A flat row descriptor with the tree fields at their flat-table defaults. */
function flatRow(row: Record<string, unknown>, id: string, posinset: number, setsize: number): RenderRow {
  return { kind: 'row', id, row, depth: 0, parent: false, open: null, posinset, setsize };
}

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
  host: {
    class: 'wr-table',
    '[class.wr-table--responsive]': 'responsive()',
    '[class.wr-table--virtual]': 'virtualized()',
  },
  imports: [NgTemplateOutlet, CdkDropList, CdkDrag, WrCheckbox, WrPagination, WrSpinner, WrTableSort, WrTableFilter],
})
export class WrTable {
  /** Column definitions, keyed by row property name. */
  readonly columns = input.required<WrTableColumns>();

  /** Row items. `null`/`undefined` renders the empty state; use `[loading]` for the spinner. */
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

  /** Two-way bindable expanded row keys (needs a `[wrTableExpand]` template). */
  readonly expanded = model<readonly unknown[]>([]);

  /**
   * Group rows under collapsible band headers — a row property name, or a
   * function returning the group value. `null` (default) renders the table
   * exactly as before.
   *
   * Grouping runs AFTER pagination: it buckets the rows on the current page in
   * first-appearance order (it never re-sorts your data — same contract as
   * `[(sort)]`), so a group straddling a page boundary shows a band on both
   * pages, and per-group counts / subtotals are page-scoped. Sort `items` by the
   * same key upstream to keep groups whole, or pair with `pageSize = 0`.
   *
   * Group values are compared by identity (`Map`/`Set`, SameValueZero) — return
   * a primitive, exactly as for `rowKey`. Objects / `Date`s bucket by reference.
   *
   * @default null
   */
  readonly groupBy = input<string | ((row: Record<string, unknown>) => unknown) | null>(null);

  /**
   * Render the rows as a hierarchy: names the property (or computes the array)
   * holding each row's children. `items` then means the ROOTS, and the forest is
   * flattened depth-first into the same `<tbody>` — child rows are ordinary
   * `<tr>`s going through the same cell loop, so column pin / resize /
   * drag-reorder and `[wrTableCell]` templates keep working at every depth.
   *
   * Open state reuses the `expanded` model and row identity reuses `rowKey`, so
   * a tree needs no second key space. Everything collapsed is the default.
   *
   * **Mutually exclusive with `groupBy`** — a forest has no flat list to bucket,
   * so grouping wins and the hierarchy is ignored while it is set. Also
   * mutually exclusive with `[wrTableExpand]` detail rows: both own the row's
   * disclosure affordance.
   *
   * `pageSize` pages the ROOTS; a root brings its open descendants with it.
   *
   * @example
   * ```html
   * <wr-table
   *   rowKey="id"
   *   childrenKey="reports"
   *   treeColumn="name"
   *   [columns]="columns"
   *   [items]="org"
   *   [(expanded)]="open"
   * />
   * ```
   */
  readonly childrenKey = input<
    string | ((row: Record<string, unknown>) => readonly Record<string, unknown>[] | null | undefined) | null
  >(null);

  /**
   * Which column carries the indent and the expand toggle. Keyed, not
   * positional, so it survives a `columnOrder` drag. Defaults to whichever
   * column renders first.
   */
  readonly treeColumn = input<string | null>(null);

  /** Accessible name of a parent row's expand toggle. Falls back to `table.toggleRow`. */
  readonly toggleRowLabel = input<string | null>(null);

  /**
   * Two-way bindable collapsed group values (the values `groupBy` returns).
   * Keyed by value, so a collapsed group stays collapsed across page changes and
   * re-sorts. Empty (the default) shows every group expanded.
   */
  readonly collapsedGroups = model<readonly unknown[]>([]);

  /**
   * Render an aggregate row under each group using the same `column.summary`
   * definitions as the grand footer, computed over that group's rows on the
   * current page. No-op unless at least one column defines a `summary`. The grand
   * `<tfoot>` is unaffected and still aggregates the whole client dataset — with
   * client-side pagination the two describe different scopes, so pair grouping
   * with `pageSize = 0` when you need them to reconcile. @default false
   */
  readonly groupSummary = input(false, { transform: coerceBooleanProperty });

  /** Show the page-scoped row-count badge in each group band. @default true */
  readonly showGroupCount = input(true, { transform: coerceBooleanProperty });

  /** Two-way bindable sort array. Order in array = application order. */
  readonly sort = model<readonly WrTableSortState[]>([]);

  /** Text shown when there are no rows. Falls back to `table.empty`. */
  readonly emptyLabel = input<string | null>(null);

  /** Accessible name of a column's sort button. Falls back to `table.sort`. */
  readonly sortLabel = input<string | null>(null);

  /** Accessible name of the select-all checkbox. Falls back to `table.selectAll`. */
  readonly selectAllLabel = input<string | null>(null);

  /** Accessible name of a row's select checkbox. Falls back to `table.selectRow`. */
  readonly selectRowLabel = input<string | null>(null);

  /** Accessible name of a row's expand toggle. Falls back to `table.expandRow`. */
  readonly expandRowLabel = input<string | null>(null);

  /** Accessible name of a group band's select checkbox. Falls back to `table.selectGroup`. */
  readonly selectGroupLabel = input<string | null>(null);

  /** Accessible name of a group band's collapse toggle. Falls back to `table.toggleGroup`. */
  readonly toggleGroupLabel = input<string | null>(null);

  protected readonly resolvedEmptyLabel = useI18nText(this.emptyLabel, 'table.empty', 'No data');
  protected readonly resolvedSortLabel = useI18nText(this.sortLabel, 'table.sort', 'Sort column');
  protected readonly resolvedSelectAllLabel = useI18nText(this.selectAllLabel, 'table.selectAll', 'Select all rows');
  protected readonly resolvedSelectRowLabel = useI18nText(this.selectRowLabel, 'table.selectRow', 'Select row');
  protected readonly resolvedExpandRowLabel = useI18nText(this.expandRowLabel, 'table.expandRow', 'Toggle row details');
  protected readonly resolvedToggleRowLabel = useI18nText(this.toggleRowLabel, 'table.toggleRow', 'Toggle child rows');
  protected readonly resolvedSelectGroupLabel = useI18nText(this.selectGroupLabel, 'table.selectGroup', 'Select group');
  protected readonly resolvedToggleGroupLabel = useI18nText(this.toggleGroupLabel, 'table.toggleGroup', 'Toggle group');

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

  /**
   * Window the `<tbody>` so a table of thousands of rows keeps only ~one
   * viewport of `<tr>`s in the DOM. Opt-in and OFF by default — a table
   * without it renders byte-identically to today.
   *
   * Engages ONLY on the flat, fixed-height tier: it silently falls back to the
   * full render whenever a variable-height layout is active — `groupBy`, a
   * `[wrTableExpand]` template, `responsive` card mode, or a visible pager
   * (`pageSize > 0` / `totalItems`). While on, it forces fixed layout for
   * stable column widths and assumes a uniform row height (see `rowHeight`).
   *
   * Intended as static config. Give columns an explicit `width` so the frozen
   * layout is exact (a virtualized table always renders fixed-layout); toggling
   * it off at runtime leaves the frozen widths in place as column minimums.
   * @default false
   */
  readonly virtualScroll = input(false, { transform: coerceBooleanProperty });

  /**
   * Uniform body-row height in px used to map scroll offset to row index. `0`
   * (default) measures the first rendered row once — matching the density at
   * that point — and reuses it; pass an explicit value to remove the
   * post-hydration measure and make SSR pixel-exact (recommended if the density
   * can change at runtime). Read only when `virtualScroll` is on. Keep
   * virtualized cells single-line and no taller than this — a taller custom
   * `[wrTableCell]` template drifts the window. @default 0
   */
  readonly rowHeight = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /**
   * Height of the scroll viewport when `virtualScroll` is on — a number (px) or
   * any CSS length (`'70vh'`). Applied as `max-height` on `.wr-table__scroll`
   * (a short table shrinks to fit; a long one caps and scrolls). A numeric px
   * value lets the server prerender the exact first window. @default 480
   */
  readonly viewportHeight = input<number | string>(480);

  /** Extra rows kept rendered above and below the viewport as scroll headroom. @default 6 */
  readonly overscan = input(6, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 6)) });

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
    // Clamped, because `page` is a model the host owns and the data can shrink
    // under it — a filter or a delete used to leave the table showing an empty
    // slice with no way back except paging by hand. The pager clamps its own
    // number; this covers the case where the data drops below one page and the
    // pager is not even rendered.
    const lastPage = Math.max(1, Math.ceil(items.length / size));
    const start = (Math.min(this.page(), lastPage) - 1) * size;
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
   * Ambient reading direction, for the two header gestures that travel the
   * inline axis: the resize drag and the CDK's drop-slot index.
   *
   * Optional so a bare `TestBed` — or a consumer who never set a direction —
   * needs no provider; `Directionality` is root-provided anyway, and a missing
   * one reads as `ltr`. Read per gesture rather than cached, so a runtime `dir`
   * flip needs no subscription to `change`.
   */
  private readonly dir = inject(Directionality, { optional: true });

  private isRtl(): boolean {
    return this.dir?.value === 'rtl';
  }

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
    // Also drops the virtual freeze so activation effect (A), registered after
    // this, re-establishes it from the fresh natural widths.
    effect(() => {
      const keys = Object.keys(this.columns()).sort().join('\n');
      if (keys === this.lastColumnKeys) return;
      this.lastColumnKeys = keys;
      this.resizeWidths.set(new Map());
      this.fixedLayout.set(false);
      this.virtualFixed.set(false);
    });

    // (A) Virtual activation: freeze the natural column widths BEFORE fixed
    // layout applies (so there's no jump), then switch to fixed and measure the
    // row height. Tracks columns so a structural change re-freshes the widths —
    // registered AFTER the key-set reset above, so this freeze wins the tie.
    effect(() => {
      const active = this.virtualized();
      this.displayColumns(); // re-run on a structural column change
      // Both view queries are read TRACKED, and that is the whole point: a
      // constructor effect's first run happens before the view's first update
      // pass, so reading them inside `untracked` meant this ran once against an
      // empty DOM — no header cells to freeze, no row to measure — and never
      // again on a statically-configured table. The row height then silently
      // stayed on the 40px fallback and the column widths were never captured.
      const cells = this.headerCells();
      const scroll = this.scrollEl();
      if (!active) {
        this.virtualFixed.set(false);
        return;
      }
      if (!isPlatformBrowser(this.platformId)) return;
      if (cells.length === 0 || !scroll) return; // the view is not up yet; this re-runs when it is
      untracked(() => {
        this.freezeColumnWidths(); // captured while still auto-layout = natural widths
        this.virtualFixed.set(true); // now fixed, with those exact widths (no jump)
        if (this.rowHeight() === 0) {
          const row = scroll.nativeElement.querySelector<HTMLElement>('.wr-table__tr');
          const h = row?.offsetHeight ?? 0;
          if (h > 0) this.measuredRowPx.set(h);
        }
      });
    });

    // (B) Scroll + viewport observer — attached ONLY when virtual + browser, so
    // a non-virtual table gets no scroll listener / no per-scroll change detection.
    effect(onCleanup => {
      const el = this.scrollEl()?.nativeElement;
      if (!el || !this.virtualized() || !isPlatformBrowser(this.platformId)) return;
      let raf = 0;
      const onScroll = (): void => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          this.scrollTop.set(el.scrollTop);
        });
      };
      el.addEventListener('scroll', onScroll, { passive: true });
      this.viewportPx.set(el.clientHeight);
      const ro =
        typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.viewportPx.set(el.clientHeight)) : null;
      ro?.observe(el);
      onCleanup(() => {
        el.removeEventListener('scroll', onScroll);
        if (raf) cancelAnimationFrame(raf);
        ro?.disconnect();
      });
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

  /** Freeze every column at its current rendered header width (skips frozen keys). */
  private freezeColumnWidths(): void {
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
  }

  protected onResizeStart(event: PointerEvent, key: string, th: HTMLElement): void {
    event.preventDefault();
    event.stopPropagation();
    // Freeze every column at its current rendered width, then switch to fixed
    // layout — the drag then resizes precisely (both directions) without the
    // content-sized columns jumping.
    if (!this.fixedLayout()) {
      this.freezeColumnWidths();
      this.fixedLayout.set(true);
    }
    this.resizeKey = key;
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = th.offsetWidth;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  /**
   * Pointer travel along the INLINE axis since the drag started, in px.
   *
   * The grip sits on each column's inline-END edge, so a column grows as the
   * pointer moves away from that column's start: rightward in LTR, leftward in
   * RTL. Signed here once rather than sprinkled through the width maths — and
   * this sign is the pair of `inset-inline-end` on `.wr-table__resize-handle`,
   * so the two must move together.
   */
  private resizeDelta(clientX: number): number {
    return this.isRtl() ? this.resizeStartX - clientX : clientX - this.resizeStartX;
  }

  protected onResizeMove(event: PointerEvent): void {
    if (this.resizeKey === null) return;
    const width = Math.max(48, this.resizeStartWidth + this.resizeDelta(event.clientX));
    this.resizeWidths.set(new Map(this.resizeWidths()).set(this.resizeKey, width));
  }

  protected onResizeEnd(event: PointerEvent): void {
    if (this.resizeKey === null) return;
    const target = event.target as HTMLElement;
    if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId);
    this.resizeKey = null;
  }

  // --- Virtual scroll -------------------------------------------------------

  /** md-density fallback row height (px), used before measuring / on the server. */
  private static readonly FALLBACK_ROW_PX = 40;
  private static readonly FALLBACK_VIEWPORT_PX = 480;

  /** The `.wr-table__scroll` div (always in the template; only read when virtual). */
  private readonly scrollEl = viewChild<ElementRef<HTMLElement>>('scroll');
  /** Live vertical scroll offset (px); 0 on the server / before first scroll. */
  private readonly scrollTop = signal(0);
  /** Measured viewport clientHeight (px); 0 until the browser observer fires. */
  private readonly viewportPx = signal(0);
  /** Measured first-row height (px) when `rowHeight` is auto; 0 until measured. */
  private readonly measuredRowPx = signal(0);
  /** Fixed layout forced ON by virtualization (distinct from the resize latch). */
  private readonly virtualFixed = signal(false);

  /** `virtualScroll` requested AND the data shape is safe to window. SSR-deterministic. */
  protected readonly virtualized = computed<boolean>(
    () =>
      this.virtualScroll() &&
      this.groupBy() === null && // group bands / subtotals are variable height
      !this.treeMode() && // expanding re-anchors the window; needs scroll anchoring first
      !this.expandable() && // an injected detail <tr> desyncs uniform offsets
      !this.responsive() && // card mode has no uniform row height
      this.pageSize() === 0 && // a visible pager owns chunking — the pager wins
      this.totalItems() === null &&
      !!this.visibleItems()
  );

  /** Effective uniform row height (px). */
  protected readonly effRowH = computed<number>(() =>
    this.rowHeight() > 0 ? this.rowHeight() : this.measuredRowPx() || WrTable.FALLBACK_ROW_PX
  );

  /** Deterministic viewport px for SSR + first paint (numeric height, else fallback). */
  private readonly fallbackViewportPx = computed<number>(() => {
    const h = this.viewportHeight();
    return typeof h === 'number' ? h : WrTable.FALLBACK_VIEWPORT_PX;
  });

  /** `viewportHeight` as a CSS length for the inline max-height. */
  protected readonly resolvedViewportHeight = computed<string>(() => {
    const h = this.viewportHeight();
    return typeof h === 'number' ? `${h}px` : h;
  });

  /** Rendered window [start,end) + spacer pads (px). Pure math, O(1) per scroll frame. */
  protected readonly virtualWindow = computed<{ start: number; end: number; padTop: number; padBottom: number }>(() => {
    const total = this.renderRows().length;
    if (!this.virtualized() || total === 0) return { start: 0, end: total, padTop: 0, padBottom: 0 };
    const h = this.effRowH();
    const vp = this.viewportPx() || this.fallbackViewportPx();
    const over = this.overscan();
    // Clamp `first` to the last row: the window is a pure function of a pixel
    // offset, so if the row list shrinks while the user is scrolled deep — a
    // consumer filtering `items`, or a future hierarchy collapsing — `start`
    // overshoots `end` and `slice` returns nothing, leaving a blank body under a
    // spacer the old length's worth of pixels tall.
    const first = Math.min(Math.floor(this.scrollTop() / h), total - 1);
    // `+ 1` covers the partial row at the viewport's bottom edge: at overscan 0
    // with the scroll resting mid-row, `ceil(vp / h)` alone stops one row short.
    const count = Math.ceil(vp / h) + 1;
    const start = Math.max(0, first - over);
    const end = Math.min(total, first + count + over);
    return { start, end, padTop: start * h, padBottom: (total - end) * h };
  });

  /** Flat index of the first rendered window row (for `aria-rowindex`). */
  protected readonly windowStart = computed<number>(() => this.virtualWindow().start);

  /** Rows placed in `<tbody>`. SAME array instance as `renderRows()` when off → byte-identical DOM. */
  protected readonly windowRows = computed<readonly RenderRow[]>(() => {
    if (!this.virtualized()) return this.renderRows();
    const { start, end } = this.virtualWindow();
    return this.renderRows().slice(start, end);
  });

  /** Fixed layout is on when a resize drag latched it OR virtualization forces it. */
  protected readonly fixedLayoutActive = computed<boolean>(() => this.fixedLayout() || this.virtualFixed());

  /** Scroll a flat row index to the top of the virtual viewport. No-op on the server / when not virtual. */
  scrollToRow(index: number, behavior: ScrollBehavior = 'auto'): void {
    if (!isPlatformBrowser(this.platformId) || !this.virtualized()) return;
    this.scrollEl()?.nativeElement.scrollTo({ top: Math.max(0, index) * this.effRowH(), behavior });
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
   *
   * The index the CDK hands over is a slot in the pointer sweep it does along
   * the header, and that sweep is always left-to-right (`SingleAxisSortStrategy`
   * caches item rects sorted by `clientRect.left`). `displayColumns()` is DOM
   * order, which under `dir="rtl"` runs the other way — so without the mirror
   * the guard is asked about the column at the opposite end of the header, and
   * a drop lands on the pinned one it was meant to protect.
   *
   * The drop event itself needs no such mapping: `previousIndex` /
   * `currentIndex` come from `getItemIndex`, which the CDK already un-mirrors
   * back to DOM order.
   */
  protected readonly sortPredicate = (index: number): boolean => {
    const cols = this.displayColumns();
    const slot = this.isRtl() ? cols.length - 1 - index : index;
    return !cols[slot]?.column.pin;
  };

  // --- Row selection --------------------------------------------------------

  private rowKeyOf(row: Record<string, unknown>): unknown {
    const rk = this.rowKey();
    if (typeof rk === 'function') return rk(row);
    if (typeof rk === 'string') return row[rk];
    return row;
  }

  /** Keys of the rows on the current page — the select-all scope. */
  /**
   * Scope of the header select-all: the rows currently ON SCREEN. In tree mode
   * that is every VISIBLE node — a collapsed subtree is not on screen and is not
   * swept in, which keeps the checkbox honest about what it just did.
   */
  private readonly pageRowKeys = computed<readonly unknown[]>(() =>
    // `renderRows()` in EVERY mode, not only tree: it is the list that reaches the
    // screen. Reading `visibleItems()` outside tree mode swept in the rows of a
    // COLLAPSED group — invisible rows, silently selected, which is exactly what
    // the paragraph above promises does not happen.
    this.renderRows()
      .filter((entry): entry is Extract<RenderRow, { kind: 'row' }> => entry.kind === 'row')
      .map(entry => this.rowKeyOf(entry.row))
  );

  protected isRowSelected(row: Record<string, unknown>): boolean {
    return this.selectionSet().has(this.rowKeyOf(row));
  }

  /** Every current-page row selected (drives the header checkbox). */
  protected readonly allSelected = computed<boolean>(() => {
    const keys = this.pageRowKeys();
    if (keys.length === 0) return false;
    const sel = this.selectionSet();
    return keys.every(key => sel.has(key));
  });

  /** Some but not all selected (drives the header indeterminate). */
  protected readonly someSelected = computed<boolean>(() => {
    const sel = this.selectionSet();
    return this.pageRowKeys().some(key => sel.has(key)) && !this.allSelected();
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

  /** Add (or remove) a set of row keys from the selection in one update. */
  private applySelection(keys: readonly unknown[], checked: boolean): void {
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

  protected toggleAll(checked: boolean): void {
    this.applySelection(this.pageRowKeys(), checked);
  }

  // --- Row expansion --------------------------------------------------------

  private readonly expandTpl = contentChild(WrTableExpand);

  /** Whether the expand column shows (a `[wrTableExpand]` template was projected). */
  /**
   * Tree mode is on when `childrenKey` is set AND grouping is not. Grouping wins
   * deliberately: `groupBy` buckets a flat list and a forest has none, so rather
   * than half-support the pair the hierarchy is ignored while a group is set.
   */
  protected readonly treeMode = computed<boolean>(() => this.childrenKey() !== null && this.groupBy() === null);

  /** Detail rows and tree rows both own the row's disclosure — tree mode wins. */
  protected readonly expandable = computed<boolean>(() => !this.treeMode() && !!this.expandTpl());

  /** The column that carries the indent + toggle — named, else whichever renders first. */
  protected readonly treeColumnKey = computed<string | null>(() =>
    this.treeMode() ? (this.treeColumn() ?? this.displayColumns()[0]?.key ?? null) : null
  );

  /** This row's children, whatever shape `childrenKey` names. */
  private childrenOf(row: Record<string, unknown>): readonly Record<string, unknown>[] {
    const ck = this.childrenKey();
    if (ck === null) return [];
    const raw = typeof ck === 'function' ? ck(row) : row[ck];
    return Array.isArray(raw) ? (raw as readonly Record<string, unknown>[]) : [];
  }

  /**
   * Depth-first flatten of the forest, descending only into open parents.
   * `seen` is path-scoped rather than global: the same row legitimately appearing
   * under two parents is fine, a row appearing under itself is a cycle and would
   * otherwise hang the walk.
   */
  private flattenForest(roots: readonly Record<string, unknown>[]): readonly RenderRow[] {
    const open = new Set(this.expanded());
    const out: RenderRow[] = [];

    const walk = (
      rows: readonly Record<string, unknown>[],
      depth: number,
      prefix: string,
      seen: ReadonlySet<unknown>
    ): void => {
      rows.forEach((row, i) => {
        const key = this.rowKeyOf(row);
        if (seen.has(key)) return;
        const children = this.childrenOf(row);
        const parent = children.length > 0;
        const isOpen = parent && open.has(key);
        out.push({
          kind: 'row',
          id: `${prefix}r${i}`,
          row,
          depth,
          parent,
          open: parent ? isOpen : null,
          posinset: i + 1,
          setsize: rows.length,
        });
        if (isOpen) walk(children, depth + 1, `${prefix}r${i}-`, new Set(seen).add(key));
      });
    };

    walk(roots, 0, '', new Set());
    return out;
  }

  /** Every node in the forest, depth-first — what selection and CSV must see. */
  private allTreeRows(): readonly Record<string, unknown>[] {
    const out: Record<string, unknown>[] = [];
    const walk = (rows: readonly Record<string, unknown>[], seen: ReadonlySet<unknown>): void => {
      for (const row of rows) {
        const key = this.rowKeyOf(row);
        if (seen.has(key)) continue;
        out.push(row);
        const children = this.childrenOf(row);
        if (children.length > 0) walk(children, new Set(seen).add(key));
      }
    };
    walk(this.items() ?? [], new Set());
    return out;
  }

  /** Open / close one parent row. */
  protected toggleTreeRow(row: Record<string, unknown>): void {
    const key = this.rowKeyOf(row);
    const open = this.expanded();
    this.expanded.set(open.includes(key) ? open.filter(k => k !== key) : [...open, key]);
  }

  /** Open every parent in the forest. */
  expandAllRows(): void {
    this.expanded.set(
      this.allTreeRows()
        .filter(row => this.childrenOf(row).length > 0)
        .map(row => this.rowKeyOf(row))
    );
  }

  /** Close every parent. */
  collapseAllRows(): void {
    this.expanded.set([]);
  }

  /** Leading control columns — selection + expand. */
  protected readonly leadingCols = computed<number>(() => (this.rowSelection() ? 1 : 0) + (this.expandable() ? 1 : 0));

  /** Total rendered columns (data + leading), for detail-row / empty colspans. */
  protected readonly totalCols = computed<number>(() => this.displayColumns().length + this.leadingCols());

  protected expandTemplate(): TemplateRef<WrTableExpandContext> | undefined {
    return this.expandTpl()?.template;
  }

  protected isExpanded(row: Record<string, unknown>): boolean {
    return this.expanded().includes(this.rowKeyOf(row));
  }

  protected toggleExpand(row: Record<string, unknown>): void {
    const key = this.rowKeyOf(row);
    const set = this.expanded();
    this.expanded.set(set.includes(key) ? set.filter(k => k !== key) : [...set, key]);
  }

  protected expandContext(row: Record<string, unknown>): WrTableExpandContext {
    return { $implicit: row, row };
  }

  // --- Summary row ----------------------------------------------------------

  /** Whether any column defines a `summary` (so the footer row shows). */
  protected readonly hasSummary = computed<boolean>(() =>
    Object.values(this.columns()).some(col => col.summary !== undefined)
  );

  /** Per-column footer values, computed over `items` (the current page in server mode). */
  private readonly summaries = computed<ReadonlyMap<string, unknown>>(() => {
    // Every node in tree mode, not just the roots — a headcount that ignored
    // children would be wrong in the obvious way.
    const rows = this.datasetRows();
    const map = new Map<string, unknown>();
    for (const [key, col] of Object.entries(this.columns())) {
      if (col.summary !== undefined) map.set(key, this.computeSummary(col.summary, rows, key));
    }
    return map;
  });

  protected summaryFor(key: string): unknown {
    return this.summaries().get(key) ?? '';
  }

  // --- Row grouping ---------------------------------------------------------

  private readonly groupTpl = contentChild(WrTableGroupHeader);

  protected groupTemplate(): TemplateRef<WrTableGroupContext> | undefined {
    return this.groupTpl()?.template;
  }

  /**
   * Rows on the current page bucketed by `groupBy`, in first-appearance order.
   * Depends only on `visibleItems()` + `groupBy` (not on collapse / summary), so
   * a collapse toggle never re-buckets. The ungrouped path returns one synthetic
   * bucket holding the same array instance `visibleItems()` returned.
   */
  private readonly groupBuckets = computed<readonly { value: unknown; rows: readonly Record<string, unknown>[] }[]>(
    () => {
      const rows = this.visibleItems() ?? [];
      const by = this.groupBy();
      if (by === null) return [{ value: WR_TABLE_UNGROUPED, rows }];
      const buckets = new Map<unknown, Record<string, unknown>[]>();
      for (const row of rows) {
        const value = typeof by === 'function' ? by(row) : row[by];
        const bucket = buckets.get(value);
        if (bucket) bucket.push(row);
        else buckets.set(value, [row]);
      }
      return Array.from(buckets, ([value, groupRows]) => ({ value, rows: groupRows }));
    }
  );

  /**
   * The flat `<tbody>` render list. Ungrouped it is exactly today's rows in
   * order (the rendered elements are unchanged; only the `@for` track identity
   * moves to a stable id). Returns `[]` for both no-rows and loading — the
   * template's `@if (visibleItems())` guard keeps the loading case from showing
   * the empty row.
   */
  protected readonly renderRows = computed<readonly RenderRow[]>(() => {
    const rows = this.visibleItems();
    if (!rows) return [];
    const buckets = this.groupBuckets();

    if (this.groupBy() === null) {
      const roots = buckets[0].rows;
      if (this.treeMode()) return this.flattenForest(roots);
      return roots.map((row, i) => flatRow(row, `r${i}`, i + 1, roots.length));
    }

    const collapsed = new Set(this.collapsedGroups());
    const summaryCols =
      this.groupSummary() && this.hasSummary()
        ? Object.entries(this.columns()).filter(([, c]) => c.summary !== undefined)
        : [];

    const out: RenderRow[] = [];
    buckets.forEach((bucket, gi) => {
      const isCollapsed = collapsed.has(bucket.value);
      const label = this.groupLabelOf(bucket.value);
      const group: WrTableGroupContext = {
        $implicit: bucket.value,
        value: bucket.value,
        label,
        rows: bucket.rows,
        count: bucket.rows.length,
        collapsed: isCollapsed,
        index: gi,
        toggle: () => this.toggleGroupCollapse(bucket.value),
      };
      out.push({ kind: 'group', id: `g${gi}`, group });
      if (isCollapsed) return;
      bucket.rows.forEach((row, ri) => out.push(flatRow(row, `g${gi}r${ri}`, ri + 1, bucket.rows.length)));
      if (summaryCols.length) {
        const summaries = new Map<string, unknown>();
        for (const [key, col] of summaryCols) summaries.set(key, this.computeSummary(col.summary!, bucket.rows, key));
        out.push({ kind: 'group-foot', id: `g${gi}f`, summaries });
      }
    });
    return out;
  });

  /** Default band label — the primitive as text, `'—'` for empty, JSON for objects. */
  private groupLabelOf(value: unknown): string {
    if (value == null || value === '') return '—';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') return String(value);
    // Objects / symbols / functions aren't the documented contract (groupBy
    // should return a primitive, like rowKey); format gracefully anyway.
    try {
      return JSON.stringify(value) ?? '—';
    } catch {
      return '—';
    }
  }

  protected toggleGroupCollapse(value: unknown): void {
    const set = this.collapsedGroups();
    this.collapsedGroups.set(set.includes(value) ? set.filter(v => v !== value) : [...set, value]);
  }

  /** Collapse every group on the current page. No-op when `groupBy` is unset. */
  collapseAllGroups(): void {
    if (this.groupBy() === null) return;
    this.collapsedGroups.set(this.groupBuckets().map(b => b.value));
  }

  /** Expand every group. */
  expandAllGroups(): void {
    this.collapsedGroups.set([]);
  }

  // --- Group selection (memoized Set; reuses the row-selection primitive) ----

  /** Memoized selection as a Set — O(1) membership for row + group + select-all checks. */
  private readonly selectionSet = computed<ReadonlySet<unknown>>(() => new Set(this.selection()));

  protected groupChecked(rows: readonly Record<string, unknown>[]): boolean {
    if (rows.length === 0) return false;
    const sel = this.selectionSet();
    return rows.every(r => sel.has(this.rowKeyOf(r)));
  }

  protected groupIndeterminate(rows: readonly Record<string, unknown>[]): boolean {
    const sel = this.selectionSet();
    return rows.some(r => sel.has(this.rowKeyOf(r))) && !this.groupChecked(rows);
  }

  protected toggleGroupSelection(rows: readonly Record<string, unknown>[], checked: boolean): void {
    this.applySelection(
      rows.map(r => this.rowKeyOf(r)),
      checked
    );
  }

  // --- CSV export -----------------------------------------------------------

  private readonly doc = inject(DOCUMENT);

  /**
   * Build the table as an RFC-4180 CSV string — a header row from the column
   * titles, then one row per item in the current column order. Values are taken
   * from the row data, not from custom `[wrTableCell]` templates.
   *
   * Covers the current `items`, so in server-side mode (`totalItems` set) it
   * exports the current page, while client-side pagination exports every page.
   *
   * Returns the string; use `exportCsv()` when you want it downloaded as a file.
   *
   * @example
   * ```ts
   * const csv = this.table().toCsv({ delimiter: ';' });
   * ```
   */
  toCsv(options: WrTableCsvOptions = {}): string {
    const delimiter = options.delimiter ?? ',';
    const escapeFormulas = options.escapeFormulas ?? true;
    const cols = this.displayColumns();
    const rows = options.selectedOnly ? this.selectedRows() : this.datasetRows();
    const text = (value: unknown): string => {
      if (value == null) return '';
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
      if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
      try {
        return JSON.stringify(value) ?? '';
      } catch {
        // Circular structures and nested bigints throw — never fail the export over one cell.
        return '';
      }
    };
    const cell = (value: unknown): string => {
      let s = text(value);
      // Spreadsheets evaluate cells starting with these, so neutralize them into text.
      if (escapeFormulas && typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return s.includes(delimiter) || /["\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [cols.map(col => cell(col.column.title)).join(delimiter)];
    for (const row of rows) lines.push(cols.map(col => cell(row[col.key])).join(delimiter));
    return lines.join('\r\n');
  }

  /** Download the table as a CSV file. No-op on the server. */
  exportCsv(options: WrTableCsvOptions = {}): void {
    if (!isPlatformBrowser(this.platformId)) return;
    // Lead with a BOM so Excel reads the file as UTF-8.
    const blob = new Blob([`\uFEFF${this.toCsv(options)}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = this.doc.createElement('a');
    link.href = url;
    link.download = options.filename ?? 'table.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url));
  }

  /**
   * Every row of the dataset. Flat that is `items`; in tree mode it is the whole
   * forest depth-first, so selection, CSV and the grand summary count children
   * instead of silently reporting roots only.
   */
  private datasetRows(): readonly Record<string, unknown>[] {
    return this.treeMode() ? this.allTreeRows() : (this.items() ?? []);
  }

  private selectedRows(): readonly Record<string, unknown>[] {
    const keys = new Set(this.selection());
    return this.datasetRows().filter(row => keys.has(this.rowKeyOf(row)));
  }

  private computeSummary(kind: WrTableSummary, rows: readonly Record<string, unknown>[], key: string): unknown {
    if (typeof kind === 'function') return kind(rows);
    // Drop empty/nullish cells first — `Number('')`/`Number(null)` are 0 and
    // would otherwise skew the aggregate.
    const values = rows.map(row => row[key]).filter(v => v != null && v !== '');
    if (kind === 'count') return values.length;
    const nums = values.map(Number).filter(Number.isFinite);
    if (nums.length === 0) return '';
    const sum = nums.reduce((a, b) => a + b, 0);
    switch (kind) {
      case 'sum':
        return sum;
      case 'avg':
        return Math.round((sum / nums.length) * 100) / 100;
      case 'min':
        return Math.min(...nums);
      case 'max':
        return Math.max(...nums);
      default:
        return '';
    }
  }

  protected directionFor(key: string): WrTableSortDirection {
    return this.sort().find(s => s.key === key)?.direction ?? null;
  }

  /**
   * `aria-sort` for a column header, per the WAI-ARIA table pattern. Only a
   * sortable column gets the attribute at all: on a plain column it would claim
   * the header is sortable when it is not.
   */
  protected ariaSortFor(key: string, sortable: boolean | undefined): 'ascending' | 'descending' | 'none' | null {
    if (!sortable) return null;
    const dir = this.directionFor(key);
    return dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none';
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
