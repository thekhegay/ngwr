import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTable } from './table';
import { WrTableCell } from './table-cell';
import type { WrTableColumns } from './types';

/**
 * The column keys that shape a plain cell, `align`, `format` and `empty`, and
 * the row type that reaches a column and a cell template.
 *
 * `strictTemplates` type-checks these hosts, so the `@ts-expect-error` and the
 * `NotAny` probes below are specs of their own: they fail the build when the
 * row stops being inferred. Deliberately an `interface`, the shape
 * `WrTableRow` exists for.
 */
interface Invoice {
  id: number;
  customer: string;
  amount: number | null;
  note: string;
  paid: boolean;
  currency: string;
}

const INVOICES: readonly Invoice[] = [
  { id: 1, customer: 'Ada', amount: 1200, note: '', paid: true, currency: 'EUR' },
  { id: 2, customer: 'Linus', amount: null, note: 'wire', paid: false, currency: 'USD' },
  { id: 3, customer: 'Grace', amount: 0, note: '=SUM(A1)', paid: false, currency: 'EUR' },
];

const COLUMNS: WrTableColumns<Invoice> = {
  customer: { title: 'Customer', empty: '-' },
  amount: {
    title: 'Amount',
    align: 'end',
    empty: 'n/a',
    format: (value, row) => `${row.currency} ${Number(value).toFixed(2)}`,
    summary: 'sum',
  },
  note: { title: 'Note', align: 'center', empty: '(none)', class: 'mono' },
  paid: { title: 'Paid', empty: '?', format: value => (value ? 'yes' : 'no') },
};

@Component({
  imports: [WrTable, WrTableCell],
  template: `
    <wr-table [columns]="columns" [items]="invoices()">
      @if (templated()) {
        <ng-template wrTableCell="amount" [wrTableCellOf]="invoices()" let-value let-row="item">
          <b>{{ row.customer }}: {{ value ?? 'none' }}</b>
        </ng-template>
      }
    </wr-table>
  `,
})
class Host {
  readonly table = viewChild.required(WrTable);
  readonly columns = COLUMNS;
  readonly invoices = signal<readonly Invoice[]>(INVOICES);
  readonly templated = signal(false);
}

/**
 * `V` when it is a real type, a required extra argument nothing can supply when
 * it is `any`: only `any` satisfies `0 extends 1 & V`. A probe taking it
 * compiles for a typed variable and fails for an untyped one, which is the one
 * thing a template cannot say with `@ts-expect-error`.
 */
type NotAny<V> = 0 extends 1 & V ? [never] : [];

/**
 * Compiles, and nothing more: the row reaches `format` through
 * `WrTableColumns<Invoice>`, and `let-row` and `let-value` are the invoice
 * and its field through `[wrTableCellOf]`. Each probe refuses `any`, so a
 * guard that stopped inferring fails the build here.
 */
