import { CdkDropList } from '@angular/cdk/drag-drop';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { WrPagination } from 'ngwr/pagination';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTable } from './table';
import { WrTableHarness } from './testing';
import type { WrTableColumns, WrTableFilterChange, WrTableSortState, WrTableState } from './types';

type Row = Record<string, unknown>;

const ROWS: readonly Row[] = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  name: `Row ${i + 1}`,
  role: i % 2 === 0 ? 'admin' : 'user',
  city: `City ${i + 1}`,
}));

const columns = (): WrTableColumns => ({
  name: { title: 'Name', sortable: true },
  role: {
    title: 'Role',
    sortable: true,
    filterItems: [
      { title: 'Admin', value: 'admin' },
      { title: 'User', value: 'user' },
    ],
  },
  city: { title: 'City' },
});

@Component({
  imports: [WrTable],
  template: `
    <wr-table
      rowKey="id"
      reorderable
      columnChooser
      [columns]="columns"
      [items]="items"
      [pageSize]="10"
      [pageSizeOptions]="[10, 25]"
      [state]="saved()"
      [(sort)]="sort"
      [(page)]="page"
      [(columnOrder)]="order"
      [(hiddenColumns)]="hidden"
      (stateChange)="states.push($event)"
      (filterChange)="filterChanges.push($event)"
      (pageSizeChange)="sizes.push($event)"
    />
  `,
})
class Host {
  readonly columns = columns();
  protected readonly items = ROWS;
  readonly saved = signal<Partial<WrTableState> | null>(null);
  readonly sort = signal<readonly WrTableSortState[]>([]);
  readonly page = signal(1);
  readonly order = signal<readonly string[]>([]);
  readonly hidden = signal<readonly string[]>([]);
  readonly states: WrTableState[] = [];
  readonly filterChanges: WrTableFilterChange[] = [];
  readonly sizes: number[] = [];
}

@Component({
  imports: [WrTable],
  template: `<wr-table rowKey="id" [columns]="columns" [items]="items" [pageSize]="10" [(state)]="state" />`,
})
class TwoWayHost {
  protected readonly columns = columns();
  protected readonly items = ROWS;
  readonly state = signal<WrTableState | null>(null);
}

@Component({
  imports: [WrTable],
  template: `<wr-table rowKey="id" [columns]="columns" [items]="items" [state]="state" />`,
})
class InitialHost {
  protected readonly columns = columns();
  protected readonly items = ROWS;
  protected readonly state: Partial<WrTableState> = {
    sort: [{ key: 'name', direction: 'desc' }],
    hiddenColumns: ['city'],
    pageSize: 25,
    page: 2,
  };
}

const INITIAL: WrTableState = { sort: [], filters: {}, page: 1, pageSize: 10, columnOrder: [], hiddenColumns: [] };

