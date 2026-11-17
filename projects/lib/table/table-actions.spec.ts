import { Component, signal, viewChild } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { WrButton } from 'ngwr/button';
import { provideWrIcons, wrSvgIcon } from 'ngwr/icon';
import { beforeEach, describe, expect, it } from 'vitest';

import { compileSass } from '../spec-sass';

import { WrTable } from './table';
import { WrTableCell } from './table-cell';
import type { WrTableColumns, WrTableLayout } from './types';

const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';

interface Row {
  id: number;
  name: string;
}

@Component({
  imports: [WrTable, WrTableCell, WrButton],
  template: `
    <wr-table rowKey="id" [columns]="columns" [items]="items" [layout]="layout()">
      <ng-template wrTableCell="name" let-value>
        <b class="t-name">{{ value }}</b>
      </ng-template>
      <ng-template wrTableCell="actions" let-row="item">
        <wr-btn icon="pencil" [attr.aria-label]="'Edit ' + row.name" />
        <wr-btn icon="trash" [attr.aria-label]="'Delete ' + row.name" />
      </ng-template>
    </wr-table>
  `,
})
class Host {
  readonly table = viewChild.required(WrTable);
  readonly layout = signal<WrTableLayout>('auto');
  readonly columns: WrTableColumns<Row> = {
    name: { title: 'Name' },
    actions: { title: '', headerHint: 'Actions', actions: true, class: 't-own' },
  };
  readonly items: readonly Row[] = [
    { id: 1, name: 'One' },
    { id: 2, name: 'Two' },
  ];
}

describe('WrTable row actions column', () => {
  let fixture: ComponentFixture<Host>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const headers = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('thead .wr-table__th')];
  const cells = (row: number): HTMLElement[] => [
    ...root().querySelectorAll<HTMLElement>('tbody .wr-table__tr')[row].querySelectorAll<HTMLElement>('.wr-table__td'),
  ];

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideWrIcons([wrSvgIcon('pencil', ICON), wrSvgIcon('trash', ICON)])],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('marks the header and body cells of the column, and only those', () => {
    expect(headers()[1].classList.contains('wr-table__th--actions')).toBe(true);
    expect(headers()[0].classList.contains('wr-table__th--actions')).toBe(false);
    for (const row of [0, 1]) {
      expect(cells(row)[1].classList.contains('wr-table__td--actions')).toBe(true);
      expect(cells(row)[0].classList.contains('wr-table__td--actions')).toBe(false);
    }
  });

  it("keeps the column's own class beside the modifier", () => {
    const { classList } = cells(0)[1];
    expect(classList.contains('wr-table__td--actions')).toBe(true);
    expect(classList.contains('t-own')).toBe(true);
  });

  it('renders the template inside one .wr-table__actions per cell', () => {
    const cell = cells(1)[1];
    expect(cell.children).toHaveLength(1);
    const actions = cell.firstElementChild!;
    expect(actions.className).toBe('wr-table__actions');
    const buttons = [...actions.children];
    expect(buttons.map(b => b.tagName.toLowerCase())).toEqual(['wr-btn', 'wr-btn']);
    expect(buttons.map(b => b.getAttribute('aria-label'))).toEqual(['Edit Two', 'Delete Two']);
  });

  it('leaves the template of an ordinary column unwrapped', () => {
    const cell = cells(0)[0];
    expect(cell.querySelector('.wr-table__actions')).toBeNull();
    expect(cell.firstElementChild!.className).toBe('t-name');
  });

  it('keeps the wrapper under layout="fixed"', async () => {
    fixture.componentInstance.layout.set('fixed');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(cells(0)[1].querySelector('.wr-table__actions > wr-btn')).not.toBeNull();
  });

  it('is left out of the CSV', () => {
    expect(fixture.componentInstance.table().toCsv()).toBe('Name\r\nOne\r\nTwo');
  });
});

describe('the row actions stylesheet', () => {
  const css = compileSass(`@use 'table/styles';`).replace(/\/\*[\s\S]*?\*\//g, '');
  const declarations = (selector: string): string => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return [...css.matchAll(new RegExp(`(?:^|\\n)\\s*([^{}]*${escaped}[^{}]*)\\{([^}]*)\\}`, 'g'))]
      .filter(([, list]) => list.split(',').some(part => part.trim() === selector))
      .map(([, , body]) => body)
      .join('\n');
  };

  it('lays the buttons in one row at the end of the cell, with the gap hook', () => {
    const body = declarations('.wr-table__actions');
    expect(body).toMatch(/display: inline-flex/);
    expect(body).toMatch(/flex-wrap: nowrap/);
    expect(body).toMatch(/justify-content: flex-end/);
    expect(body).toMatch(/gap: var\(--wr-table-actions-gap\)/);
    expect(css).toMatch(/--wr-table-actions-gap: var\(--wr-space-xs\)/);
  });

  it.each(['wr-table__th--actions', 'wr-table__td--actions'])('shrinks .%s to its content, at the logical end', cls => {
    const body = declarations(`.${cls}`);
    expect(body).toMatch(/width: 1%/);
    expect(body).toMatch(/white-space: nowrap/);
    expect(body).toMatch(/text-align: end/);
  });

  it('hands the width back to the column under a fixed layout and in card mode', () => {
    expect(declarations('.wr-table__table--layout-fixed .wr-table__td--actions')).toMatch(/width: auto/);
    expect(declarations('.wr-table--responsive .wr-table__td--actions')).toMatch(/width: auto/);
  });
});
