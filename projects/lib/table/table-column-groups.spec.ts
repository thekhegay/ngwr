/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, signal, viewChild } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { compileSass } from '../spec-sass';

import { WrTable } from './table';
import { WrTableColumnChooser } from './table-column-chooser';
import { WrTableExpand } from './table-expand';
import type { WrTableColumns } from './types';

type Row = Record<string, unknown>;

const ROWS: readonly Row[] = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  name: `Row ${i + 1}`,
  q1: 1,
  q2: 2,
  q3: 3,
  q4: 4,
  city: 'London',
}));

const COLUMNS: WrTableColumns = {
  name: { title: 'Name' },
  q1: { title: 'Q1', group: 'Revenue' },
  q2: { title: 'Q2', group: 'Revenue' },
  q3: { title: 'Q1', group: 'Costs' },
  q4: { title: 'Q2', group: 'Costs' },
  city: { title: 'City' },
};

@Component({
  imports: [WrTable, WrTableExpand],
  template: `
    <wr-table
      rowKey="id"
      [columns]="columns()"
      [items]="items"
      [rowSelection]="selection()"
      [virtualScroll]="virtual()"
      [stickyHeader]="sticky()"
      [layout]="layout()"
      [viewportHeight]="200"
      [(columnOrder)]="order"
      [(hiddenColumns)]="hidden"
    >
      @if (expand()) {
        <ng-template wrTableExpand let-row>{{ row.name }}</ng-template>
      }
    </wr-table>
  `,
})
class Host {
  readonly table = viewChild.required(WrTable);
  readonly columns = signal<WrTableColumns>(COLUMNS);
  protected readonly items = ROWS;
  readonly selection = signal<'multiple' | null>(null);
  readonly expand = signal(false);
  readonly virtual = signal(false);
  readonly sticky = signal(false);
  readonly layout = signal<'auto' | 'fixed'>('auto');
  readonly order = signal<readonly string[]>([]);
  readonly hidden = signal<readonly string[]>([]);
}

