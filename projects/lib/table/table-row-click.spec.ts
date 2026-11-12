import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { WrCopyValue } from 'ngwr/copy-value';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTable } from './table';
import { WrTableCell } from './table-cell';
import { WrTableExpand } from './table-expand';
import type { WrTableColumns, WrTableRowClick } from './types';

interface User {
  id: number;
  name: string;
  role: string;
  reports?: User[];
}

const COLUMNS: WrTableColumns<User> = {
  name: { title: 'Name' },
  role: { title: 'Role', summary: 'count' },
  tools: { title: '' },
};

const ROWS: User[] = [
  { id: 1, name: 'Ada', role: 'admin', reports: [{ id: 11, name: 'Tim', role: 'user' }] },
  { id: 2, name: 'Linus', role: 'user' },
  { id: 3, name: 'Grace', role: 'admin' },
  { id: 4, name: 'Ken', role: 'user' },
];

@Component({
  imports: [WrTable, WrTableCell, WrTableExpand, WrCopyValue],
  template: `
    <wr-table
      [columns]="columns"
      [items]="items()"
      rowKey="id"
      [rowSelection]="selection()"
      [groupBy]="groupBy()"
      [childrenKey]="childrenKey()"
      [pageSize]="pageSize()"
      [page]="page()"
      [expanded]="expanded()"
      (rowClick)="clicks.push($event)"
    >
      <ng-template wrTableCell="tools" let-row="item">
        <div class="tools">
          <button type="button" class="t-button"><span class="t-button-icon">x</span></button>
          <a class="t-link" href="#profile">Profile</a>
          <a class="t-anchor">No href</a>
          <input class="t-input" id="t-field" />
          <select class="t-select">
            <option>one</option>
          </select>
          <textarea class="t-textarea"></textarea>
          <span class="t-role" role="button">Menu</span>
          <span class="t-editable" contenteditable="true">Edit</span>
          <span class="t-not-editable" contenteditable="false">Fixed</span>
          <label class="t-label" for="t-field">Label</label>
          <span class="t-opt-out" wrTableIgnoreRowClick><b class="t-opt-out-inner">Own</b></span>
          <wr-copy-value [value]="row.name" />
          <span class="t-plain">Plain</span>
        </div>
      </ng-template>
      @if (detail()) {
        <ng-template wrTableExpand let-row>
          <p class="t-detail">{{ row.name }}</p>
        </ng-template>
      }
    </wr-table>
  `,
})
class Host {
  protected readonly columns = COLUMNS;
  readonly items = signal<readonly User[]>(ROWS);
  readonly selection = signal<'multiple' | null>(null);
  readonly groupBy = signal<string | null>(null);
  readonly childrenKey = signal<string | null>(null);
  readonly pageSize = signal(0);
  readonly page = signal(1);
  readonly detail = signal(false);
  readonly expanded = signal<readonly unknown[]>([]);
  readonly clicks: WrTableRowClick<User>[] = [];
}

