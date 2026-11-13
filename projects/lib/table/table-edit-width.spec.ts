import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTable } from './table';
import { WrTableEditCell } from './table-edit-cell';
import type { WrTableColumns } from './types';

interface Row {
  id: number;
  name: string;
  price: number;
}

@Component({
  imports: [WrTable, WrTableEditCell],
  template: `
    <wr-table rowKey="id" [columns]="columns()" [items]="items">
      <ng-template wrTableEditCell="price" let-value let-set="set">
        <input class="price-editor" [value]="value" (input)="set(+$any($event.target).value)" />
      </ng-template>
    </wr-table>
  `,
})
class Host {
  readonly columns = signal<WrTableColumns<Row>>({
    name: { title: 'Name' },
    price: { title: 'Price', resizable: true },
  });
  readonly items: readonly Row[] = [
    { id: 1, name: 'One', price: 10 },
    { id: 2, name: 'Two', price: 20 },
  ];
}

describe('WrTable inline editing keeps the column widths', () => {
  let fixture: ComponentFixture<Host>;
  let width: PropertyDescriptor | undefined;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const table = (): HTMLElement => root().querySelector<HTMLElement>('table')!;
  const cols = (): string[] => [...root().querySelectorAll<HTMLElement>('col')].map(c => c.style.width);
  const priceCell = (): HTMLElement => root().querySelector<HTMLElement>('tbody .wr-table__td[data-label="Price"]')!;
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const startEdit = async (): Promise<void> => {
    priceCell().dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle();
  };
  const endEdit = async (): Promise<void> => {
    root()
      .querySelector('.price-editor')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settle();
  };

  beforeEach(async () => {
    // jsdom lays nothing out: hand the header cells the width auto layout gave them.
    width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 150 });
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    await settle();
  });

  afterEach(() => {
    fixture.destroy();
    if (width) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', width);
  });

  it('holds the natural widths in fixed layout while a cell edits, then lets go', async () => {
    expect(table().classList.contains('wr-table__table--fixed')).toBe(false);
    expect(cols()).toEqual(['', '']);

    await startEdit();
    expect(root().querySelector('.price-editor')).not.toBeNull();
    expect(table().classList.contains('wr-table__table--fixed')).toBe(true);
    expect(cols()).toEqual(['150px', '150px']);

    await endEdit();
    expect(root().querySelector('.price-editor')).toBeNull();
    expect(table().classList.contains('wr-table__table--fixed')).toBe(false);
    expect(cols()).toEqual(['', '']);
  });

  it('leaves a layout fixed by a resize fixed, with its widths, after the edit', async () => {
    const handle = root().querySelector<HTMLElement>('.wr-table__resize-handle')!;
    handle.setPointerCapture = () => undefined;
    handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100 }));
    await settle();
    expect(table().classList.contains('wr-table__table--fixed')).toBe(true);
    const resized = cols();
    expect(resized).toEqual(['150px', '150px']);

    await startEdit();
    expect(cols()).toEqual(resized);
    await endEdit();

    expect(table().classList.contains('wr-table__table--fixed')).toBe(true);
    expect(cols()).toEqual(resized);
  });

  it('keeps the widths of a resize that starts during an edit', async () => {
    await startEdit();
    const handle = root().querySelector<HTMLElement>('.wr-table__resize-handle')!;
    handle.setPointerCapture = () => undefined;
    handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100 }));
    await settle();
    await endEdit();

    expect(table().classList.contains('wr-table__table--fixed')).toBe(true);
    expect(cols()).toEqual(['150px', '150px']);
  });
});