describe('WrTable grouped column headers', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let cellWidth: PropertyDescriptor | undefined;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const groupRow = (): HTMLTableRowElement | null => root().querySelector('.wr-table__head-groups');
  /** The group row as `label:colspan`, a blank cell as `:colspan`. */
  const groupCells = (): string[] =>
    [...groupRow()!.cells].map(cell => `${cell.textContent.trim()}:${cell.getAttribute('colspan') ?? ''}`);
  const group = (label: string, index = 0): HTMLElement =>
    [...groupRow()!.querySelectorAll<HTMLElement>('th')].filter(th => th.textContent.trim() === label)[index];
  const titles = (): string[] =>
    [...root().querySelectorAll<HTMLElement>('.wr-table__title')].map(el => el.textContent.trim());
  const render = (): void => {
    fixture.detectChanges();
  };

  beforeEach(() => {
    // jsdom lays nothing out: every header cell measures 100px for the pins.
    cellWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 100 });
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    render();
  });

  afterEach(() => {
    fixture.destroy();
    if (cellWidth) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', cellWidth);
  });

  it('renders one group row above the titles, a cell per run of neighbours', () => {
    const rows = root().querySelectorAll('thead tr');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toBe(groupRow());
    expect(groupCells()).toEqual([':1', 'Revenue:2', 'Costs:2', ':1']);
    expect(titles()).toEqual(['Name', 'Q1', 'Q2', 'Q1', 'Q2', 'City']);
  });

  it('heads a group with a colgroup th and leaves a plain td over the rest', () => {
    const revenue = group('Revenue');
    expect(revenue.tagName).toBe('TH');
    expect(revenue.getAttribute('scope')).toBe('colgroup');
    const blanks = [...groupRow()!.cells].filter(cell => cell.textContent.trim() === '');
    expect(blanks.map(cell => cell.tagName)).toEqual(['TD', 'TD']);
    // Out of reach of the queries and the harness that read the title cells.
    expect(groupRow()!.querySelector('.wr-table__th')).toBeNull();
  });

  it('bounds each group header with a column group of its own columns', () => {
    const spans = (): number[] => [...root().querySelectorAll('colgroup')].map(el => el.children.length);
    expect(spans()).toEqual([1, 2, 2, 1]);

    host.selection.set('multiple');
    host.expand.set(true);
    render();
    expect(spans()).toEqual([2, 1, 2, 2, 1]);
    expect(root().querySelectorAll('colgroup:first-of-type > .wr-table__col--lead')).toHaveLength(2);

    host.order.set(['q1', 'name', 'q2', 'q3', 'q4', 'city']);
    render();
    expect(spans()).toEqual([2, 1, 1, 1, 2, 1]);
  });

  it('keeps each column width on its own col across the column groups', () => {
    host.columns.set({
      name: { title: 'Name', width: 80 },
      q1: { title: 'Q1', group: 'Revenue', width: 90 },
      q2: { title: 'Q2', group: 'Revenue', width: 110 },
      city: { title: 'City', width: 130 },
    });
    render();

    expect([...root().querySelectorAll<HTMLElement>('col')].map(col => col.style.width)).toEqual([
      '80px',
      '90px',
      '110px',
      '130px',
    ]);
  });

  it('keeps the one column group without a group', () => {
    host.columns.set({ name: { title: 'Name' }, city: { title: 'City' } });
    host.selection.set('multiple');
    render();

    const groups = root().querySelectorAll('colgroup');
    expect(groups).toHaveLength(1);
    expect(groups[0].children).toHaveLength(3);
  });

  it('renders no extra row and no measured height without a group', () => {
    host.columns.set({ name: { title: 'Name' }, city: { title: 'City' } });
    render();

    expect(groupRow()).toBeNull();
    expect(root().querySelectorAll('thead tr')).toHaveLength(1);
    expect(root().querySelector('.wr-table__head-cell')).toBeNull();
    expect(root().querySelector<HTMLElement>('.wr-table__scroll')!.getAttribute('style') ?? '').not.toContain(
      'head-group-height'
    );
  });

  it('shrinks a span by a hidden column and drops the row with the last grouped one', () => {
    host.hidden.set(['q2']);
    render();
    expect(groupCells()).toEqual([':1', 'Revenue:1', 'Costs:2', ':1']);

    host.hidden.set(['q1', 'q2', 'q3', 'q4']);
    render();
    expect(groupRow()).toBeNull();
    expect(titles()).toEqual(['Name', 'City']);
  });

  it('splits a group a reorder cuts in two, and joins it back', () => {
    host.order.set(['q1', 'name', 'q2', 'q3', 'q4', 'city']);
    render();
    expect(groupCells()).toEqual(['Revenue:1', ':1', 'Revenue:1', 'Costs:2', ':1']);

    host.order.set(['name', 'q2', 'q1', 'q3', 'q4', 'city']);
    render();
    expect(groupCells()).toEqual([':1', 'Revenue:2', 'Costs:2', ':1']);
  });

  it('splits a group at a pinned edge and pins its half with the columns under it', () => {
    host.columns.set({
      name: { title: 'Name', pin: 'left' },
      q1: { title: 'Q1', group: 'Revenue', pin: 'left' },
      q2: { title: 'Q2', group: 'Revenue' },
      q3: { title: 'Q1', group: 'Costs', pin: 'right' },
      q4: { title: 'Q2', group: 'Costs', pin: 'right' },
    });
    render();

    expect(groupCells()).toEqual([':1', 'Revenue:1', 'Revenue:1', 'Costs:2']);

    const blank = groupRow()!.cells[0];
    expect(blank.classList).toContain('wr-table__head-cell--pin-left');
    expect(blank.style.getPropertyValue('inset-inline-start')).toBe('0px');

    const pinned = group('Revenue', 0);
    expect(pinned.classList).toContain('wr-table__head-cell--pin-left');
    expect(pinned.classList).toContain('wr-table__head-cell--pin-edge-left');
    expect(pinned.style.getPropertyValue('inset-inline-start')).toBe('100px');
    expect(pinned.style.getPropertyValue('left')).toBe('');

    const loose = group('Revenue', 1);
    expect(loose.classList).not.toContain('wr-table__head-cell--pin-left');
    expect(loose.style.getPropertyValue('inset-inline-start')).toBe('');

    // Pinned to the end: it sits at its last column's offset and carries the edge of its first.
    const costs = group('Costs');
    expect(costs.classList).toContain('wr-table__head-cell--pin-right');
    expect(costs.classList).toContain('wr-table__head-cell--pin-edge-right');
    expect(costs.style.getPropertyValue('inset-inline-end')).toBe('0px');
  });

  it('adds a blank cell over the selection and the expand column', () => {
    host.selection.set('multiple');
    host.expand.set(true);
    render();

    expect(groupCells()).toEqual([':', ':', ':1', 'Revenue:2', 'Costs:2', ':1']);
    expect(groupRow()!.cells[0].classList).toContain('wr-table__head-cell--select');
    const leaf = root().querySelectorAll<HTMLTableRowElement>('thead tr')[1];
    const spanned = [...groupRow()!.cells].reduce((sum, cell) => sum + cell.colSpan, 0);
    expect(spanned).toBe(leaf.cells.length);
  });

  it('keeps the row and its spans under layout="fixed"', () => {
    host.layout.set('fixed');
    render();

    expect(groupCells()).toEqual([':1', 'Revenue:2', 'Costs:2', ':1']);
    expect(root().querySelectorAll('col')).toHaveLength(6);
  });

  it('counts the group row in the rows a virtualized table announces', async () => {
    host.virtual.set(true);
    render();
    await fixture.whenStable();
    render();

    const table = root().querySelector('table')!;
    expect(groupRow()).not.toBeNull();
    expect(table.getAttribute('aria-rowcount')).toBe(String(ROWS.length + 2));
    expect(root().querySelector('tbody .wr-table__tr')!.getAttribute('aria-rowindex')).toBe('3');

    host.columns.set({ name: { title: 'Name' } });
    render();
    await fixture.whenStable();
    render();
    expect(table.getAttribute('aria-rowcount')).toBe(String(ROWS.length + 1));
    expect(root().querySelector('tbody .wr-table__tr')!.getAttribute('aria-rowindex')).toBe('2');
  });

  it('names the group of each column for a chooser', () => {
    expect(
      host
        .table()
        .chooserColumns()
        .map(c => c.group)
    ).toEqual([undefined, 'Revenue', 'Revenue', 'Costs', 'Costs', undefined]);
  });

  it('writes the titles only to the CSV', () => {
    expect(host.table().toCsv().split('\r\n')[0]).toBe('Name,Q1,Q2,Q1,Q2,City');
  });
});

