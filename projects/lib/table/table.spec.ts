import { type Direction, Directionality } from '@angular/cdk/bidi';
import { CdkDropList } from '@angular/cdk/drag-drop';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { Subject } from 'rxjs';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { noop } from 'ngwr/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrTable } from './table';
import { WrTableExpand } from './table-expand';
import { WrTableGroupHeader } from './table-group-header';
import { WrTableSort } from './table-sort';
import type { WrTableSortDirection, WrTableColumns, WrTableSummaryContext } from './types';

@Component({
  imports: [WrTable],
  template: `<wr-table [columns]="columns" [items]="items()" [loading]="loading()" />`,
})
class LoadingHost {
  protected readonly columns = COLUMNS;
  readonly items = signal<readonly Record<string, unknown>[] | null>([]);
  readonly loading = signal(true);
}

/**
 * The whole point of this host is that it COMPILES.
 *
 * `[items]` used to be `readonly Record<string, unknown>[]`, and TypeScript
 * withholds the implicit index signature from an `interface` — so an app whose
 * model was declared `interface User` could not bind its own data, while the
 * identical `type User` could. The failure read as "the table refuses my array".
 *
 * `strictTemplates` type-checks this file, so narrowing the input again fails the
 * build here rather than in someone's app. Deliberately an `interface`, and
 * deliberately not exercised at runtime — there is nothing to assert that the
 * rendering tests below do not already cover.
 */
interface SpecUser {
  id: number;
  name: string;
  role: string;
}

@Component({
  imports: [WrTable],
  template: `<wr-table [columns]="columns" [items]="users" />`,
})
class InterfaceRowsHost {
  protected readonly columns = COLUMNS;
  protected readonly users: SpecUser[] = [{ id: 1, name: 'Ada', role: 'admin' }];
}

/**
 * The same contract for the callbacks, and `childrenKey` is the one that can
 * still fail it: its function form RETURNS rows, and a return declared
 * `Record<string, unknown>[]` refuses an array of `interface`-typed children —
 * a forest that binds to `[items]` whose children cannot come back out of
 * `[childrenKey]`.
 *
 * `rowKey` pins the incantation `WrTableRow`'s doc prescribes: the parameter is
 * the record form, so reaching an interface needs `as unknown as`, and a single
 * `as SpecNode` there is a TS2352 error rather than a cast.
 */
interface SpecNode {
  id: string;
  name: string;
  role: string;
  kids?: SpecNode[];
}

@Component({
  imports: [WrTable],
  template: `
    <wr-table
      treeColumn="name"
      [columns]="columns"
      [items]="forest"
      [rowKey]="rowKey"
      [childrenKey]="childrenKey"
      [expanded]="['src']"
    />
  `,
})
class InterfaceForestHost {
  protected readonly columns = COLUMNS;
  protected readonly forest: SpecNode[] = [
    { id: 'src', name: 'src', role: 'dir', kids: [{ id: 'main', name: 'main.ts', role: 'file' }] },
  ];
  protected readonly rowKey = (row: Record<string, unknown>): unknown => (row as unknown as SpecNode).id;
  protected readonly childrenKey = (row: Record<string, unknown>): readonly SpecNode[] | undefined =>
    (row as unknown as SpecNode).kids;
}

const COLUMNS: WrTableColumns = {
  name: { title: 'Name', sortable: true },
  role: { title: 'Role' },
};

const ROWS = [
  { id: 1, name: 'Ada', role: 'admin' },
  { id: 2, name: 'Linus', role: 'user' },
  { id: 3, name: 'Grace', role: 'admin' },
];

const FOREST = [
  {
    id: 'src',
    name: 'src',
    role: 'dir',
    kids: [
      { id: 'app', name: 'app', role: 'dir', kids: [{ id: 'main', name: 'main.ts', role: 'file' }] },
      { id: 'styles', name: 'styles.css', role: 'file' },
    ],
  },
  { id: 'readme', name: 'README.md', role: 'file' },
];

@Component({
  imports: [WrTable],
  template: `
    <wr-table
      [columns]="columns()"
      [items]="items()"
      rowKey="id"
      [(selection)]="selection"
      [rowSelection]="rowSelection()"
      [groupBy]="groupBy()"
      [childrenKey]="childrenKey()"
      [pageSize]="pageSize()"
      [(page)]="page"
      [(collapsedGroups)]="collapsedGroups"
    />
  `,
})
class Host {
  readonly columns = signal(COLUMNS);
  readonly items = signal<readonly Record<string, unknown>[]>(ROWS);
  readonly selection = signal<readonly unknown[]>([]);
  readonly rowSelection = signal<'single' | 'multiple' | null>(null);
  readonly groupBy = signal<string | null>(null);
  readonly childrenKey = signal<string | null>(null);
  readonly pageSize = signal(0);
  readonly page = signal(1);
  readonly collapsedGroups = signal<readonly unknown[]>([]);
}

@Component({
  imports: [WrTable],
  template: ` <wr-table [columns]="columns()" [items]="items()" rowKey="id" virtualScroll [viewportHeight]="200" /> `,
})
class VirtualHost {
  readonly columns = signal(COLUMNS);
  readonly items = signal<readonly Record<string, unknown>[]>(
    Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}`, role: 'user' }))
  );
}

@Component({
  imports: [WrTable],
  template: `
    <wr-table
      [columns]="columns()"
      [items]="items()"
      rowKey="id"
      virtualScroll
      [viewportHeight]="200"
      [responsive]="responsive()"
    />
  `,
})
class ResponsiveVirtualHost {
  readonly columns = signal(COLUMNS);
  readonly responsive = signal(false);
  readonly items = signal<readonly Record<string, unknown>[]>(
    Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}`, role: 'user' }))
  );
}

/**
 * `wr-table` is the library's data workhorse and most of its surface is opt-in
 * modes. What this suite pins is the part that is easy to break silently: the
 * ROLE the table announces (a hierarchy is a `treegrid`, a flat list is not),
 * and the three mode pairs the component refuses rather than half-supports.
 *
 * Those refusals are the interesting contract. "Grouping wins over tree" is a
 * decision, not an accident — a `groupBy` buckets a flat list and a forest has
 * no flat list to bucket — and a silent change to it would leave a hierarchy
 * rendering as a shuffled flat table with no error anywhere.
 */
/**
 * A dataset past V8's spread-argument limit (~125k), paged down to ten rows on
 * screen. A summary aggregates the WHOLE dataset, never the page, so the row
 * count the footer works over is the `items` length regardless of `pageSize`.
 */
@Component({
  imports: [WrTable],
  template: `<wr-table [columns]="columns" [items]="items" [pageSize]="10" />`,
})
class BigSummaryHost {
  protected readonly items = Array.from({ length: 150_000 }, (_, i) => ({ id: i + 1, lo: i + 1, hi: i + 1 }));
  protected readonly columns: WrTableColumns = {
    lo: { title: 'Lo', summary: 'min' },
    hi: { title: 'Hi', summary: 'max' },
  };
}

