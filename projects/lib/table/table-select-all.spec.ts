import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrTable } from './table';
import type { WrTableColumns, WrTableFilterChange } from './types';

type Row = Record<string, unknown>;

const ROWS: readonly Row[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `Row ${i + 1}`,
  // Seven admins: ids 1, 5, 9, 13, 17, 21, 25.
  role: i % 4 === 0 ? 'admin' : 'user',
}));

const FOREST: readonly Row[] = [
  { id: 'a', name: 'a', kids: [{ id: 'a1', name: 'a1', kids: [{ id: 'a1x', name: 'a1x' }] }] },
  { id: 'b', name: 'b', kids: [{ id: 'b1', name: 'b1' }] },
  { id: 'c', name: 'c' },
];

@Component({
  imports: [WrTable],
  template: `
    <wr-table
      rowKey="id"
      rowSelection="multiple"
      [selectAllScope]="scope()"
      [columns]="columns"
      [items]="items()"
      [pageSize]="pageSize()"
      [total]="total()"
      [groupBy]="groupBy()"
      [childrenKey]="childrenKey()"
      [(page)]="page"
      [(selection)]="selection"
      [(expanded)]="expanded"
      [(collapsedGroups)]="collapsedGroups"
      (filterChange)="onFilter($event)"
    />
  `,
})
class Host {
  protected readonly columns: WrTableColumns = {
    name: { title: 'Name' },
    role: { title: 'Role', filterItems: [{ title: 'Admin', value: 'admin' }] },
  };
  readonly source = signal<readonly Row[]>(ROWS);
  readonly roles = signal<readonly unknown[]>([]);
  readonly items = signal<readonly Row[]>(ROWS);
  readonly scope = signal<'page' | 'all'>('all');
  readonly pageSize = signal(10);
  readonly total = signal<number | null>(null);
  readonly groupBy = signal<string | null>(null);
  readonly childrenKey = signal<string | null>(null);
  readonly page = signal(1);
  readonly selection = signal<readonly unknown[]>([]);
  readonly expanded = signal<readonly unknown[]>([]);
  readonly collapsedGroups = signal<readonly unknown[]>([]);

  // The table filters nothing: the host narrows `items`, as every consumer does.
  onFilter(change: WrTableFilterChange): void {
    const roles = change.items.filter(item => item.selected).map(item => item.value);
    this.items.set(roles.length === 0 ? this.source() : this.source().filter(row => roles.includes(row['role'])));
  }
}

@Component({
  imports: [WrTable],
  template: `<wr-table
    rowKey="id"
    rowSelection="multiple"
    [columns]="columns"
    [items]="items"
    [pageSize]="10"
    [(selection)]="selection"
  />`,
})
class DefaultHost {
  protected readonly columns: WrTableColumns = { name: { title: 'Name' } };
  protected readonly items = ROWS;
  readonly selection = signal<readonly unknown[]>([]);
}