@Component({
  imports: [WrTable, WrTableColumnChooser],
  template: `
    <wr-table #table rowKey="id" [columns]="columns" [items]="[]" />
    <wr-table-column-chooser [table]="table" />
  `,
})
class ChooserHost {
  protected readonly columns = COLUMNS;
}

describe('the column chooser over grouped columns', () => {
  it('names a grouped column by its group and title', () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(ChooserHost);
    fixture.detectChanges();

    const items = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.wr-table-column-chooser__item')];
    expect(items.map(el => el.textContent.trim())).toEqual([
      'Name',
      'Revenue Q1',
      'Revenue Q2',
      'Costs Q1',
      'Costs Q2',
      'City',
    ]);
    fixture.destroy();
  });
});

describe('the group row in the stylesheet', () => {
  const css = compileSass(`@use 'table/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector: string): string => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return [...css.matchAll(new RegExp(`(?:^|\\n)\\s*([^{}]*${escaped}[^{}]*)\\{([^}]*)\\}`, 'g'))]
      .filter(([, list]) => list.split(',').some(part => part.trim() === selector))
      .map(([, , body]) => body)
      .join('\n');
  };

  it('sticks the group row at the top and the titles under it', () => {
    expect(rule('.wr-table--sticky-head .wr-table__head-cell')).toMatch(/position: sticky/);
    expect(rule('.wr-table--sticky-head .wr-table__head-cell')).toMatch(/top: 0/);
    expect(rule('.wr-table--sticky-head .wr-table__head-groups + tr > th')).toMatch(
      /top: var\(--wr-table-head-group-height, 0\)/
    );
  });

  it('pins a cell over pinned columns, above the plain sticky header', () => {
    for (const side of ['left', 'right']) {
      expect(rule(`.wr-table__head-cell--pin-${side}`)).toMatch(/position: sticky/);
      expect(rule(`.wr-table--sticky-head .wr-table__head-cell--pin-${side}`)).toMatch(/z-index: 3/);
    }
  });

  it('draws the rule under a group only', () => {
    expect(rule('.wr-table__head-cell--group')).toMatch(/border-bottom: 1px solid var\(--wr-table-border\)/);
    expect(rule('.wr-table__head-cell')).not.toMatch(/border/);
  });
});
