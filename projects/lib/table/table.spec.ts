import { type Direction, Directionality } from '@angular/cdk/bidi';
import { CdkDropList } from '@angular/cdk/drag-drop';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { Subject } from 'rxjs';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { noop } from 'ngwr/utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrTableColumns } from './interfaces';
import { WrTable } from './table';

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
