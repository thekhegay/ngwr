import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { beforeEach, describe, expect, it } from 'vitest';

import { WrTable } from './table';
import { WrTableCell } from './table-cell';
import type { WrTableColumn, WrTableColumns } from './types';

type Row = Record<string, unknown>;

const ROW_COUNT = 30;
const KEYS = Array.from({ length: 10 }, (_, i) => `c${i}`);

function makeRows(): Row[] {
  return Array.from({ length: ROW_COUNT }, (_, r) => ({
    id: r + 1,
    ...Object.fromEntries(KEYS.map(key => [key, `${key}-${r + 1}`])),
  }));
}

/** Per-column settings read since the last reset, counted through getters. */
let columnReads = 0;

function makeColumns(): WrTableColumns {
  const columns: Record<string, WrTableColumn> = {};
  KEYS.forEach((key, i) => {
    const settings = {
      align: i === 1 ? ('end' as const) : undefined,
      class: i === 2 ? 't-own' : undefined,
      pin: i === 0 ? ('left' as const) : undefined,
      truncate: i === 3 ? ('tooltip' as const) : undefined,
      width: i === 3 ? 120 : undefined,
    };
    const column = { title: key.toUpperCase() } as WrTableColumn;
    for (const [name, value] of Object.entries(settings)) {
      Object.defineProperty(column, name, {
        enumerable: true,
        get: () => {
          columnReads++;
          return value;
        },
      });
    }
    columns[key] = column;
  });
  return columns;
}

@Component({
  imports: [WrTable, WrTableCell],
  template: `
    <wr-table rowKey="id" rowSelection="multiple" [columns]="columns()" [items]="items()" [(selection)]="selection">
      <ng-template wrTableCell="c4" let-value>
        <b class="t-cell">{{ value }}</b>
      </ng-template>
    </wr-table>
  `,
})
class Host {
  readonly columns = signal<WrTableColumns>(makeColumns());
  readonly items = signal<readonly Row[]>(makeRows());
  readonly selection = signal<readonly unknown[]>([]);
}

describe('WrTable body cells', () => {
  let fixture: ComponentFixture<Host>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('reads no per-column setting again on a pass that only changes the selection', () => {
    const cell = (column: number): HTMLElement =>
      root().querySelectorAll<HTMLElement>('tbody tr')[0].querySelectorAll<HTMLElement>('td')[column + 1];
    const drawn = (): string[] => KEYS.map((_, i) => `${cell(i).className}|${cell(i).getAttribute('style') ?? ''}`);
    const before = drawn();
    expect(cell(0).classList).toContain('wr-table__td--pin-left');
    expect(cell(1).classList).toContain('wr-table__td--align-end');
    expect(cell(2).classList).toContain('t-own');
    expect(cell(3).classList).toContain('wr-table__td--truncate');
    expect(cell(3).style.maxWidth).toBe('120px');

    columnReads = 0;
    fixture.componentInstance.selection.set([1, 2, 3]);
    fixture.detectChanges();

    expect(root().querySelectorAll('.wr-table__tr--selected')).toHaveLength(3);
    expect(columnReads).toBe(0);
    expect(drawn()).toEqual(before);
  });
});