describe('WrTable select-all scope across pages', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  const header = (): HTMLInputElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('thead input[type="checkbox"]')!;
  const sorted = (): unknown[] => [...host.selection()].sort((a, b) => Number(a) - Number(b));
  const clickHeader = (): void => {
    header().click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fixture.destroy();
  });

  it('selects every row of every page and reads checked on each page', () => {
    clickHeader();

    expect(host.selection()).toHaveLength(25);
    expect(sorted()).toEqual(ROWS.map(row => row['id']));
    for (const page of [1, 2, 3]) {
      host.page.set(page);
      fixture.detectChanges();
      expect(header().checked).toBe(true);
      expect(header().indeterminate).toBe(false);
    }
  });

  it('clears every page again', () => {
    clickHeader();
    clickHeader();

    expect(host.selection()).toEqual([]);
    expect(header().checked).toBe(false);
  });

  it('reads mixed on page 1 for rows selected on page 2', () => {
    host.selection.set([11, 12, 13]);
    fixture.detectChanges();

    expect(header().indeterminate).toBe(true);
    expect(header().checked).toBe(false);

    clickHeader();
    expect(host.selection()).toHaveLength(25);
  });

  it('takes only the rows a column filter left', () => {
    host.onFilter({ key: 'role', items: [{ title: 'Admin', value: 'admin', selected: true }] });
    fixture.detectChanges();

    clickHeader();

    expect(sorted()).toEqual([1, 5, 9, 13, 17, 21, 25]);
    expect(header().checked).toBe(true);
  });

  it('keeps a selected row a filter hides, and clears only the rows it holds', () => {
    host.selection.set([2]);
    host.onFilter({ key: 'role', items: [{ title: 'Admin', value: 'admin', selected: true }] });
    fixture.detectChanges();
    expect(header().indeterminate).toBe(false);

    clickHeader();
    expect(sorted()).toEqual([1, 2, 5, 9, 13, 17, 21, 25]);

    clickHeader();
    expect(host.selection()).toEqual([2]);
  });

  it('still takes one page under the page scope', () => {
    host.scope.set('page');
    fixture.detectChanges();

    clickHeader();

    expect(sorted()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    host.page.set(2);
    fixture.detectChanges();
    expect(header().checked).toBe(false);
  });

  it('takes one page by default', () => {
    fixture.destroy();
    const plain = TestBed.createComponent(DefaultHost);
    plain.detectChanges();

    (plain.nativeElement as HTMLElement).querySelector<HTMLInputElement>('thead input[type="checkbox"]')!.click();
    plain.detectChanges();

    expect(plain.componentInstance.selection()).toHaveLength(10);
    plain.destroy();
  });

  it('falls back to the page in server mode, and says so once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    host.items.set(ROWS.slice(0, 10));
    host.total.set(25);
    fixture.detectChanges();

    clickHeader();
    expect(sorted()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(header().checked).toBe(true);

    host.total.set(null);
    fixture.detectChanges();
    host.total.set(40);
    fixture.detectChanges();

    const messages = warn.mock.calls.map(call => String(call[0])).filter(m => m.includes('selectAllScope'));
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('`total`');
  });

  it('does not warn for the page scope in server mode', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    host.scope.set('page');
    host.total.set(25);
    fixture.detectChanges();

    expect(warn.mock.calls.filter(call => String(call[0]).includes('selectAllScope'))).toHaveLength(0);
  });

  it('skips a collapsed group on every page, and leaves group boxes on their page', () => {
    host.groupBy.set('role');
    host.collapsedGroups.set(['admin']);
    fixture.detectChanges();

    clickHeader();
    expect(host.selection()).toHaveLength(18);
    expect(sorted()).not.toContain(1);
    expect(header().checked).toBe(true);

    host.selection.set([]);
    host.collapsedGroups.set([]);
    fixture.detectChanges();
    const band = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '.wr-table__group-select input[type="checkbox"]'
    )!;
    band.click();
    fixture.detectChanges();

    // Page 1 holds admins 1, 5 and 9.
    expect(sorted()).toEqual([1, 5, 9]);
    expect(header().indeterminate).toBe(true);
  });

  it('takes the open nodes of every page of roots, and no closed subtree', () => {
    host.items.set(FOREST);
    host.childrenKey.set('kids');
    host.pageSize.set(1);
    host.expanded.set(['b']);
    fixture.detectChanges();

    clickHeader();

    expect([...host.selection()].sort()).toEqual(['a', 'b', 'b1', 'c']);
    expect(header().checked).toBe(true);

    host.expanded.set(['a', 'b']);
    fixture.detectChanges();
    expect(header().checked).toBe(false);
    expect(header().indeterminate).toBe(true);
  });

  it('disables the box over an empty table', () => {
    host.items.set([]);
    fixture.detectChanges();

    expect(header().disabled).toBe(true);
  });
});