describe('WrTable', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const table = (): HTMLElement => root().querySelector<HTMLElement>('table')!;
  const headers = (): string[] =>
    [...root().querySelectorAll<HTMLElement>('th')].map(th => th.textContent.replace(/\s+/g, ' ').trim());
  const bodyRows = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('tbody tr')];
  const cellTexts = (): string[][] =>
    bodyRows().map(r => [...r.querySelectorAll('td')].map(td => td.textContent.replace(/\s+/g, ' ').trim()));
  const selection = (): readonly unknown[] => fixture.componentInstance.selection();

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders a header per column and a row per item', () => {
    expect(headers()).toEqual(expect.arrayContaining(['Name', 'Role']));
    expect(bodyRows()).toHaveLength(3);
    expect(cellTexts()[0]).toEqual(['Ada', 'admin']);
  });

  it('follows an items array written from outside', () => {
    fixture.componentInstance.items.set([{ id: 9, name: 'Ken', role: 'user' }]);
    fixture.detectChanges();

    expect(cellTexts()).toEqual([['Ken', 'user']]);
  });

  it('renders the empty state for a null items input, the way `items` documents', () => {
    fixture.componentInstance.items.set(null as never);
    fixture.detectChanges();

    // `<= 1` used to be the whole assertion, and it passes at 0 rows as happily
    // as at 1 — which is what let a nullish `[items]` (the input's own DEFAULT)
    // render a header over a blank body with no message anywhere, while the
    // JSDoc promised the empty state.
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0].querySelector('.wr-table__empty')?.textContent?.trim()).toBe('No data');
  });

  describe('row selection', () => {
    const boxes = (): HTMLInputElement[] => [
      ...root().querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]'),
    ];
    const selectAll = (): HTMLInputElement | null =>
      root().querySelector<HTMLInputElement>('thead input[type="checkbox"]');

    beforeEach(() => {
      fixture.componentInstance.rowSelection.set('multiple');
      fixture.detectChanges();
    });

    it('adds a checkbox per row plus a select-all in the header', () => {
      expect(boxes()).toHaveLength(3);
      expect(selectAll()).not.toBeNull();
      // Named, because a checkbox in a header cell has no visible label.
      expect(selectAll()!.getAttribute('aria-label')).toBeTruthy();
    });

    it('collects the row key, not the row object', () => {
      boxes()[0].click();
      fixture.detectChanges();

      // `rowKey="id"` is what makes a selection survive a refetch that hands
      // back equal-but-not-identical row objects.
      expect(selection()).toEqual([1]);
    });

    it('drops a key again when its row is unchecked', () => {
      boxes()[1].click();
      fixture.detectChanges();
      boxes()[1].click();
      fixture.detectChanges();

      expect(selection()).toEqual([]);
    });

    it('select-all takes every row, and clears them all again', () => {
      selectAll()!.click();
      fixture.detectChanges();
      expect(selection()).toEqual([1, 2, 3]);

      selectAll()!.click();
      fixture.detectChanges();
      expect(selection()).toEqual([]);
    });

    it('refuses the select-all when there is nothing to sweep', () => {
      fixture.componentInstance.items.set([]);
      fixture.detectChanges();

      // `[checked]` is one-way over a checkbox that owns its own state, and
      // `allSelected()` is `false` both before and after a click on zero rows —
      // an unchanged input is never written back, so the box used to latch
      // CHECKED over an empty table and stay checked when rows came back.
      expect(selectAll()!.disabled).toBe(true);

      selectAll()!.click();
      fixture.detectChanges();

      expect(selectAll()!.checked).toBe(false);
      expect(selection()).toEqual([]);

      fixture.componentInstance.items.set(ROWS);
      fixture.detectChanges();

      expect(selectAll()!.checked).toBe(false);
      expect(boxes().map(b => b.checked)).toEqual([false, false, false]);
    });

    it('shows the header box as indeterminate for a partial selection', () => {
      boxes()[0].click();
      fixture.detectChanges();

      // Neither checked nor unchecked is the truthful state, and it is the one
      // a screen reader reads as "mixed".
      expect(selectAll()!.indeterminate).toBe(true);
    });

    it('offers no select-all in single mode', () => {
      fixture.componentInstance.rowSelection.set('single');
      fixture.detectChanges();

      expect(selectAll()).toBeNull();
      expect(boxes().length).toBeGreaterThan(0);
    });

    it('checks the rows named by a selection written from outside', () => {
      fixture.componentInstance.selection.set([2]);
      fixture.detectChanges();

      // Synchronous, and that is the point: bound through `[ngModel]` this
      // needed a microtask to land, because the classic-forms bridge defers its
      // write. `wr-checkbox.checked` is a `model()`, so the direct binding
      // updates in the same change-detection pass.
      expect(boxes().map(b => b.checked)).toEqual([false, true, false]);
    });
  });

  describe('tree mode', () => {
    beforeEach(() => {
      fixture.componentInstance.items.set(FOREST);
      fixture.componentInstance.childrenKey.set('kids');
      fixture.detectChanges();
    });

    it('announces a treegrid, since the rows are a hierarchy', () => {
      // A forest rendered as a plain `table` tells a screen reader the depth is
      // decoration. The role is the only place that structure lives.
      expect(table().getAttribute('role')).toBe('treegrid');
    });

    it('shows the roots collapsed, with the children out of the way', () => {
      expect(cellTexts().map(c => c[0])).toEqual(['src', 'README.md']);
    });

    it('is a plain table again once the hierarchy is gone', () => {
      fixture.componentInstance.childrenKey.set(null);
      fixture.componentInstance.items.set(ROWS);
      fixture.detectChanges();

      expect(table().getAttribute('role')).toBeNull();
    });

    it('describes where each row sits in the hierarchy', () => {
      // Depth and position are what a treegrid announces INSTEAD of the visual
      // indent, so they have to be on the row rather than in the cell padding.
      const rows = bodyRows();
      expect(rows[0].getAttribute('aria-level')).toBe('1');
      expect(rows[0].getAttribute('aria-posinset')).toBe('1');
      expect(rows[0].getAttribute('aria-expanded')).toBe('false');
      expect(rows[1].getAttribute('aria-posinset')).toBe('2');
    });

    it('says nothing about expansion for a row with no children', () => {
      // `aria-expanded="false"` on a leaf promises a subtree that is not there.
      expect(bodyRows()[1].getAttribute('aria-expanded')).toBeNull();
      expect(bodyRows()[1].querySelector('.wr-table__tree-toggle--leaf')).not.toBeNull();
    });

    it('opens a branch on click, one level at a time', () => {
      const toggle = (): HTMLButtonElement => bodyRows()[0].querySelector<HTMLButtonElement>('.wr-table__tree-toggle')!;

      toggle().click();
      fixture.detectChanges();

      // The grandchild stays hidden: opening `src` reveals its children, not its
      // whole subtree.
      expect(cellTexts().map(c => c[0])).toEqual(['src', 'app', 'styles.css', 'README.md']);
      expect(bodyRows()[0].getAttribute('aria-expanded')).toBe('true');
      expect(bodyRows()[1].getAttribute('aria-level')).toBe('2');
    });

    it('opens the level below that, and closes the whole branch again', () => {
      const toggleIn = (index: number): HTMLButtonElement =>
        bodyRows()[index].querySelector<HTMLButtonElement>('.wr-table__tree-toggle')!;

      toggleIn(0).click();
      fixture.detectChanges();
      toggleIn(1).click();
      fixture.detectChanges();
      expect(cellTexts().map(c => c[0])).toEqual(['src', 'app', 'main.ts', 'styles.css', 'README.md']);
      expect(bodyRows()[2].getAttribute('aria-level')).toBe('3');

      // Collapsing the root takes the descendants with it, however deep they were.
      toggleIn(0).click();
      fixture.detectChanges();
      expect(cellTexts().map(c => c[0])).toEqual(['src', 'README.md']);
    });

    it('lets grouping win, rather than half-supporting the pair', () => {
      fixture.componentInstance.groupBy.set('role');
      fixture.detectChanges();

      // Documented and deliberate: `groupBy` buckets a flat list and a forest
      // has none. Silently changing which one wins would render a hierarchy as
      // a shuffled flat table with no error anywhere.
      expect(table().getAttribute('role')).toBeNull();
    });
  });

  describe('grouping', () => {
    beforeEach(() => {
      fixture.componentInstance.groupBy.set('role');
      fixture.detectChanges();
    });

    it('inserts a header row per bucket without losing any data row', () => {
      const first = cellTexts().map(c => c[0]);

      expect(first).toContain('Ada');
      expect(first).toContain('Linus');
      expect(bodyRows().length).toBeGreaterThan(3);
    });
  });

  describe('paging', () => {
    beforeEach(() => {
      fixture.componentInstance.items.set(
        Array.from({ length: 7 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}`, role: 'user' }))
      );
      fixture.componentInstance.pageSize.set(3);
      fixture.detectChanges();
    });

    it('slices the page it was asked for', () => {
      expect(cellTexts().map(c => c[0])).toEqual(['Row 1', 'Row 2', 'Row 3']);

      fixture.componentInstance.page.set(3);
      fixture.detectChanges();
      expect(cellTexts().map(c => c[0])).toEqual(['Row 7']);
    });

    it('still shows rows when the data shrinks under the current page', () => {
      // `page` is a model the host owns and a filter can shrink `items` beneath
      // it. The slice used to run off the end and render nothing at all — an
      // empty table with no hint that the fix is to page backwards.
      fixture.componentInstance.page.set(3);
      fixture.detectChanges();

      fixture.componentInstance.items.set([{ id: 1, name: 'Only', role: 'user' }]);
      fixture.detectChanges();

      expect(cellTexts().map(c => c[0])).toEqual(['Only']);
    });

    it('falls back to the first page for a page below 1', () => {
      // The offset was clamped at the top only. `page = 0` gave `slice(-3, 0)`
      // — the empty-state row over a populated dataset — and `page = -1` gave
      // `slice(-6, -3)`, which `Array.slice` resolves from the END, so the table
      // rendered a page from the back while the pager highlighted nothing.
      fixture.componentInstance.page.set(0);
      fixture.detectChanges();
      expect(cellTexts().map(c => c[0])).toEqual(['Row 1', 'Row 2', 'Row 3']);

      fixture.componentInstance.page.set(-1);
      fixture.detectChanges();
      expect(cellTexts().map(c => c[0])).toEqual(['Row 1', 'Row 2', 'Row 3']);

      fixture.componentInstance.page.set(Number.NaN);
      fixture.detectChanges();
      expect(cellTexts().map(c => c[0])).toEqual(['Row 1', 'Row 2', 'Row 3']);
    });
  });

  describe('select-all scope', () => {
    beforeEach(() => {
      fixture.componentInstance.rowSelection.set('multiple');
      fixture.componentInstance.groupBy.set('role');
      fixture.detectChanges();
    });

    it('takes only the rows on screen when a group is collapsed', () => {
      // The scope is documented as "the rows currently ON SCREEN", and outside
      // tree mode it read the page slice instead — so a collapsed group's rows
      // were selected invisibly, and the header box claimed everything.
      fixture.componentInstance.collapsedGroups.set(['admin']);
      fixture.detectChanges();

      const header = root().querySelector<HTMLInputElement>('thead input[type="checkbox"]')!;
      header.click();
      fixture.detectChanges();

      expect([...fixture.componentInstance.selection()].sort()).toEqual([2]);
    });

    it('takes them all again once the group is open', () => {
      const header = root().querySelector<HTMLInputElement>('thead input[type="checkbox"]')!;
      header.click();
      fixture.detectChanges();

      expect([...fixture.componentInstance.selection()].sort()).toEqual([1, 2, 3]);
    });
  });

  it('carries the public BEM classes', () => {
    expect(root().querySelector('wr-table')!.className).toContain('wr-table');
  });
});

describe('WrTable with virtual scrolling on from the start', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<VirtualHost>>;
  let rowHeight: PropertyDescriptor | undefined;
  let cellWidth: PropertyDescriptor | undefined;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const spacers = (): number[] =>
    [...root().querySelectorAll<HTMLElement>('.wr-table__spacer td')].map(td => Number.parseInt(td.style.height, 10));

  beforeEach(() => {
    // jsdom lays nothing out, so the two measurements the component makes have to
    // be handed to it. 56px rows are the `lg` density; the 40px fallback is what
    // the component reaches for when it never manages to measure.
    rowHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    cellWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 56 });
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 120 });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(VirtualHost);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    if (rowHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', rowHeight);
    if (cellWidth) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', cellWidth);
  });

  it('measures the row it actually rendered, rather than falling back', () => {
    // The activation effect read its view queries inside `untracked()`, so its
    // one run happened before the view existed and nothing re-ran it: the table
    // sized every spacer with the 40px fallback while the rows were 56px, and the
    // scrollbar lied by a third.
    const total = spacers().reduce((a, b) => a + b, 0);
    const rendered = root().querySelectorAll('tbody tr:not(.wr-table__spacer)').length;

    expect(rendered).toBeGreaterThan(0);
    expect(total + rendered * 56).toBe(100 * 56);
  });

  it('freezes the natural column widths before switching to fixed layout', () => {
    // Captured while the table is still auto-layout, so turning on `table-layout:
    // fixed` cannot make the columns jump.
    // Fixed layout is a class, not an inline style — `.wr-table__table--fixed`
    // is public API the stylesheet hangs `table-layout: fixed` on.
    const table = root().querySelector<HTMLElement>('table')!;
    expect(table.classList.contains('wr-table__table--fixed')).toBe(true);

    const cols = [...root().querySelectorAll<HTMLElement>('col')];
    expect(cols.length).toBeGreaterThan(0);
    expect(
      cols.every(col => col.style.width === '120px'),
      cols.map(c => c.style.width).join()
    ).toBe(true);
  });
});

const HEADER_COLUMNS: WrTableColumns = {
  name: { title: 'Name', pin: 'left' },
  role: { title: 'Role', resizable: true },
  city: { title: 'City' },
};

@Component({
  imports: [WrTable],
  template: `<wr-table [columns]="columns()" [items]="items()" rowKey="id" reorderable />`,
})
class DirHost {
  readonly columns = signal(HEADER_COLUMNS);
  readonly items = signal<readonly Record<string, unknown>[]>(ROWS);
}

/**
 * The two header gestures that travel the inline axis.
 *
 * A resize is `startWidth + (clientX - startX)` and a drop slot is an index the
 * CDK sweeps left-to-right; both read the same physical axis the layout has
 * already mirrored, so under `dir="rtl"` a drag away from the pointer shrinks
 * the column and the pin guard protects the column at the wrong end of the
 * header.
 *
 * Every case is a pair — the SAME gesture in both directions, expecting
 * opposite outcomes. One direction alone cannot tell "mirrors" from "always
 * grows leftward".
 */
describe('WrTable header gestures follow the reading direction', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<DirHost>>;
  let cellWidth: PropertyDescriptor | undefined;

  const mount = (direction: Direction): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        // `Directionality` reads the document once at construction, so a fake is
        // the honest way to put the component in an RTL page.
        { provide: Directionality, useValue: { value: direction, change: new Subject<Direction>() } },
      ],
    });
    fixture = TestBed.createComponent(DirHost);
    fixture.detectChanges();
  };

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  /** Rendered width of the `role` column — 2nd of three, no lead `<col>` here. */
  const roleWidth = (): string => [...root().querySelectorAll<HTMLElement>('col')][1].style.width;

  /** Grab the resize handle at x=200 and let go `dx` px away from there. */
  const dragHandle = (dx: number): void => {
    const handle = root().querySelector<HTMLElement>('.wr-table__resize-handle')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', { clientX: 200, bubbles: true, cancelable: true }));
    handle.dispatchEvent(new PointerEvent('pointermove', { clientX: 200 + dx, bubbles: true }));
    handle.dispatchEvent(new PointerEvent('pointerup', { clientX: 200 + dx, bubbles: true }));
    fixture.detectChanges();
  };

  /**
   * The predicate the CDK asks before letting a drop land in a slot, read off
   * the `cdkDropList` it is bound to. Driving a real drag needs layout jsdom
   * does not do, and this is the exact seam `SingleAxisSortStrategy` calls.
   */
  const dropAllowed = (slot: number): boolean =>
    fixture.debugElement.query(By.directive(CdkDropList)).injector.get(CdkDropList).sortPredicate(slot, null!, null!);

  beforeEach(() => {
    // jsdom lays nothing out, so the header width the drag starts from has to be
    // handed over; pointer capture is a real-browser API it does not implement.
    cellWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 120 });
    // jsdom has no pointer capture; the table calls it during a column drag.
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { configurable: true, value: noop });
  });

  afterEach(() => {
    fixture.destroy();
    if (cellWidth) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', cellWidth);
    delete (HTMLElement.prototype as unknown as Record<string, unknown>)['setPointerCapture'];
  });

  describe('column resize', () => {
    it('grows the column as the pointer moves right, in LTR', () => {
      mount('ltr');

      dragHandle(40);

      expect(roleWidth()).toBe('160px');
    });

    it('shrinks it on the same rightward drag in RTL', () => {
      // The grip sits on the column's inline-END edge, which is its PHYSICAL
      // left in RTL — so rightward travel is travel back across the column.
      mount('rtl');

      dragHandle(40);

      expect(roleWidth()).toBe('80px');
    });

    it('shrinks the column as the pointer moves left, in LTR', () => {
      mount('ltr');

      dragHandle(-40);

      expect(roleWidth()).toBe('80px');
    });

    it('grows it on the same leftward drag in RTL', () => {
      mount('rtl');

      dragHandle(-40);

      expect(roleWidth()).toBe('160px');
    });

    it('still refuses to shrink below the floor, in both directions', () => {
      // The 48px minimum is a physical size, not a direction — it holds either
      // way round.
      mount('ltr');
      dragHandle(-500);
      expect(roleWidth()).toBe('48px');

      mount('rtl');
      dragHandle(500);
      expect(roleWidth()).toBe('48px');
    });
  });

  describe('column reorder', () => {
    // `name` is pinned and first in DOM order, so it owns the LEFTMOST slot in
    // LTR and the RIGHTMOST one in RTL. The CDK always sweeps left-to-right.
    it('guards the leftmost slot in LTR, and leaves the far one open', () => {
      mount('ltr');

      expect(dropAllowed(0)).toBe(false);
      expect(dropAllowed(2)).toBe(true);
    });

    it('guards the rightmost slot in RTL instead', () => {
      mount('rtl');

      expect(dropAllowed(0)).toBe(true);
      expect(dropAllowed(2)).toBe(false);
    });

    it('leaves the unpinned middle open either way — the mirror is not a shuffle', () => {
      mount('ltr');
      expect(dropAllowed(1)).toBe(true);

      mount('rtl');
      expect(dropAllowed(1)).toBe(true);
    });
  });
});

