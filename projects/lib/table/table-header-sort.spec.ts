import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTable } from './table';
import type { WrTableColumns, WrTableFilterChange, WrTableSortState } from './types';

/**
 * A click anywhere in a sortable header cell sorts. The sort button stays the
 * one control, so the keyboard path, its name and `aria-sort` are what they
 * were; the cell's other controls keep their own clicks.
 */
describe('WrTable sorts from anywhere in a sortable header cell', () => {
  @Component({
    imports: [WrTable],
    template: `
      <wr-table
        [columns]="columns"
        [items]="items"
        [(sort)]="sort"
        rowSelection="multiple"
        (filterChange)="filters.push($event)"
      />
    `,
  })
  class HeaderSortHost {
    protected readonly items = [
      { id: 1, name: 'Ada', role: 'admin' },
      { id: 2, name: 'Bob', role: 'user' },
    ];
    protected readonly columns: WrTableColumns = {
      name: { title: 'Name', sortable: true, resizable: true },
      role: { title: 'Role', sortable: true, filterItems: [{ value: 'admin', title: 'Admin' }] },
      id: { title: 'Id' },
    };
    readonly sort = signal<readonly WrTableSortState[]>([]);
    readonly filters: WrTableFilterChange[] = [];
  }

  let fixture: ComponentFixture<HeaderSortHost>;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const headerFor = (title: string): HTMLElement =>
    [...root().querySelectorAll<HTMLElement>('th')].find(th => th.textContent.includes(title))!;
  const click = (el: Element): void => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  const sort = (): readonly WrTableSortState[] => fixture.componentInstance.sort();

  beforeEach(() => {
    fixture = TestBed.createComponent(HeaderSortHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('marks a sortable header cell, and only that one', () => {
    expect(headerFor('Name').classList).toContain('wr-table__th--sortable');
    expect(headerFor('Role').classList).toContain('wr-table__th--sortable');
    expect(headerFor('Id').classList).not.toContain('wr-table__th--sortable');
  });

  it('sorts on a click on the empty space of the cell', () => {
    click(headerFor('Name'));
    expect(sort()).toEqual([{ key: 'name', direction: 'asc' }]);
    expect(headerFor('Name').getAttribute('aria-sort')).toBe('ascending');
  });

  it('sorts on a click on the title, cycling as the button does', () => {
    const title = (): HTMLElement => headerFor('Name').querySelector<HTMLElement>('.wr-table__title')!;

    click(title());
    click(title());
    expect(sort()).toEqual([{ key: 'name', direction: 'desc' }]);
    expect(headerFor('Name').getAttribute('aria-sort')).toBe('descending');

    click(headerFor('Name').querySelector('.wr-table__th-inner')!);
    expect(sort()).toEqual([]);
    expect(headerFor('Name').getAttribute('aria-sort')).toBe('none');
  });

  it('sorts once, not twice, on a click on the sort button or its glyph', () => {
    click(headerFor('Name').querySelector('.wr-table__sort-btn')!);
    expect(sort()).toEqual([{ key: 'name', direction: 'asc' }]);

    click(headerFor('Name').querySelector('wr-table-sort')!);
    expect(sort()).toEqual([{ key: 'name', direction: 'desc' }]);
  });

  it('leaves the button the one focusable sort control, under its own name', () => {
    const th = headerFor('Name');
    const button = th.querySelector<HTMLButtonElement>('.wr-table__sort-btn')!;

    expect(button.getAttribute('aria-label')).toContain('Name');
    expect(th.hasAttribute('tabindex')).toBe(false);
    expect(th.hasAttribute('role')).toBe(false);
    expect(th.getAttribute('aria-sort')).toBe('none');
  });

  it('does not sort on a click on the filter trigger or inside it', () => {
    const trigger = headerFor('Role').querySelector<HTMLElement>('.wr-table-filter__trigger')!;

    click(trigger);
    click(trigger.querySelector('svg')!);
    click(headerFor('Role').querySelector('wr-table-filter')!);
    expect(sort()).toEqual([]);
  });

  it('does not sort on a click on the resize handle', () => {
    click(headerFor('Name').querySelector('.wr-table__resize-handle')!);
    expect(sort()).toEqual([]);
  });

  it('does not sort from a plain column or from the select-all cell', () => {
    click(headerFor('Id'));
    click(root().querySelector('.wr-table__th--select')!);
    click(root().querySelector('.wr-table__th--select wr-checkbox')!);
    expect(sort()).toEqual([]);
  });
});