@Component({
  imports: [WrTable, WrTableCell],
  template: `
    <wr-table [columns]="columns" [items]="invoices">
      <ng-template wrTableCell="amount" [wrTableCellOf]="invoices" let-value let-row="item">
        {{ expectAmount(value) }} {{ expectInvoice(row) }} {{ row.customer }} {{ value?.toFixed(2) }}
      </ng-template>
      <!-- A key the row does not have reads unknown; the row is still typed. -->
      <ng-template wrTableCell="actions" [wrTableCellOf]="invoices" let-value let-row="item">
        {{ expectUnknown(value) }} {{ expectInvoice(row) }}
      </ng-template>
      <!-- Without wrTableCellOf the row is any, as it always was. -->
      <ng-template wrTableCell="note" let-value let-row="item">{{ row.whatever }} {{ value.whatever }}</ng-template>
    </wr-table>
  `,
})
class TypedHost {
  readonly invoices: readonly Invoice[] = INVOICES;
  readonly columns: WrTableColumns<Invoice> = {
    amount: { title: 'Amount', format: (_value, row) => row.currency },
    // @ts-expect-error -- `nope` is not an Invoice field
    note: { title: 'Note', format: (_value, row) => String(row.nope) },
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- a probe's parameters exist to be typed, never read
  expectAmount<V extends number | null>(_value: V, ..._rest: NotAny<V>): string {
    return '';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- a probe's parameters exist to be typed, never read
  expectInvoice<V extends Invoice>(_row: V, ..._rest: NotAny<V>): string {
    return '';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- a probe's parameters exist to be typed, never read
  expectUnknown<V>(_value: V, ..._rest: unknown extends V ? NotAny<V> : [never]): string {
    return '';
  }
}

describe('WrTable column keys: align, format and empty', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const th = (index: number): HTMLElement => root().querySelectorAll<HTMLElement>('thead th')[index];
  const td = (row: number, index: number): HTMLElement =>
    root().querySelectorAll<HTMLElement>('tbody tr')[row].querySelectorAll<HTMLElement>('td')[index];
  const text = (el: HTMLElement): string => el.textContent.replace(/\s+/g, ' ').trim();

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('marks the header and every body cell with the column alignment', () => {
    expect(th(1).classList.contains('wr-table__th--align-end')).toBe(true);
    expect(th(2).classList.contains('wr-table__th--align-center')).toBe(true);
    expect(th(0).className).not.toMatch(/--align-/);
    for (const row of [0, 1, 2]) {
      expect(td(row, 1).classList.contains('wr-table__td--align-end')).toBe(true);
      expect(td(row, 2).classList.contains('wr-table__td--align-center')).toBe(true);
      expect(td(row, 0).className).not.toMatch(/--align-/);
    }
  });

  it('aligns the summary cell with its column', () => {
    const foot = root().querySelectorAll<HTMLElement>('tfoot td');
    expect(foot[1].classList.contains('wr-table__td--align-end')).toBe(true);
    expect(foot[0].className).not.toMatch(/--align-/);
  });

  it('keeps the column class beside the alignment modifier', () => {
    expect(th(2).classList.contains('mono')).toBe(true);
    expect(td(0, 2).classList.contains('mono')).toBe(true);
  });

  it('renders format over the value and the row', () => {
    expect(text(td(0, 1))).toBe('EUR 1200.00');
    expect(text(td(0, 3))).toBe('yes');
  });

  it('shows the placeholder for null, undefined and the empty string', () => {
    expect(text(td(1, 1))).toBe('n/a');
    expect(text(td(0, 2))).toBe('(none)');
    fixture.componentInstance.invoices.set([{ ...INVOICES[0], customer: undefined as unknown as string }]);
    fixture.detectChanges();
    expect(text(td(0, 0))).toBe('-');
  });

  it('treats 0 and false as values', () => {
    expect(text(td(2, 1))).toBe('EUR 0.00');
    expect(text(td(1, 3))).toBe('no');
  });

  it('lets a cell template win over format and empty', () => {
    fixture.componentInstance.templated.set(true);
    fixture.detectChanges();
    expect(text(td(0, 1))).toBe('Ada: 1200');
    expect(td(0, 1).querySelector('b')).not.toBeNull();
    expect(text(td(1, 1))).toBe('Linus: none');
  });

  it('writes formatted and placeholder values to the CSV, templates or not', () => {
    const expected = [
      'Customer,Amount,Note,Paid',
      'Ada,EUR 1200.00,(none),yes',
      'Linus,n/a,wire,no',
      "Grace,EUR 0.00,'=SUM(A1),no",
    ].join('\r\n');
    expect(fixture.componentInstance.table().toCsv()).toBe(expected);
    fixture.componentInstance.templated.set(true);
    fixture.detectChanges();
    expect(fixture.componentInstance.table().toCsv()).toBe(expected);
  });

  it('does not neutralise a placeholder that starts like a formula', () => {
    fixture.componentInstance.invoices.set([{ ...INVOICES[0], customer: '' }]);
    fixture.detectChanges();
    expect(fixture.componentInstance.table().toCsv().split('\r\n')[1]).toMatch(/^-,/);
  });

  it('neutralises what format returns whatever the value was, unless it is a plain figure', () => {
    const plain = TestBed.createComponent(WrTable);
    plain.componentRef.setInput('columns', {
      owner: { title: 'Owner', format: (value: { name: string }) => value.name },
      total: { title: 'Total', format: (value: number) => value.toFixed(2) },
    });
    plain.componentRef.setInput('items', [{ owner: { name: '=cmd()' }, total: -12.5 }]);
    plain.detectChanges();
    expect(plain.componentInstance.toCsv().split('\r\n')[1]).toBe("'=cmd(),-12.50");
    plain.destroy();
  });

  it('hands a typed row to format and to a cell template', () => {
    const typed = TestBed.createComponent(TypedHost);
    typed.detectChanges();
    const cells = [...(typed.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('tbody tr:first-child td')];
    expect(cells.map(text)).toEqual(['Ada 1200.00', '']);
    typed.destroy();
  });
});