const PIN_COLUMNS: WrTableColumns = {
  name: { title: 'Name', pin: 'left' },
  role: { title: 'Role' },
  city: { title: 'City', pin: 'right' },
};

@Component({
  imports: [WrTable],
  template: `<wr-table [columns]="PIN_COLUMNS" [items]="items" rowKey="id" />`,
})
class PinHost {
  protected readonly PIN_COLUMNS = PIN_COLUMNS;
  protected readonly items = ROWS;
}

/**
 * The third thing on the inline axis, and the only one the component does not
 * have to sign for itself: `measurePins()` accumulates in DOM order, which IS
 * start-to-end, so the offsets are already logical. They only have to be EMITTED
 * as logical properties — a physical `left: 0` cannot catch a `pin: 'left'`
 * column under `dir="rtl"`, where the column order mirrors and that column now
 * sits at the physical right, so it scrolls out of the viewport instead of
 * freezing. Its `pin: 'right'` twin is worse: it is already off the far edge at
 * rest, before the user scrolls at all.
 *
 * The input names stay physical because they are public API; the property they
 * produce does not. jsdom lays nothing out and never scrolls, so what is pinned
 * here is the DECLARATION the component writes — whether the cell then stays put
 * is a real browser's answer.
 */
describe('WrTable pins on the inline axis, not the physical one', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<PinHost>>;

  afterEach(() => fixture.destroy());

  it('writes both sticky offsets as logical insets, in either direction', () => {
    for (const direction of ['ltr', 'rtl'] as const) {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: Directionality, useValue: { value: direction, change: new Subject<Direction>() } }],
      });
      fixture = TestBed.createComponent(PinHost);
      fixture.detectChanges();

      const root = fixture.nativeElement as HTMLElement;
      const start = root.querySelector<HTMLElement>('.wr-table__th--pin-left')!;
      const end = root.querySelector<HTMLElement>('.wr-table__th--pin-right')!;

      expect(start.style.getPropertyValue('inset-inline-start')).toBe('0px');
      expect(start.style.getPropertyValue('left')).toBe('');
      expect(end.style.getPropertyValue('inset-inline-end')).toBe('0px');
      expect(end.style.getPropertyValue('right')).toBe('');
    }
  });

  it('leaves an unpinned column with no inset at all', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(PinHost);
    fixture.detectChanges();

    // `leftPin()` / `rightPin()` answer `null` off the pinned set, and a null
    // style binding must clear rather than resolve to `0px` — otherwise every
    // ordinary cell would carry a sticky inset it never asked for.
    const plain = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.wr-table__th')].find(
      th => !th.className.includes('pin-')
    )!;

    expect(plain.style.getPropertyValue('inset-inline-start')).toBe('');
    expect(plain.style.getPropertyValue('inset-inline-end')).toBe('');
  });
});

