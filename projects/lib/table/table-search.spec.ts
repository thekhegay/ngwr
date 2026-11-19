import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTable } from './table';
import type { WrTableColumns } from './types';

type Row = Record<string, unknown>;

const PEOPLE: readonly Row[] = [
  { id: 1, name: 'Zoë Adler', role: 'admin', price: 1200, note: 'secret' },
  { id: 2, name: 'Bob Stone', role: 'user', price: 85, note: null },
  { id: 3, name: 'Cara Mills', role: 'admin', price: 3, note: '' },
  { id: 4, name: 'Dmitri Ivanov', role: 'user', price: 40, note: 'x' },
];

const COLUMNS: WrTableColumns = {
  name: { title: 'Name' },
  role: { title: 'Role', format: value => (value === 'admin' ? 'Administrator' : 'Member') },
  price: { title: 'Price', format: value => `$${String(value)}.00` },
  note: { title: 'Note', searchable: false, empty: 'none' },
  tools: { title: 'Tools', actions: true },
};

@Component({
  imports: [WrTable],
  template: `
    <wr-table
      rowKey="id"
      [columns]="columns"
      [items]="items()"
      [search]="search()"
      [pageSize]="pageSize()"
      [(page)]="page"
    />
  `,
})
class Host {
  readonly columns: WrTableColumns = COLUMNS;
  readonly items = signal<readonly Row[]>(PEOPLE);
  readonly search = signal('');
  readonly pageSize = signal(0);
  readonly page = signal(1);
}

const TREE: readonly Row[] = [
  {
    id: 1,
    name: 'Engineering',
    kids: [
      { id: 11, name: 'Platform', kids: [{ id: 111, name: 'Kernel' }] },
      { id: 12, name: 'Web' },
    ],
  },
  { id: 2, name: 'Sales', kids: [{ id: 21, name: 'Kernel sales' }] },
  { id: 3, name: 'Legal' },
];

@Component({
  imports: [WrTable],
  template: `
    <wr-table
      rowKey="id"
      childrenKey="kids"
      [columns]="columns"
      [items]="items"
      [search]="search()"
      [expanded]="[1, 11, 2]"
    />
  `,
})
class TreeHost {
  readonly columns: WrTableColumns = { name: { title: 'Name' } };
  readonly items = TREE;
  readonly search = signal('');
}

const firstCells = (root: HTMLElement): string[] =>
  [...root.querySelectorAll<HTMLElement>('tbody .wr-table__tr')].map(row =>
    row.querySelector('.wr-table__td')!.textContent.trim()
  );

describe('WrTable search', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  const rows = (): string[] => firstCells(fixture.nativeElement as HTMLElement);
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const find = async (query: string): Promise<string[]> => {
    host.search.set(query);
    await settle();
    return rows();
  };
  const table = (): WrTable => fixture.debugElement.children[0].componentInstance as WrTable;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await settle();
  });

  afterEach(() => fixture.destroy());

  it('shows every row for an empty or blank query', async () => {
    expect(rows()).toHaveLength(4);
    expect(await find('   ')).toHaveLength(4);
  });

  it('matches the text format shows, not the raw value', async () => {
    expect(await find('administrator')).toEqual(['Zoë Adler', 'Cara Mills']);
    expect(await find('$85.00')).toEqual(['Bob Stone']);
    // `role` holds 'user' but the cell reads 'Member'
    expect(await find('user')).toEqual([]);
    expect(await find('member')).toEqual(['Bob Stone', 'Dmitri Ivanov']);
  });

  it('ignores case and accents in both directions', async () => {
    expect(await find('ZOE')).toEqual(['Zoë Adler']);
    expect(await find('zoë')).toEqual(['Zoë Adler']);
    expect(await find('bOb')).toEqual(['Bob Stone']);
  });

  it('skips actions, searchable: false and empty placeholders', async () => {
    expect(await find('secret')).toEqual([]);
    expect(await find('none')).toEqual([]);
    expect(await find('Tools')).toEqual([]);
  });

  it('narrows whatever items holds, so a filter and a search compose', async () => {
    host.items.set(PEOPLE.filter(row => row['role'] === 'admin'));
    await settle();
    expect(await find('a')).toEqual(['Zoë Adler', 'Cara Mills']);
    expect(await find('bob')).toEqual([]);
  });

  it('pages the matches and returns to page 1 when the query changes', async () => {
    host.items.set(Array.from({ length: 30 }, (_, i) => ({ id: i, name: `${i % 2 ? 'odd' : 'even'} ${i}` })));
    host.pageSize.set(5);
    await settle();
    host.page.set(3);
    await settle();
    expect(host.page()).toBe(3);
    expect(await find('even')).toHaveLength(5);
    expect(host.page()).toBe(1);
    host.page.set(3);
    await settle();
    expect(rows()).toHaveLength(5);
    expect(host.page()).toBe(3);
  });

  it('exports the matching rows to CSV', async () => {
    await find('bob');
    const lines = table().toCsv().split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('Bob Stone');
    await find('');
    expect(table().toCsv().split('\r\n')).toHaveLength(5);
  });
});

describe('WrTable tree search', () => {
  let fixture: ComponentFixture<TreeHost>;

  const rows = (): string[] => firstCells(fixture.nativeElement as HTMLElement);
  const find = async (query: string): Promise<string[]> => {
    fixture.componentInstance.search.set(query);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return rows();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [TreeHost] }).compileComponents();
    fixture = TestBed.createComponent(TreeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('keeps the ancestors of a match and drops the other children', async () => {
    expect(rows()).toEqual(['Engineering', 'Platform', 'Kernel', 'Web', 'Sales', 'Kernel sales', 'Legal']);
    expect(await find('kernel')).toEqual(['Engineering', 'Platform', 'Kernel', 'Sales', 'Kernel sales']);
  });

  it('shows a matching parent without its children that do not match', async () => {
    expect(await find('sales')).toEqual(['Sales', 'Kernel sales']);
    expect(await find('engineering')).toEqual(['Engineering']);
  });

  it('restores the whole forest on an empty query', async () => {
    await find('legal');
    expect(await find('')).toHaveLength(7);
  });
});
