import { CdkDropList } from '@angular/cdk/drag-drop';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTable } from './table';
import { WrTableHarness } from './testing';
import type { WrTableColumns, WrTableSortState } from './types';

type Row = Record<string, unknown>;

const ROWS: readonly Row[] = [
  { id: 1, name: 'Ada', role: 'admin', city: 'London', spent: 10 },
  { id: 2, name: 'Linus', role: 'user', city: 'Helsinki', spent: 20 },
  { id: 3, name: 'Grace', role: 'user', city: 'New York', spent: 30 },
];

@Component({
  imports: [WrTable],
  template: `
    <wr-table
      rowKey="id"
      reorderable
      [columns]="columns()"
      [items]="items"
      [groupBy]="groupBy()"
      [groupSummary]="true"
      [columnChooser]="chooser()"
      [(columnOrder)]="order"
      [(hiddenColumns)]="hidden"
      [(sort)]="sort"
    />
  `,
})
class Host {
  readonly columns = signal<WrTableColumns>({
    name: { title: 'Name', pin: 'left', hideable: false },
    role: {
      title: 'Role',
      pin: 'left',
      sortable: true,
      filterItems: [
        { title: 'Admin', value: 'admin' },
        { title: 'User', value: 'user' },
      ],
    },
    city: { title: 'City', width: 180 },
    spent: { title: 'Spent', summary: 'sum', width: 90 },
  });
  protected readonly items = ROWS;
  readonly groupBy = signal<string | null>(null);
  readonly chooser = signal(false);
  readonly order = signal<readonly string[]>([]);
  readonly hidden = signal<readonly string[]>([]);
  readonly sort = signal<readonly WrTableSortState[]>([]);
}