/**
 * `responsive` is the fourth thing virtualization refuses to combine with, and the
 * only one of the four that is not in the component's own list of documented pairs.
 * The reason is the same shape as the others: card mode reflows every row into a
 * stacked block through a container query, so rows stop being one uniform height —
 * and a windowed body is spacer arithmetic on exactly that number. Left on, the
 * spacers would be sized from a measurement that no longer describes anything.
 *
 * A container query is invisible to a unit test, so what is asserted is the DECISION:
 * with `responsive` on, the table renders every row and no spacer at all.
 */
describe('WrTable in card mode', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ResponsiveVirtualHost>>;
  let rowHeight: PropertyDescriptor | undefined;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const spacers = (): number => root().querySelectorAll('.wr-table__spacer').length;
  const rows = (): number => root().querySelectorAll('tbody tr:not(.wr-table__spacer)').length;

  beforeEach(() => {
    rowHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 56 });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(ResponsiveVirtualHost);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    if (rowHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', rowHeight);
  });

  it('windows the body while the table is a table', () => {
    expect(spacers()).toBeGreaterThan(0);
    expect(rows()).toBeLessThan(100);
  });

  it('gives virtualization up when the rows become cards', () => {
    fixture.componentInstance.responsive.set(true);
    fixture.detectChanges();

    expect(root().querySelector('wr-table')!.className).toContain('wr-table--responsive');
    expect(spacers()).toBe(0);
    expect(rows()).toBe(100);
  });

  it('takes it back when the table stops being cards', () => {
    fixture.componentInstance.responsive.set(true);
    fixture.detectChanges();
    fixture.componentInstance.responsive.set(false);
    fixture.detectChanges();

    expect(spacers()).toBeGreaterThan(0);
    expect(rows()).toBeLessThan(100);
  });
});

/**
 * The loading overlay was a spinner in a bare `<div>`: a busy state with no
 * role and no accessible name, which a screen reader reports as an empty table
 * rather than as a table that is loading. `table.loading` shipped in both
 * catalogs for exactly this and nothing read it.
 */
describe('WrTable loading overlay', () => {
  afterEach(() => TestBed.resetTestingModule());

  const overlay = (): HTMLElement | null => {
    const fixture = TestBed.createComponent(LoadingHost);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('.wr-table__loading');
  };

  it('announces itself, in English by default', () => {
    TestBed.configureTestingModule({ providers: [] });
    const el = overlay();

    expect(el?.getAttribute('role')).toBe('status');
    expect(el?.getAttribute('aria-label')).toBe('Loading…');
  });

  it('marks the TABLE busy, not only the veil', () => {
    // The rows under the veil are stale, and only the host can say so — the veil
    // marked itself. `wr-card` has paired `aria-busy` with a click-through
    // overlay all along.
    //
    // The other half of that pairing — `pointer-events: none` on the veil, which
    // used to make it eat every click while leaving the whole table operable by
    // Tab + Enter — is not assertable here: jsdom loads no stylesheet and does no
    // hit-testing, so a computed read would answer from nothing.
    const fixture = TestBed.createComponent(LoadingHost);
    fixture.detectChanges();
    const host = (fixture.nativeElement as HTMLElement).querySelector('wr-table')!;

    expect(host.getAttribute('aria-busy')).toBe('true');

    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();

    expect(host.getAttribute('aria-busy')).toBeNull();
  });

  it('keeps the "no data" row from reading through the veil', () => {
    // `[items]="[]" [loading]="true"` is the documented way to show the spinner,
    // and the veil is 70% opaque — so the empty row was legible under it, and in
    // the a11y tree beside the busy status, announcing "No data" mid-load.
    const fixture = TestBed.createComponent(LoadingHost);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.wr-table__empty')).toBeNull();

    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();

    expect(host.querySelector('.wr-table__empty')).not.toBeNull();
  });

  it('accepts rows typed with an interface, not just a type alias', () => {
    // A compile-time contract first — see `InterfaceRowsHost`. Mounting it also
    // proves the widened input still reaches the renderer.
    const fixture = TestBed.createComponent(InterfaceRowsHost);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const cells = [...host.querySelectorAll<HTMLElement>('tbody td')];
    expect(cells.map(c => c.textContent.trim())).toEqual(['Ada', 'admin']);
  });

  it('accepts callbacks over rows typed with an interface', () => {
    // Compile-time first — see `InterfaceForestHost`. `[childrenKey]`'s function
    // form used to declare a `Record<string, unknown>[]` return, which no
    // interface-typed array satisfies, so this host did not build at all.
    // Mounted as well, because a widened type that stopped flattening the
    // forest would still compile.
    const fixture = TestBed.createComponent(InterfaceForestHost);
    fixture.detectChanges();

    const names = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('tbody tr')].map(row =>
      row.querySelector('td')?.textContent?.trim()
    );
    expect(names).toEqual(['src', 'main.ts']);
  });

  it('takes its name from the catalog', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(LoadingHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const label = (fixture.nativeElement as HTMLElement)
      .querySelector('.wr-table__loading')
      ?.getAttribute('aria-label');
    expect(/\p{Script=Cyrillic}/u.test(label ?? ''), `"${label ?? ''}" is still English`).toBe(true);
  });
});

