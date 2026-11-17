import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { compileSass } from '../spec-sass';

import { WrTable } from './table';
import type { WrTableColumns, WrTableLayout } from './types';

interface Row {
  id: number;
  name: string;
  note: string;
}

@Component({
  imports: [WrTable],
  template: `<wr-table rowKey="id" [columns]="columns" [items]="items" [layout]="layout()" />`,
})
class Host {
  readonly layout = signal<WrTableLayout>('auto');
  readonly columns: WrTableColumns<Row> = {
    id: { title: 'Id', width: 80 },
    name: { title: 'Name', width: 200, truncate: 'tooltip', resizable: true },
    note: { title: 'Note' },
  };
  readonly items: readonly Row[] = [{ id: 1, name: 'One', note: 'A note long enough to wrap' }];
}

describe('WrTable layout', () => {
  let fixture: ComponentFixture<Host>;
  let width: PropertyDescriptor | undefined;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const table = (): HTMLElement => root().querySelector<HTMLElement>('table')!;
  const cols = (): string[] => [...root().querySelectorAll<HTMLElement>('col')].map(c => c.style.width);
  const cell = (label: string): HTMLElement =>
    root().querySelector<HTMLElement>(`tbody .wr-table__td[data-label="${label}"]`)!;
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const drag = async (from: number, to: number): Promise<void> => {
    const handle = root().querySelector<HTMLElement>('.wr-table__resize-handle')!;
    handle.setPointerCapture = () => undefined;
    handle.releasePointerCapture = () => undefined;
    handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: from }));
    handle.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: to }));
    handle.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: to }));
    await settle();
  };

  beforeEach(async () => {
    // jsdom lays nothing out: hand the header cells a width to freeze.
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

  it('is auto by default, with neither fixed class', () => {
    expect(table().classList.contains('wr-table__table--layout-fixed')).toBe(false);
    expect(table().classList.contains('wr-table__table--fixed')).toBe(false);
  });

  it('wears the wrapping fixed class under layout="fixed", never the clipping one', async () => {
    fixture.componentInstance.layout.set('fixed');
    await settle();
    expect(table().classList.contains('wr-table__table--layout-fixed')).toBe(true);
    expect(table().classList.contains('wr-table__table--fixed')).toBe(false);
  });

  it('takes the column widths from the column definitions', async () => {
    fixture.componentInstance.layout.set('fixed');
    await settle();
    expect(cols()).toEqual(['80px', '200px', '']);
  });

  it('cuts only the column that asks for it', async () => {
    fixture.componentInstance.layout.set('fixed');
    await settle();
    expect(cell('Name').classList.contains('wr-table__td--truncate')).toBe(true);
    expect(cell('Name').style.maxWidth).toBe('200px');
    expect(cell('Note').classList.contains('wr-table__td--truncate')).toBe(false);
    expect(cell('Id').classList.contains('wr-table__td--truncate')).toBe(false);
  });

  it('resizes a column and keeps the cells wrapping', async () => {
    fixture.componentInstance.layout.set('fixed');
    await settle();
    await drag(100, 160);
    // Every column freezes at its rendered width, the stubbed 150, and the dragged one moves by 60.
    expect(cols()).toEqual(['150px', '210px', '150px']);
    expect(table().classList.contains('wr-table__table--layout-fixed')).toBe(true);
    expect(table().classList.contains('wr-table__table--fixed')).toBe(false);
  });

  it('still clips every cell once an auto table is resized', async () => {
    await drag(100, 160);
    expect(cols()).toEqual(['150px', '210px', '150px']);
    expect(table().classList.contains('wr-table__table--fixed')).toBe(true);
    expect(table().classList.contains('wr-table__table--layout-fixed')).toBe(false);
  });
});

describe('the table layout stylesheet', () => {
  const css = compileSass(`@use 'table/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  const declarations = (selector: string): string => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return [...css.matchAll(new RegExp(`(?:^|\\n)\\s*([^{}]*${escaped}[^{}]*)\\{([^}]*)\\}`, 'g'))]
      .filter(([, list]) => list.split(',').some(part => part.trim() === selector))
      .map(([, , body]) => body)
      .join('\n');
  };

  it('fixes the layout and lets header and body text wrap', () => {
    expect(declarations('.wr-table__table--layout-fixed')).toMatch(/table-layout: fixed/);
    const td = declarations('.wr-table__table--layout-fixed .wr-table__td');
    expect(td).toMatch(/overflow-wrap: anywhere/);
    expect(td).not.toMatch(/white-space|text-overflow|overflow: hidden/);
    expect(declarations('.wr-table__table--layout-fixed .wr-table__th')).toMatch(/white-space: normal/);
  });

  it('keeps the one-line cut on a truncated cell', () => {
    const body = declarations('.wr-table__td--truncate');
    expect(body).toMatch(/overflow: hidden/);
    expect(body).toMatch(/white-space: nowrap/);
  });
});