describe('WrTable rowClick', () => {
  let fixture: ComponentFixture<Host>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-table')!;
  const clicks = (): WrTableRowClick<User>[] => fixture.componentInstance.clicks;
  const rows = (): HTMLElement[] => [...host().querySelectorAll<HTMLElement>('tbody tr.wr-table__tr')];
  /** Clicks the first match inside a body row and returns it. */
  function click(selector: string, row = 0): HTMLElement {
    const el = rows()[row].querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`no ${selector} in row ${row}`);
    // Dispatched rather than `el.click()`, which an SVG element does not have.
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return el;
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('fires for a click on a plain cell, with the row, its index and the event', () => {
    const cell = click('td', 1);

    expect(clicks()).toHaveLength(1);
    expect(clicks()[0].row).toBe(ROWS[1]);
    expect(clicks()[0].index).toBe(1);
    expect(clicks()[0].event.target).toBe(cell);
  });

  it('fires for plain content inside a cell template', () => {
    click('.t-plain', 2);
    click('.tools', 2);

    expect(clicks().map(c => c.row.name)).toEqual(['Grace', 'Grace']);
  });

  it.each([
    ['a button', '.t-button'],
    ['an element inside a button', '.t-button-icon'],
    ['a link', '.t-link'],
    ['an input', '.t-input'],
    ['a select', '.t-select'],
    ['a textarea', '.t-textarea'],
    ['role=button', '.t-role'],
    ['editable content', '.t-editable'],
    ['a label', '.t-label'],
    ['the opt-out attribute', '.t-opt-out'],
    ['an element inside the opt-out', '.t-opt-out-inner'],
    ['the copy button of wr-copy-value', '.wr-copy-value__button'],
    ['the icon in the copy button', '.wr-copy-value__icon'],
  ])('does not fire for %s in a cell template', (_name, selector) => {
    click(selector);

    expect(clicks()).toEqual([]);
  });

  it.each([
    ['an anchor with no href', '.t-anchor'],
    ['contenteditable="false"', '.t-not-editable'],
    ['the text of wr-copy-value', '.wr-copy-value__text'],
  ])('fires for %s, which is not interactive', (_name, selector) => {
    click(selector);

    expect(clicks()).toHaveLength(1);
  });

  it('reads the opt-out as a plain attribute, however it reached the element', () => {
    const el = document.createElement('span');
    el.setAttribute('wrTableIgnoreRowClick', '');
    rows()[0].querySelector('.t-plain')!.append(el);
    el.click();

    expect(clicks()).toEqual([]);
  });

  it('is not stopped by an interactive ancestor of the table', () => {
    const root = fixture.nativeElement as HTMLElement;
    const wrapper = document.createElement('label');
    root.replaceWith(wrapper);
    wrapper.append(root);
    click('td');
    wrapper.replaceWith(root);

    expect(clicks()).toHaveLength(1);
  });

  it('does not fire for the selection checkbox, and the checkbox still selects', () => {
    fixture.componentInstance.selection.set('multiple');
    fixture.detectChanges();
    click('.wr-table__td--select input');
    click('.wr-table__td--select wr-checkbox');
    click('.wr-table__td--select');
    fixture.detectChanges();

    expect(clicks()).toEqual([]);
    expect(rows()[0].classList).toContain('wr-table__tr--selected');
  });

  it('does not fire for the expand button or inside the detail row', () => {
    fixture.componentInstance.detail.set(true);
    fixture.detectChanges();
    click('.wr-table__expand-btn');
    click('.wr-table__td--expand');
    fixture.detectChanges();
    host().querySelector<HTMLElement>('.t-detail')!.click();
    host().querySelector<HTMLElement>('.wr-table__detail')!.click();

    expect(clicks()).toEqual([]);
  });

  it('does not fire for the tree toggle, and gives a child row index -1', () => {
    fixture.componentInstance.childrenKey.set('reports');
    fixture.detectChanges();
    click('.wr-table__tree-toggle');
    fixture.detectChanges();
    expect(clicks()).toEqual([]);
    expect(rows()).toHaveLength(5);

    click('td', 1);
    expect(clicks()[0].row).toBe(ROWS[0].reports![0]);
    expect(clicks()[0].index).toBe(-1);

    click('td', 2);
    expect(clicks()[1].row).toBe(ROWS[1]);
    expect(clicks()[1].index).toBe(1);
  });

  it('does not fire for a group band or a summary row, and counts rows past them', () => {
    fixture.componentInstance.groupBy.set('role');
    fixture.detectChanges();
    host().querySelector<HTMLElement>('.wr-table__group-cell')!.click();
    host().querySelector<HTMLElement>('.wr-table__group-inner')!.click();
    host().querySelector<HTMLElement>('tfoot td')!.click();
    fixture.detectChanges();
    expect(clicks()).toEqual([]);

    // Grouped by role the body reads Ada, Grace, Linus, Ken.
    click('td', 2);
    expect(clicks()[0].row).toBe(ROWS[1]);
    expect(clicks()[0].index).toBe(1);
  });

  it('gives the index in items on a later page', () => {
    fixture.componentInstance.pageSize.set(2);
    fixture.componentInstance.page.set(2);
    fixture.detectChanges();
    click('td', 1);

    expect(clicks()[0].row).toBe(ROWS[3]);
    expect(clicks()[0].index).toBe(3);
  });

  it('does not fire for the header', () => {
    host().querySelector<HTMLElement>('thead th')!.click();

    expect(clicks()).toEqual([]);
  });

  it('leaves the keyboard alone: Enter on a tree row selects and fires nothing', () => {
    fixture.componentInstance.childrenKey.set('reports');
    fixture.componentInstance.selection.set('multiple');
    fixture.detectChanges();
    rows()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(clicks()).toEqual([]);
    expect(rows()[0].getAttribute('aria-selected')).toBe('true');
  });
});