describe('WrTable summary row over a dataset larger than the spread limit', () => {
  it('reduces min/max instead of spreading them into a call', () => {
    // `Math.min(...nums)` threw `RangeError: Maximum call stack size exceeded`
    // past ~125k arguments, out of the `computed()` the footer reads — so a
    // 150k-row table stopped rendering entirely rather than showing a wrong
    // number. `sum`/`avg`/`count` were always reduce-based and never affected.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(BigSummaryHost);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const foot = [...host.querySelectorAll<HTMLElement>('tfoot .wr-table__foot-cell')];
    expect(foot.map(td => td.textContent.trim())).toEqual(['1', '150000']);

    fixture.destroy();
  });
});

/**
 * Every documented `[direction]` on the sort indicator, and the glyph each one
 * draws. `null` is the third documented value: an unsorted column carries no
 * direction modifier and draws a flat LINE. It used to draw the same up-arrow
 * as `asc` at half opacity — so an unsorted column read as "sorted ascending,
 * dimmed" — while this docblock already claimed a neutral glyph. The glyph
 * assertions are what make that claim true rather than written down.
 */
describe('WrTableSort emits a modifier for every documented direction', () => {
  @Component({
    imports: [WrTableSort],
    template: `<wr-table-sort [direction]="direction()" />`,
  })
  class SortHost {
    readonly direction = signal<WrTableSortDirection>(null);
  }

  let fixture: ReturnType<typeof TestBed.createComponent<SortHost>>;
  const el = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector('wr-table-sort')!;
  const paths = (): string[] => [...el().querySelectorAll('svg path')].map(path => path.getAttribute('d') ?? '');

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(SortHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it.each<WrTableSortDirection>(['asc', 'desc'])('direction %s', direction => {
    fixture.componentInstance.direction.set(direction);
    fixture.detectChanges();
    expect(el().classList).toContain(`wr-table-sort--${direction}`);
    // An arrow — head and shaft. `desc` is the same arrow turned by the
    // stylesheet, so both directions draw identical paths.
    expect(paths()).toEqual(['m5 12 7-7 7 7', 'M12 19V5']);
  });

  it('unsorted carries no direction modifier and draws a line, not the arrow', () => {
    fixture.componentInstance.direction.set(null);
    fixture.detectChanges();
    expect(el().className).not.toMatch(/wr-table-sort--(asc|desc)/);
    expect(paths()).toEqual(['M6 12h12']);
  });

  // The glyph is swapped by an `@if` INSIDE the `<svg>`. A path created outside
  // the SVG namespace is a perfectly valid DOM node that paints nothing, so
  // every other case here would pass over an empty header. Walked through the
  // whole cycle, because the swap has to survive being made more than once.
  it('draws its paths in the SVG namespace through the whole cycle', () => {
    for (const direction of ['asc', 'desc', null, 'asc'] as WrTableSortDirection[]) {
      fixture.componentInstance.direction.set(direction);
      fixture.detectChanges();
      const drawn = [...el().querySelectorAll('svg path')];
      expect(drawn.length).toBeGreaterThan(0);
      for (const path of drawn) expect(path.namespaceURI).toBe('http://www.w3.org/2000/svg');
    }
  });
});

/**
 * A column carrying BOTH controls — the arrangement the header's touch geometry
 * is built around.
 *
 * `sortable` and `filterItems` on one column put two 12px controls in a single
 * `.wr-table__th-inner`, and that pair is the only arrangement WCAG 2.5.8 has
 * anything to say about: a lone glyph passes on the criterion's spacing
 * exception, two of them 6px apart do not. On a coarse pointer each grows a
 * centred 24px hit area and the row opens its gap so the two cannot overlap.
 *
 * Split down the middle of what jsdom can answer, and the half it cannot is the
 * larger one. What is asserted here is the arrangement: both controls, in that
 * row, in that order, beside the title. The geometry is not — jsdom applies no
 * stylesheet, so a rect here is 0x0 and a computed style is the initial value.
 * The painted numbers come from a real Chromium, with a fine pointer and with a
 * coarse one.
 */
describe('WrTable renders both header controls for a sortable, filterable column', () => {
  @Component({
    imports: [WrTable],
    template: `<wr-table [columns]="columns" [items]="items" />`,
  })
  class BothControlsHost {
    protected readonly items = [{ id: 1, name: 'Ada', role: 'admin' }];
    protected readonly columns: WrTableColumns = {
      name: { title: 'Name', sortable: true },
      role: {
        title: 'Role',
        sortable: true,
        filterItems: [{ value: 'admin', title: 'Admin' }],
      },
      id: { title: 'Id' },
    };
  }

  let fixture: ReturnType<typeof TestBed.createComponent<BothControlsHost>>;
  const headerFor = (title: string): HTMLElement =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('th')].find(th =>
      th.textContent.includes(title)
    )!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(BothControlsHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('puts the sort button and the filter trigger in one inner row, after the title', () => {
    const inner = headerFor('Role').querySelector<HTMLElement>('.wr-table__th-inner')!;
    const children = [...inner.children].map(c => c.className);

    expect(inner.firstElementChild?.classList).toContain('wr-table__title');
    expect(children.some(c => c.includes('wr-table__sort-btn'))).toBe(true);
    expect(inner.querySelector('.wr-table-filter__trigger')).not.toBeNull();
  });

  it('gives a sort-only column one control and no filter', () => {
    const th = headerFor('Name');
    expect(th.querySelector('.wr-table__sort-btn')).not.toBeNull();
    expect(th.querySelector('wr-table-filter')).toBeNull();
  });

  it('gives a plain column neither', () => {
    const th = headerFor('Id');
    expect(th.querySelector('.wr-table__sort-btn')).toBeNull();
    expect(th.querySelector('wr-table-filter')).toBeNull();
  });
});

/**
 * Tree rows refuse three modes rather than half-support them, and each refusal
 * is invisible on screen — the other mode is simply not there. Dev mode names it.
 */
describe('WrTable tree rows with a refused mode', () => {
  @Component({
    imports: [WrTable],
    template: `<wr-table
      rowKey="id"
      childrenKey="kids"
      [groupBy]="groupBy()"
      [virtualScroll]="virtual()"
      [columns]="columns"
      [items]="items"
    />`,
  })
  class RefusedHost {
    protected readonly columns: WrTableColumns = { name: { title: 'Name' } };
    protected readonly items = [{ id: 1, name: 'Root', kids: [{ id: 2, name: 'Leaf' }] }];
    readonly groupBy = signal<string | null>(null);
    readonly virtual = signal(false);
  }

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('warns once per refused pair, and not for a tree on its own', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(noop);
    const fixture = TestBed.createComponent(RefusedHost);
    fixture.detectChanges();
    expect(warn).not.toHaveBeenCalled();

    fixture.componentInstance.groupBy.set('name');
    fixture.componentInstance.virtual.set(true);
    fixture.detectChanges();
    fixture.componentInstance.groupBy.set(null);
    fixture.detectChanges();
    fixture.componentInstance.groupBy.set('name');
    fixture.detectChanges();

    const messages = warn.mock.calls.map(call => String(call[0]));
    expect(messages).toHaveLength(2);
    expect(messages.some(m => m.includes('`groupBy`'))).toBe(true);
    expect(messages.some(m => m.includes('`virtualScroll`'))).toBe(true);
    fixture.destroy();
  });
});

