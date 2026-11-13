import { NgTemplateOutlet } from '@angular/common';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { beforeEach, describe, expect, it } from 'vitest';

import { WrTable } from './table';
import { WrTableCell } from './table-cell';
import { WrTableExpand } from './table-expand';
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
  imports: [WrTable, WrTableCell, WrTableExpand],
  template: `
    <wr-table rowKey="id" rowSelection="multiple" [columns]="columns()" [items]="items()" [(selection)]="selection">
      <ng-template wrTableCell="c4" let-value>
        <b class="t-cell">{{ value }}</b>
      </ng-template>
      @if (detail()) {
        <ng-template wrTableExpand let-row>
          <i class="t-detail">{{ row.c0 }}</i>
        </ng-template>
      }
    </wr-table>
  `,
})
class Host {
  readonly columns = signal<WrTableColumns>(makeColumns());
  readonly items = signal<readonly Row[]>(makeRows());
  readonly selection = signal<readonly unknown[]>([]);
  readonly detail = signal(false);
}

describe('WrTable body cells', () => {
  let fixture: ComponentFixture<Host>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  /** The context each rendered template outlet was handed, in DOM order. */
  function contexts(): unknown[] {
    return fixture.debugElement
      .queryAllNodes(By.directive(NgTemplateOutlet))
      .map((node): unknown => node.injector.get(NgTemplateOutlet).ngTemplateOutletContext);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('hands a template the same context across a selection change, over a live value', () => {
    const before = contexts();
    expect(before).toHaveLength(ROW_COUNT);
    expect(new Set(before).size).toBe(ROW_COUNT);

    fixture.componentInstance.items()[0]['c4'] = 'edited in place';
    fixture.componentInstance.selection.set([1, 2]);
    fixture.detectChanges();

    expect(root().querySelectorAll('.wr-table__tr--selected')).toHaveLength(2);
    const after = contexts();
    expect(after).toHaveLength(ROW_COUNT);
    after.forEach((context, i) => expect(context).toBe(before[i]));
    expect(root().querySelector('.t-cell')!.textContent).toBe('edited in place');
  });

  it('gives a replaced row a new context and keeps the others', () => {
    const before = contexts();
    const rows = [...fixture.componentInstance.items()];
    rows[3] = { ...rows[3], c4: 'replaced' };
    fixture.componentInstance.items.set(rows);
    fixture.detectChanges();

    const after = contexts();
    expect(after).toHaveLength(ROW_COUNT);
    after.forEach((context, i) => {
      if (i === 3) expect(context).not.toBe(before[i]);
      else expect(context).toBe(before[i]);
    });
    expect((after[3] as { item: Row }).item).toBe(rows[3]);
    expect(root().querySelectorAll('.t-cell')[3].textContent).toBe('replaced');
  });

  it('builds every context again when the columns change, once', () => {
    fixture.componentInstance.selection.set([1]);
    fixture.detectChanges();
    const before = contexts();

    const columns = makeColumns();
    fixture.componentInstance.columns.set(columns);
    fixture.detectChanges();

    const after = contexts();
    expect(after).toHaveLength(ROW_COUNT);
    after.forEach((context, i) => {
      expect(context).not.toBe(before[i]);
      expect((context as { column: unknown }).column).toBe(columns['c4']);
    });

    fixture.componentInstance.selection.set([]);
    fixture.detectChanges();
    contexts().forEach((context, i) => expect(context).toBe(after[i]));
  });

  it('hands an expanded row the same detail context across a selection change', () => {
    fixture.componentInstance.detail.set(true);
    fixture.detectChanges();
    root().querySelector<HTMLButtonElement>('.wr-table__expand-btn')!.click();
    fixture.detectChanges();
    expect(root().querySelector('.t-detail')!.textContent).toBe('c0-1');
    const before = contexts();
    expect(before).toHaveLength(ROW_COUNT + 1);

    fixture.componentInstance.selection.set([2]);
    fixture.detectChanges();

    const after = contexts();
    expect(after).toHaveLength(ROW_COUNT + 1);
    after.forEach((context, i) => expect(context).toBe(before[i]));
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
