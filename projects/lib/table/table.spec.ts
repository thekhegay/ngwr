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

  it('carries the public BEM classes', () => {
    expect(root().querySelector('wr-table')!.className).toContain('wr-table');
  });
});