/**
 * `sort` is an array whose FIRST entry is the primary key. Flipping a column's
 * direction is not a new sort, so it keeps its place: re-clicking the primary
 * column used to move it to the end, and the rows re-sorted by the secondary
 * key while the header still said the primary was the one descending.
 */
describe('WrTable multi-column sort order', () => {
  @Component({
    imports: [WrTable],
    template: `<wr-table [columns]="columns" [items]="items" [(sort)]="sort" />`,
  })
  class SortHost {
    protected readonly items = [{ id: 1, name: 'Ada', role: 'admin' }];
    protected readonly columns: WrTableColumns = {
      name: { title: 'Name', sortable: true },
      role: { title: 'Role', sortable: true },
    };
    readonly sort = signal<readonly { key: string; direction: WrTableSortDirection }[]>([]);
  }

  let fixture: ReturnType<typeof TestBed.createComponent<SortHost>>;
  const click = (title: string): void => {
    const th = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('th')].find(h =>
      h.textContent.includes(title)
    )!;
    th.querySelector<HTMLElement>('.wr-table__sort-btn')!.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(SortHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('keeps a reversed column where it was in the order', () => {
    click('Name');
    click('Role');
    click('Name');

    expect(fixture.componentInstance.sort()).toEqual([
      { key: 'name', direction: 'desc' },
      { key: 'role', direction: 'asc' },
    ]);
  });

  it('appends a newly sorted column and drops one cycled back to unsorted', () => {
    click('Name');
    click('Role');
    click('Name');
    click('Name');

    expect(fixture.componentInstance.sort()).toEqual([{ key: 'role', direction: 'asc' }]);
  });

  const header = (title: string): HTMLElement =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('th')].find(h =>
      h.textContent.includes(title)
    )!;
  const order = (title: string): string | null =>
    header(title).querySelector('.wr-table__sort-order')?.textContent?.trim() ?? null;

  it('announces aria-sort on the primary key only, and draws every key in its place', () => {
    click('Name');
    click('Role');
    click('Role');

    // ARIA puts `aria-sort` on one header at a time. Two headers both saying a
    // direction left a screen reader unable to tell which one orders the rows —
    // the second only breaks ties inside the first.
    expect(header('Name').getAttribute('aria-sort')).toBe('ascending');
    expect(header('Role').getAttribute('aria-sort')).toBe('none');

    // The secondary key still SHOWS its direction and its rank.
    expect(header('Role').querySelector('.wr-table-sort--desc')).not.toBeNull();
    expect(order('Name')).toBe('1');
    expect(order('Role')).toBe('2');

    // Beside the button, never in it: a digit inside "Sort Role" is visible text
    // the button's name does not contain (WCAG 2.5.3, label in name).
    const button = header('Role').querySelector('.wr-table__sort-btn')!;
    expect(button.querySelector('.wr-table__sort-order')).toBeNull();
    expect(button.textContent.trim()).toBe('');
    expect(header('Role').querySelector('.wr-table__sort-order')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('draws no rank for a lone sorted column, and hands aria-sort on when the primary leaves', () => {
    click('Name');
    expect(order('Name')).toBeNull();

    click('Role');
    click('Name');
    click('Name');

    expect(header('Role').getAttribute('aria-sort')).toBe('ascending');
    expect(header('Name').getAttribute('aria-sort')).toBe('none');
    expect(order('Role')).toBeNull();
  });

  it('skips an entry with no direction when it picks the primary key', () => {
    fixture.componentInstance.sort.set([
      { key: 'name', direction: null },
      { key: 'role', direction: 'desc' },
    ]);
    fixture.detectChanges();

    expect(header('Role').getAttribute('aria-sort')).toBe('descending');
    expect(header('Name').getAttribute('aria-sort')).toBe('none');
  });
});

/**
 * The `<th>`, `<td>` and `<tr>` are the table's own elements: a cell template
 * renders INSIDE the `<td>` rather than as it, so nothing a consumer writes can
 * carry a class onto one. These two hooks are the only way to align a numeric
 * column or mark a row without re-deriving the condition in a CSS rule.
 */
describe('WrTable class hooks', () => {
  const HOOK_COLUMNS: WrTableColumns = {
    name: { title: 'Name' },
    amount: { title: 'Amount', class: 'text-right tabular-nums' },
  };

  @Component({
    imports: [WrTable],
    template: `<wr-table [columns]="columns" [items]="items" [rowClass]="rowClass()" />`,
  })
  class HookHost {
    protected readonly columns = HOOK_COLUMNS;
    protected readonly items = [
      { name: 'Ann', amount: -5 },
      { name: 'Bo', amount: 12 },
    ];
    readonly rowClass = signal<((row: Record<string, unknown>, index: number) => string | null) | null>(null);
  }

  let fixture: ReturnType<typeof TestBed.createComponent<HookHost>>;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const rows = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-table__tr')];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideWrI18n(), provideWrI18nStaticLoader({})] });
    fixture = TestBed.createComponent(HookHost);
    fixture.detectChanges();
  });

  it('puts a column class on the header cell beside the BEM one', () => {
    const headers = [...root().querySelectorAll<HTMLElement>('.wr-table__th')];
    const amount = headers.find(th => th.textContent?.includes('Amount'))!;

    expect(amount.classList.contains('wr-table__th')).toBe(true);
    expect(amount.classList.contains('text-right')).toBe(true);
    expect(amount.classList.contains('tabular-nums')).toBe(true);
  });

  it('puts the same class on every body cell in that column and on no other', () => {
    for (const row of rows()) {
      const [name, amount] = [...row.querySelectorAll<HTMLElement>('.wr-table__td')];
      expect(amount.classList.contains('text-right')).toBe(true);
      expect(amount.classList.contains('wr-table__td')).toBe(true);
      expect(name.classList.contains('text-right')).toBe(false);
    }
  });

  it('adds nothing to a row until rowClass is given one', () => {
    expect(rows().every(tr => tr.className === 'wr-table__tr')).toBe(true);
  });

  it('calls rowClass with the row and its drawn index', () => {
    const seen: (readonly [string, number])[] = [];
    fixture.componentInstance.rowClass.set((row, index) => {
      seen.push([row['name'] as string, index]);
      return null;
    });
    fixture.detectChanges();

    expect(seen).toEqual([
      ['Ann', 0],
      ['Bo', 1],
    ]);
  });

  it('marks only the rows the predicate answers for, keeping the BEM class', () => {
    fixture.componentInstance.rowClass.set(row => ((row['amount'] as number) < 0 ? 'bg-red-50 font-bold' : null));
    fixture.detectChanges();

    const [ann, bo] = rows();
    expect(ann.classList.contains('wr-table__tr')).toBe(true);
    expect(ann.classList.contains('bg-red-50')).toBe(true);
    expect(ann.classList.contains('font-bold')).toBe(true);
    expect(bo.className).toBe('wr-table__tr');
  });

  it('drops the class again when the predicate stops answering for a row', () => {
    const flag = signal(true);
    fixture.componentInstance.rowClass.set(row => (flag() && (row['amount'] as number) < 0 ? 'bg-red-50' : null));
    fixture.detectChanges();
    expect(rows()[0].classList.contains('bg-red-50')).toBe(true);

    flag.set(false);
    fixture.detectChanges();
    expect(rows()[0].classList.contains('bg-red-50')).toBe(false);
    expect(rows()[0].classList.contains('wr-table__tr')).toBe(true);
  });
});

/**
 * A `treegrid` promises a keyboard model, and announcing the role without one left
 * the hierarchy reachable by mouse alone. This is the APG's ROW-focus variant: the
 * rows are the items, one holds the tab stop, and the controls inside a row keep
 * their own tab stops.
 */
describe('WrTable treegrid row focus', () => {
  @Component({
    imports: [WrTable],
    template: `
      <wr-table
        rowKey="id"
        childrenKey="kids"
        [columns]="columns"
        [items]="items"
        [rowSelection]="rowSelection()"
        [(expanded)]="expanded"
        [(selection)]="selection"
      />
    `,
  })
  class TreeKeysHost {
    protected readonly columns = COLUMNS;
    protected readonly items = FOREST;
    readonly rowSelection = signal<'single' | 'multiple' | null>(null);
    readonly expanded = signal<readonly unknown[]>([]);
    readonly selection = signal<readonly unknown[]>([]);
  }

  let fixture: ReturnType<typeof TestBed.createComponent<TreeKeysHost>>;

  const rows = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('tbody tr.wr-table__tr'),
  ];
  /** A row's name: its first DATA cell, past the selection cell when there is one. */
  const nameOf = (tr: Element | null | undefined): string | null =>
    tr?.querySelector('td:not(.wr-table__td--select)')?.textContent?.trim() ?? null;
  const names = (): (string | null)[] => rows().map(nameOf);
  const row = (name: string): HTMLElement => rows().find(r => nameOf(r) === name)!;
  const focused = (): string | null => nameOf((document.activeElement as HTMLElement | null)?.closest('tr'));

  /** Press a key on whatever has focus, then let the deferred focus move land. */
  const press = async (key: string, init: KeyboardEventInit = {}): Promise<void> => {
    (document.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
    );
    await fixture.whenStable();
  };

  const mount = (direction: Direction = 'ltr'): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: Directionality, useValue: { value: direction, change: new Subject<Direction>() } }],
    });
    fixture = TestBed.createComponent(TreeKeysHost);
    fixture.autoDetectChanges();
  };

  beforeEach(async () => {
    mount();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('gives exactly one row the tab stop', () => {
    expect(rows().map(r => r.getAttribute('tabindex'))).toEqual(['0', '-1']);

    // The checkbox and the toggle keep their natural tab stops, so Tab walks
    // from the row into its controls instead of the arrows being the only way.
    expect(row('src').querySelector('.wr-table__tree-toggle')!.hasAttribute('tabindex')).toBe(false);
  });

  it('moves between visible rows with the arrows, Home and End', async () => {
    fixture.componentInstance.expanded.set(['src']);
    await fixture.whenStable();
    row('src').focus();

    await press('ArrowDown');
    expect(focused()).toBe('app');
    await press('ArrowDown');
    await press('ArrowDown');
    expect(focused()).toBe('README.md');
    await press('ArrowDown');
    expect(focused()).toBe('README.md');

    await press('Home');
    expect(focused()).toBe('src');
    await press('ArrowUp');
    expect(focused()).toBe('src');
    await press('End');
    expect(focused()).toBe('README.md');

    // The tab stop travels with focus, so Tab back into the grid lands where
    // the keyboard left it.
    expect(row('README.md').getAttribute('tabindex')).toBe('0');
    expect(row('src').getAttribute('tabindex')).toBe('-1');
  });

  it('moves focus in the same keystroke, without waiting for a render', async () => {
    fixture.componentInstance.expanded.set(['src']);
    await fixture.whenStable();
    row('src').focus();

    row('src').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    // Read before any change detection: a deferred focus lagged one pass behind
    // every key, so a held arrow kept acting on the row focus had not yet left.
    expect(focused()).toBe('app');

    (document.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    );
    expect(focused()).toBe('styles.css');
  });

  it('opens a closed parent with ArrowRight, then steps into its first child', async () => {
    row('src').focus();

    await press('ArrowRight');
    expect(fixture.componentInstance.expanded()).toEqual(['src']);
    expect(row('src').getAttribute('aria-expanded')).toBe('true');
    expect(names()).toEqual(['src', 'app', 'styles.css', 'README.md']);
    expect(focused()).toBe('src');

    await press('ArrowRight');
    expect(focused()).toBe('app');
  });

  it('closes an open parent with ArrowLeft, and climbs from a child to its parent', async () => {
    fixture.componentInstance.expanded.set(['src', 'app']);
    await fixture.whenStable();
    row('main.ts').focus();

    await press('ArrowLeft');
    expect(focused()).toBe('app');

    await press('ArrowLeft');
    expect(fixture.componentInstance.expanded()).toEqual(['src']);
    expect(focused()).toBe('app');

    await press('ArrowLeft');
    expect(focused()).toBe('src');
  });

  it('does nothing with ArrowRight on a leaf or ArrowLeft on a root', async () => {
    row('README.md').focus();
    await press('ArrowRight');
    await press('ArrowLeft');

    expect(focused()).toBe('README.md');
    expect(fixture.componentInstance.expanded()).toEqual([]);
  });

  it('swaps the two inline arrows under RTL, where children indent leftward', async () => {
    fixture.destroy();
    mount('rtl');
    await fixture.whenStable();
    row('src').focus();

    await press('ArrowLeft');
    expect(fixture.componentInstance.expanded()).toEqual(['src']);

    await press('ArrowRight');
    expect(fixture.componentInstance.expanded()).toEqual([]);
  });

  it('toggles the row selection with Enter and Space when the table selects', async () => {
    fixture.componentInstance.rowSelection.set('multiple');
    await fixture.whenStable();
    row('src').focus();

    expect(row('src').getAttribute('aria-selected')).toBe('false');
    await press(' ');
    expect(fixture.componentInstance.selection()).toEqual(['src']);
    expect(row('src').getAttribute('aria-selected')).toBe('true');

    await press('Enter');
    expect(fixture.componentInstance.selection()).toEqual([]);
  });

  it('leaves Enter and Space alone when there is nothing to select', () => {
    row('src').focus();
    const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    row('src').dispatchEvent(space);

    // Not prevented: the key is not the table's, so a page scroll still happens.
    expect(space.defaultPrevented).toBe(false);
    expect(row('src').hasAttribute('aria-selected')).toBe(false);
  });

  it('leaves a key pressed inside a row control to that control', async () => {
    fixture.componentInstance.rowSelection.set('multiple');
    await fixture.whenStable();
    const box = row('src').querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    box.focus();

    await press('ArrowDown');
    expect(document.activeElement).toBe(box);
  });

  it('makes the row a control was focused in the tab stop', async () => {
    fixture.componentInstance.rowSelection.set('multiple');
    await fixture.whenStable();

    row('README.md').querySelector<HTMLInputElement>('input[type="checkbox"]')!.focus();
    await fixture.whenStable();

    // Shift+Tab out of that box now lands on its own row rather than skipping
    // past it to the previous row's controls.
    expect(row('README.md').getAttribute('tabindex')).toBe('0');
    expect(row('src').getAttribute('tabindex')).toBe('-1');
  });

  it('keeps a tab stop when the row holding it is collapsed out of view', async () => {
    fixture.componentInstance.expanded.set(['src']);
    await fixture.whenStable();
    row('app').focus();
    await fixture.whenStable();

    fixture.componentInstance.expanded.set([]);
    await fixture.whenStable();

    expect(rows().filter(r => r.getAttribute('tabindex') === '0')).toHaveLength(1);
  });
});

