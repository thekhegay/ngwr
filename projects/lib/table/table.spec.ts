import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrTableColumns } from './interfaces';
import { WrTable } from './table';

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

  it('survives a null items input rather than rendering garbage', () => {
    fixture.componentInstance.items.set(null as never);
    fixture.detectChanges();

    expect(bodyRows().length).toBeLessThanOrEqual(1);
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