describe('WrTable hidden columns', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let cellWidth: PropertyDescriptor | undefined;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const texts = (selector: string): string[] =>
    [...root().querySelectorAll<HTMLElement>(selector)].map(el => el.textContent.trim());
  const headers = (): string[] => texts('.wr-table__title');
  const firstRow = (): string[] => texts('tbody .wr-table__tr:first-of-type .wr-table__td');
  const header = (title: string): HTMLElement =>
    [...root().querySelectorAll<HTMLElement>('thead .wr-table__th')].find(
      th => th.querySelector('.wr-table__title')?.textContent.trim() === title
    )!;
  const hide = (...keys: string[]): void => {
    host.hidden.set(keys);
    fixture.detectChanges();
  };

  beforeEach(() => {
    // jsdom lays nothing out: every header cell measures 100px for the pins.
    cellWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 100 });
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    if (cellWidth) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', cellWidth);
  });

  it('renders no header, cell, summary or col for a hidden column', () => {
    hide('city', 'spent');

    expect(headers()).toEqual(['Name', 'Role']);
    expect(firstRow()).toEqual(['Ada', 'admin']);
    expect(root().querySelectorAll('col')).toHaveLength(2);
    // `spent` held the only summary, so the footer row goes with it.
    expect(root().querySelector('tfoot')).toBeNull();
  });

  it('leaves a hidden column out of a group subtotal row and the band colspan', () => {
    host.groupBy.set('role');
    hide('city');

    expect(root().querySelector('.wr-table__group-cell')!.getAttribute('colspan')).toBe('3');
    const subtotal = root().querySelector('.wr-table__group-foot-row')!;
    expect([...subtotal.querySelectorAll('.wr-table__foot-cell')].map(td => td.textContent.trim())).toEqual([
      '',
      '',
      '10',
    ]);
  });

  it('restores the column where it was, with its summary', () => {
    hide('city', 'spent');
    hide();

    expect(headers()).toEqual(['Name', 'Role', 'City', 'Spent']);
    expect(firstRow()).toEqual(['Ada', 'admin', 'London', '10']);
    expect(texts('tfoot .wr-table__foot-cell')).toEqual(['', '', '', '60']);
  });

  it('keeps a `hideable: false` column whatever the model lists', () => {
    hide('name', 'role');

    expect(headers()).toEqual(['Name', 'City', 'Spent']);
  });

  it('keeps the first column when the model would hide every one', () => {
    host.columns.set({ a: { title: 'A' }, b: { title: 'B' } });
    hide('a', 'b');

    expect(headers()).toEqual(['A']);
  });

  it('keeps the widths and the pin offsets of the columns that stay', () => {
    const widths = (): string[] => [...root().querySelectorAll<HTMLElement>('col')].map(col => col.style.width);
    expect(widths()).toEqual(['', '', '180px', '90px']);
    expect(header('Role').style.getPropertyValue('inset-inline-start')).toBe('100px');

    host.columns.update(columns => ({ ...columns, name: { title: 'Name', pin: 'left' } }));
    hide('name', 'city');

    expect(widths()).toEqual(['', '90px']);
    // `role` is the first pinned column now, and still the edge of its side.
    expect(header('Role').style.getPropertyValue('inset-inline-start')).toBe('0px');
    expect(header('Role').classList).toContain('wr-table__th--pin-edge-left');
    expect(header('Spent').classList).not.toContain('wr-table__th--pin-left');
  });

  it('keeps the sort and the filter selection of a column while it is hidden', () => {
    host.sort.set([{ key: 'role', direction: 'desc' }]);
    host.columns()['role'].filterItems![0].selected = true;
    fixture.detectChanges();

    hide('role');
    expect(host.sort()).toEqual([{ key: 'role', direction: 'desc' }]);

    hide();
    expect(header('Role').getAttribute('aria-sort')).toBe('descending');
    expect(header('Role').querySelector('.wr-table-filter__count')?.textContent.trim()).toBe('1');
    host.columns()['role'].filterItems![0].selected = false;
  });

  it('keeps a hidden column in its slot when a visible one is dragged', () => {
    hide('role');
    // Shown: name, city, spent. Move `spent` before `city`.
    fixture.debugElement
      .query(By.directive(CdkDropList))
      .triggerEventHandler('cdkDropListDropped', { previousIndex: 2, currentIndex: 1 });
    fixture.detectChanges();

    expect(host.order()).toEqual(['name', 'role', 'spent', 'city']);
    expect(headers()).toEqual(['Name', 'Spent', 'City']);
  });

  describe('column chooser', () => {
    let table: WrTableHarness;

    beforeEach(async () => {
      host.chooser.set(true);
      fixture.detectChanges();
      table = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrTableHarness);
    });

    it('renders no toolbar until asked', async () => {
      host.chooser.set(false);
      fixture.detectChanges();

      expect(await table.hasColumnChooser()).toBe(false);
      expect(root().querySelector('.wr-table__toolbar')).toBeNull();
    });

    it('lists every column by its title, hidden ones unchecked', async () => {
      hide('city');

      expect(await table.hasColumnChooser()).toBe(true);
      expect(texts('.wr-table__columns-btn')).toEqual(['Columns']);
      expect(await table.getHiddenColumns()).toEqual(['City']);
      expect(
        [...document.querySelectorAll('.wr-overlay-container .wr-table__columns-item')].map(el => el.textContent.trim())
      ).toEqual(['Name', 'Role', 'City', 'Spent']);
    });

    it('hides and shows a column from its checkbox, through the model', async () => {
      await table.toggleColumn('City');
      expect(host.hidden()).toEqual(['city']);
      expect(await table.getHeaderTexts()).toEqual(['Name', 'Role', 'Spent']);

      await table.toggleColumn('City');
      expect(host.hidden()).toEqual([]);
      expect(await table.getHeaderTexts()).toEqual(['Name', 'Role', 'City', 'Spent']);
    });

    it('locks a `hideable: false` column', async () => {
      expect(await table.isColumnLocked('Name')).toBe(true);
      expect(await table.isColumnLocked('Role')).toBe(false);
      await expect(table.toggleColumn('Name')).rejects.toThrow(/cannot be toggled/);
    });

    it('locks the last column shown', async () => {
      host.columns.set({ a: { title: 'A' }, b: { title: 'B' } });
      fixture.detectChanges();

      await table.toggleColumn('A');
      expect(await table.isColumnLocked('B')).toBe(true);
      expect(await table.isColumnLocked('A')).toBe(false);

      await table.toggleColumn('A');
      expect(await table.isColumnLocked('B')).toBe(false);
    });
  });
});