/**
 * Every row control used to carry one generic name — ten checkboxes called
 * "Select row" — so a screen reader moving down the selection column never heard
 * which row a box belonged to. Each now points `aria-labelledby` at an action word
 * AND its row's label cell.
 */
describe('WrTable names each row control by its row', () => {
  @Component({
    imports: [WrTable, WrTableExpand],
    template: `
      <wr-table
        rowKey="id"
        [columns]="columns"
        [items]="items()"
        [rowSelection]="rowSelection()"
        [childrenKey]="childrenKey()"
        [groupBy]="groupBy()"
        [selectRowLabel]="selectRowLabel()"
      >
        @if (detail()) {
          <ng-template wrTableExpand let-row>{{ row.name }}</ng-template>
        }
      </wr-table>
    `,
  })
  class NamesHost {
    protected readonly columns = COLUMNS;
    readonly items = signal<readonly Record<string, unknown>[]>(ROWS);
    readonly rowSelection = signal<'single' | 'multiple' | null>('multiple');
    readonly childrenKey = signal<string | null>(null);
    readonly groupBy = signal<string | null>(null);
    readonly selectRowLabel = signal<string | null>(null);
    readonly detail = signal(false);
  }

  @Component({
    imports: [WrTable, WrTableGroupHeader],
    template: `
      <wr-table rowKey="id" groupBy="role" rowSelection="multiple" [columns]="columns" [items]="items">
        <ng-template wrTableGroupHeader let-count="count">{{ count }} people</ng-template>
      </wr-table>
    `,
  })
  class CustomGroupHost {
    protected readonly columns = COLUMNS;
    protected readonly items = ROWS;
  }

  let fixture: ReturnType<typeof TestBed.createComponent<NamesHost>>;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  /**
   * The name `aria-labelledby` computes: each id resolved inside the fixture, its
   * text taken, joined with a space. Resolving the ids is the point — an id that
   * matches nothing is skipped by a browser, so a dangling reference would leave
   * a name that still LOOKS wired in the attribute.
   */
  const nameOf = (el: Element, host: HTMLElement = root()): string =>
    (el.getAttribute('aria-labelledby') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map(id => {
        const target = host.querySelector(`[id="${id}"]`);
        expect(target, `aria-labelledby names "${id}", which is not in the table`).not.toBeNull();
        return target!.textContent.replace(/\s+/g, ' ').trim();
      })
      .join(' ');

  const rowBoxes = (): HTMLInputElement[] => [
    ...root().querySelectorAll<HTMLInputElement>('tbody .wr-table__td--select input[type="checkbox"]'),
  ];

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(NamesHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('names every row checkbox by the action and the row', () => {
    expect(rowBoxes().map(box => nameOf(box))).toEqual(['Select row Ada', 'Select row Linus', 'Select row Grace']);
    // `aria-labelledby` is the name now; a leftover `aria-label` would be dead
    // weight that a reader of the DOM takes for the real one.
    expect(rowBoxes()[0].hasAttribute('aria-label')).toBe(false);
  });

  it('gives a flat table no row tab stops, since it promises no row keyboard', () => {
    const flatRows = [...root().querySelectorAll('tbody tr.wr-table__tr')];
    expect(flatRows).toHaveLength(3);
    expect(flatRows.some(r => r.hasAttribute('tabindex') || r.hasAttribute('aria-selected'))).toBe(false);
  });

  it('keeps the select-all its own static name', () => {
    expect(root().querySelector('thead input[type="checkbox"]')!.getAttribute('aria-label')).toBe('Select all rows');
  });

  it('takes the action word from the label input', () => {
    fixture.componentInstance.selectRowLabel.set('Pick');
    fixture.detectChanges();

    expect(nameOf(rowBoxes()[1])).toBe('Pick Linus');
  });

  it('builds ids that are unique per row and per table, and the same on every render', () => {
    const second = TestBed.createComponent(NamesHost);
    second.detectChanges();

    const ids = [fixture, second].flatMap(f =>
      [...(f.nativeElement as HTMLElement).querySelectorAll('[id]')].map(el => el.id)
    );
    expect(new Set(ids).size).toBe(ids.length);
    // Counted, not random: the prerendered id has to be the one the client renders.
    expect(rowBoxes()[0].getAttribute('aria-labelledby')).toMatch(/^wr-table-\d+-select-row wr-table-\d+-r0-label$/);
    second.destroy();
  });

  it('names a detail toggle by the row it opens', () => {
    fixture.componentInstance.detail.set(true);
    fixture.detectChanges();

    const toggles = [...root().querySelectorAll('.wr-table__expand-btn')];
    expect(toggles.map(t => nameOf(t))).toEqual([
      'Toggle row details Ada',
      'Toggle row details Linus',
      'Toggle row details Grace',
    ]);
    expect(toggles[0].hasAttribute('aria-label')).toBe(false);
  });

  it('names a tree toggle by its row, and keeps it out of its row label', () => {
    fixture.componentInstance.items.set(FOREST);
    fixture.componentInstance.childrenKey.set('kids');
    fixture.detectChanges();

    const toggle = root().querySelector('button.wr-table__tree-toggle')!;
    expect(nameOf(toggle)).toBe('Toggle child rows src');
    // The toggle sits INSIDE the label cell. With an `aria-label` of its own, that
    // label would be read into every other control's name: "Select row Toggle
    // child rows src".
    expect(toggle.hasAttribute('aria-label')).toBe(false);
    expect(rowBoxes().map(box => nameOf(box))).toEqual(['Select row src', 'Select row README.md']);
  });

  it('labels the row by the tree column, wherever it sits', () => {
    fixture.destroy();
    @Component({
      imports: [WrTable],
      template: `<wr-table
        rowKey="id"
        childrenKey="kids"
        treeColumn="name"
        rowSelection="single"
        [columns]="columns"
        [items]="items"
      />`,
    })
    class TreeColumnHost {
      protected readonly columns: WrTableColumns = { role: { title: 'Role' }, name: { title: 'Name' } };
      protected readonly items = FOREST;
    }
    const tree = TestBed.createComponent(TreeColumnHost);
    tree.detectChanges();
    const host = tree.nativeElement as HTMLElement;

    const box = host.querySelector('tbody input[type="checkbox"]')!;
    expect(nameOf(box, host)).toBe('Select row src');
    tree.destroy();
  });

  it('names a group by its label, its toggle with the count', () => {
    fixture.componentInstance.groupBy.set('role');
    fixture.detectChanges();

    const groupBoxes = [...root().querySelectorAll('.wr-table__group-select input')];
    const toggles = [...root().querySelectorAll('.wr-table__group-toggle')];
    expect(groupBoxes.map(b => nameOf(b))).toEqual(['Select group admin', 'Select group user']);
    expect(toggles.map(t => nameOf(t))).toEqual(['Toggle group admin 2', 'Toggle group user 1']);
    // The toggle's visible text has to sit inside its name, space included —
    // "admin2" is not in "Toggle group admin 2" to a label-in-name check.
    expect(toggles[0].textContent.trim()).toBe('admin 2');
  });

  it('names a group by its label beside a custom header too', () => {
    fixture.destroy();
    const custom = TestBed.createComponent(CustomGroupHost);
    custom.detectChanges();
    const host = custom.nativeElement as HTMLElement;

    const toggle = host.querySelector('.wr-table__group-toggle--icon')!;
    expect(nameOf(toggle, host)).toBe('Toggle group admin');
    expect(toggle.hasAttribute('aria-label')).toBe(false);
    expect(nameOf(host.querySelector('.wr-table__group-select input')!, host)).toBe('Select group admin');
    custom.destroy();
  });
});

/**
 * One `summary` function feeds the grand footer AND every group subtotal, and the
 * rows cannot tell them apart: with a single group both are handed the same rows.
 */
describe('WrTable summary scope', () => {
  const seen: WrTableSummaryContext[] = [];

  @Component({
    imports: [WrTable],
    template: `<wr-table groupBy="role" groupSummary [columns]="columns" [items]="items()" />`,
  })
  class ScopeHost {
    readonly items = signal<readonly Record<string, unknown>[]>(ROWS);
    protected readonly columns: WrTableColumns = {
      name: {
        title: 'Name',
        summary: (rows, context) => {
          seen.push(context);
          return context.scope === 'group' ? `Subtotal ${context.group.label}` : `Total ${rows.length}`;
        },
      },
      // A one-argument function, written before the context existed, still fits.
      role: { title: 'Role', summary: rows => rows.length },
    };
  }

  let fixture: ReturnType<typeof TestBed.createComponent<ScopeHost>>;
  const texts = (selector: string): string[] =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(selector)].map(td =>
      td.textContent.trim()
    );

  beforeEach(() => {
    seen.length = 0;
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(ScopeHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('tells the function which footer it is computing', () => {
    expect(texts('.wr-table__group-foot-row .wr-table__foot-cell')).toEqual([
      'Subtotal admin',
      '2',
      'Subtotal user',
      '1',
    ]);
    expect(texts('tfoot .wr-table__foot-cell')).toEqual(['Total 3', '3']);

    const total = seen.find(c => c.scope === 'total');
    expect(total?.group).toBeNull();
    const groups = seen.filter(c => c.scope === 'group').map(c => (c.scope === 'group' ? c.group.value : null));
    expect(groups).toEqual(expect.arrayContaining(['admin', 'user']));
  });

  it('still says which is which when one group holds every row', () => {
    fixture.componentInstance.items.set(ROWS.filter(r => r.role === 'admin'));
    fixture.detectChanges();

    // The case the rows alone cannot answer: the subtotal and the total get the
    // very same two rows.
    expect(texts('.wr-table__group-foot-row .wr-table__foot-cell')[0]).toBe('Subtotal admin');
    expect(texts('tfoot .wr-table__foot-cell')[0]).toBe('Total 2');
  });
});