describe('WrTable state', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const headers = (): string[] =>
    [...root().querySelectorAll<HTMLElement>('.wr-table__title')].map(el => el.textContent.trim());
  const header = (title: string): HTMLElement =>
    [...root().querySelectorAll<HTMLElement>('thead .wr-table__th')].find(
      th => th.querySelector('.wr-table__title')?.textContent.trim() === title
    )!;
  const firstCell = (): string => root().querySelector('tbody .wr-table__td')!.textContent.trim();
  const bodyRows = (): number => root().querySelectorAll('tbody .wr-table__tr').length;
  const pager = (): ReturnType<typeof fixture.debugElement.query> =>
    fixture.debugElement.query(By.directive(WrPagination));
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const pickFilter = async (index: number): Promise<void> => {
    const items = (): NodeListOf<HTMLElement> => document.querySelectorAll<HTMLElement>('.wr-table-filter__item');
    // The panel stays open after a pick, and a second click on the trigger would close it.
    if (items().length === 0) {
      root().querySelector<HTMLElement>('.wr-table-filter__trigger')!.click();
      fixture.detectChanges();
    }
    items()[index].click();
    await settle();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await settle();
  });

  afterEach(() => fixture.destroy());

  it('says nothing until the reader changes something', () => {
    expect(host.states).toEqual([]);
  });

  it('emits the whole state once for a sort', async () => {
    header('Name').querySelector<HTMLElement>('.wr-table__sort-btn')!.click();
    await settle();

    expect(host.states).toEqual([{ ...INITIAL, sort: [{ key: 'name', direction: 'asc' }] }]);
  });

  it('emits the selected values of a filter under its column key', async () => {
    await pickFilter(0);
    expect(host.states).toEqual([{ ...INITIAL, filters: { role: ['admin'] } }]);

    await pickFilter(1);
    expect(host.states[1].filters).toEqual({ role: ['admin', 'user'] });
  });

  it('emits once for a page', async () => {
    [...root().querySelectorAll<HTMLElement>('.wr-pagination__page')]
      .find(el => el.textContent.trim() === '3')!
      .click();
    await settle();

    expect(host.page()).toBe(3);
    expect(host.states).toEqual([{ ...INITIAL, page: 3 }]);
  });

  it('emits once for a page size that also moves the page', async () => {
    host.page.set(4);
    await settle();
    // Rows 31-40 are on screen; at 25 a page, row 31 is on page 2.
    pager().triggerEventHandler('pageSizeChange', 25);
    await settle();

    expect(host.states).toEqual([{ ...INITIAL, page: 2, pageSize: 25 }]);
  });

  it('emits once for a dragged column and once for a hidden one', async () => {
    fixture.debugElement
      .query(By.directive(CdkDropList))
      .triggerEventHandler('cdkDropListDropped', { previousIndex: 0, currentIndex: 2 });
    await settle();
    expect(host.states).toEqual([{ ...INITIAL, columnOrder: ['role', 'city', 'name'] }]);

    const table = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrTableHarness);
    await table.toggleColumn('City');
    await settle();
    expect(host.states).toHaveLength(2);
    expect(host.states[1]).toEqual({ ...INITIAL, columnOrder: ['role', 'city', 'name'], hiddenColumns: ['city'] });
  });

  it('stays quiet when the host writes a model', async () => {
    host.sort.set([{ key: 'role', direction: 'desc' }]);
    host.page.set(2);
    host.hidden.set(['city']);
    await settle();

    expect(host.states).toEqual([]);
  });

  describe('restoring a saved state', () => {
    const SAVED: WrTableState = {
      sort: [{ key: 'role', direction: 'desc' }],
      filters: { role: ['user'] },
      page: 2,
      pageSize: 25,
      columnOrder: ['city', 'name', 'role'],
      hiddenColumns: ['name'],
    };

    it('applies every part in one write', async () => {
      host.saved.set(SAVED);
      await settle();

      expect(headers()).toEqual(['City', 'Role']);
      expect(header('Role').getAttribute('aria-sort')).toBe('descending');
      expect(header('Role').querySelector('.wr-table-filter__count')?.textContent.trim()).toBe('1');
      expect(host.columns['role'].filterItems!.map(item => !!item.selected)).toEqual([false, true]);
      // Page 2 of 25 a page starts at row 26.
      expect(bodyRows()).toBe(25);
      expect(firstCell()).toBe('City 26');
      expect(host.sort()).toEqual(SAVED.sort);
      expect(host.page()).toBe(2);
      expect(host.order()).toEqual(SAVED.columnOrder);
      expect(host.hidden()).toEqual(SAVED.hiddenColumns);
    });

    it('tells the host the new page size and nothing it already holds', async () => {
      host.saved.set(SAVED);
      await settle();

      expect(host.sizes).toEqual([25]);
      expect(host.filterChanges).toEqual([]);
      expect(host.states).toEqual([]);
    });

    it('keeps what a partial state leaves out', async () => {
      host.sort.set([{ key: 'name', direction: 'asc' }]);
      host.saved.set({ hiddenColumns: ['city'] });
      await settle();

      expect(headers()).toEqual(['Name', 'Role']);
      expect(host.sort()).toEqual([{ key: 'name', direction: 'asc' }]);
      expect(bodyRows()).toBe(10);
    });

    it('clears a filter the saved state does not list', async () => {
      await pickFilter(0);
      host.saved.set({ ...SAVED, filters: {} });
      await settle();

      expect(header('Role').querySelector('.wr-table-filter__count')).toBeNull();
      expect(host.columns['role'].filterItems!.some(item => item.selected)).toBe(false);
    });

    it('emits the restored parts with the next change the reader makes', async () => {
      host.saved.set(SAVED);
      await settle();
      header('Role').querySelector<HTMLElement>('.wr-table__sort-btn')!.click();
      await settle();

      expect(host.states).toEqual([{ ...SAVED, sort: [] }]);
    });
  });
});

describe('WrTable state, bound two ways', () => {
  it('holds the last state without echoing it back', async () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(TwoWayHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const sortButtons = el.querySelectorAll<HTMLElement>('.wr-table__sort-btn');

    sortButtons[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    const first = fixture.componentInstance.state();
    expect(first?.sort).toEqual([{ key: 'name', direction: 'asc' }]);

    sortButtons[1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.state()?.sort).toEqual([
      { key: 'name', direction: 'asc' },
      { key: 'role', direction: 'asc' },
    ]);
    fixture.destroy();
  });
});

describe('WrTable state, bound from the start', () => {
  it('draws the first render from it', async () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(InitialHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect([...el.querySelectorAll('.wr-table__title')].map(title => title.textContent.trim())).toEqual([
      'Name',
      'Role',
    ]);
    expect(el.querySelector('thead .wr-table__th')!.getAttribute('aria-sort')).toBe('descending');
    expect(el.querySelectorAll('tbody .wr-table__tr')).toHaveLength(25);
    expect(el.querySelector('tbody .wr-table__td')!.textContent.trim()).toBe('Row 26');
    fixture.destroy();
  });
});
