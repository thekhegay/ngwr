import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { WrButton } from 'ngwr/button';
import { WrButtonHarness } from 'ngwr/button/testing';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTable } from './table';
import { WrTableSelectionBar } from './table-selection-bar';
import { WrTableHarness } from './testing';
import type { WrTableColumns, WrTableSelectionContext } from './types';

interface User {
  id: number;
  name: string;
}

const USERS: readonly User[] = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: `User ${i + 1}` }));

@Component({
  imports: [WrTable, WrTableSelectionBar, WrButton],
  template: `
    <wr-table
      rowKey="id"
      [rowSelection]="mode()"
      [selectAllScope]="scope()"
      [columns]="columns"
      [items]="users"
      [pageSize]="5"
      [total]="total()"
      [selectedLabel]="selectedLabel()"
      [clearSelectionLabel]="clearLabel()"
      [(selection)]="selection"
    >
      @if (withBar()) {
        <ng-template
          wrTableSelectionBar
          [wrTableSelectionBarOf]="users"
          let-rows
          let-count="count"
          let-clear="clear"
          let-scope="scope"
        >
          <span class="probe">{{ names(rows) }}|{{ count }}|{{ scope }}</span>
          <button wr-btn type="button" size="sm" class="archive" (click)="archive(rows, clear)">Archive</button>
        </ng-template>
      }
    </wr-table>
  `,
})
class Host {
  protected readonly columns: WrTableColumns<User> = { name: { title: 'Name', sortable: true } };
  protected readonly users = USERS;
  readonly mode = signal<'single' | 'multiple' | null>('multiple');
  readonly scope = signal<'page' | 'all'>('page');
  readonly total = signal<number | null>(null);
  readonly withBar = signal(true);
  readonly selectedLabel = signal<string | null>(null);
  readonly clearLabel = signal<string | null>(null);
  readonly selection = signal<readonly unknown[]>([]);
  readonly archived = signal<readonly string[]>([]);

  // Typed by `[wrTableSelectionBarOf]`: `rows` is `readonly User[]` here.
  protected names(rows: readonly User[]): string {
    return rows.map(row => row.name).join(',');
  }

  protected archive(rows: readonly User[], clear: WrTableSelectionContext['clear']): void {
    this.archived.set(rows.map(row => row.name));
    clear();
  }
}

describe('WrTable selection bar', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let table: WrTableHarness;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const tableEl = (): HTMLElement => root().querySelector<HTMLElement>('wr-table')!;
  const status = (): HTMLElement => root().querySelector<HTMLElement>('.wr-table__selection-status')!;
  const probe = (): string => root().querySelector('.probe')!.textContent.trim();
  const select = (...keys: number[]): void => {
    host.selection.set(keys);
    fixture.detectChanges();
  };

  const mount = async (): Promise<void> => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    // Attached, so `focus()` moves `document.activeElement`.
    document.body.appendChild(fixture.nativeElement as HTMLElement);
    fixture.detectChanges();
    table = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrTableHarness);
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await mount();
  });

  afterEach(() => {
    (fixture.nativeElement as HTMLElement).remove();
    fixture.destroy();
  });

  it('stays away while nothing is selected', async () => {
    expect(await table.hasSelectionBar()).toBe(false);
    expect(await table.getSelectionBarText()).toBeNull();
    expect(tableEl().classList).not.toContain('wr-table--selection-bar');
  });

  it('shows over the header with the selection, and leaves with it', async () => {
    select(1, 2, 3);

    expect(await table.hasSelectionBar()).toBe(true);
    expect(await table.getSelectionBarText()).toBe('3 selected');
    expect(tableEl().classList).toContain('wr-table--selection-bar');
    // In front of the scroll area, which holds the header it covers.
    const anchor = root().querySelector('.wr-table__selection')!;
    expect(anchor.nextElementSibling?.classList).toContain('wr-table__scroll');

    select();
    expect(await table.hasSelectionBar()).toBe(false);
  });

  it('needs the template: a selection alone draws no bar', async () => {
    host.withBar.set(false);
    select(1);

    expect(await table.hasSelectionBar()).toBe(false);
    expect(root().querySelector('.wr-table__selection')).toBeNull();
  });

  it('announces the count from a polite region that is there before the selection', () => {
    expect(status().getAttribute('role')).toBe('status');
    expect(status().textContent).toBe('');

    select(4);
    expect(status().textContent).toBe('1 selected');
    // The drawn copy is not read a second time.
    expect(root().querySelector('.wr-table__selection-count')!.getAttribute('aria-hidden')).toBe('true');

    select(4, 5);
    expect(status().textContent).toBe('2 selected');

    select();
    expect(status().textContent).toBe('');
  });

  it('hands the template the selected rows, the count, the scope and clear', async () => {
    select(2, 7);
    // Row 7 is on the second page and is a selected row all the same.
    expect(probe()).toBe('User 2,User 7|2|page');

    const actions = await table.getSelectionBarLoader();
    await (await actions.getHarness(WrButtonHarness.with({ text: 'Archive' }))).click();

    expect(host.archived()).toEqual(['User 2', 'User 7']);
    expect(host.selection()).toEqual([]);
    expect(await table.hasSelectionBar()).toBe(false);
  });

  it('reports the select-all scope, which server mode narrows to the page', () => {
    host.scope.set('all');
    select(1);
    expect(probe()).toBe('User 1|1|all');

    host.total.set(40);
    fixture.detectChanges();
    expect(probe()).toBe('User 1|1|page');
  });

  it('counts a key the table holds no row for', () => {
    host.total.set(40);
    select(1, 99);

    expect(probe()).toBe('User 1|2|page');
  });

  it('takes its texts from the label inputs', async () => {
    host.selectedLabel.set('Chosen: {{count}}');
    host.clearLabel.set('Drop');
    select(1, 2);

    expect(await table.getSelectionBarText()).toBe('Chosen: 2');
    expect(root().querySelector('.wr-table__selection-clear')!.textContent.trim()).toBe('Drop');
  });

  it('leaves the select-all cell out from under the bar, and the covered headers inert', () => {
    const bar = (): HTMLElement => root().querySelector<HTMLElement>('.wr-table__selection-bar')!;
    const nameHeader = root().querySelector<HTMLElement>('thead .wr-table__th:not(.wr-table__th--select)')!;
    expect(nameHeader.hasAttribute('inert')).toBe(false);

    select(1);
    expect(bar().classList).toContain('wr-table__selection-bar--inset');
    expect(nameHeader.hasAttribute('inert')).toBe(true);
    expect(root().querySelector('.wr-table__th--select')!.hasAttribute('inert')).toBe(false);

    // A single-selection table has no select-all to keep in reach.
    host.mode.set('single');
    fixture.detectChanges();
    expect(bar().classList).not.toContain('wr-table__selection-bar--inset');

    select();
    expect(nameHeader.hasAttribute('inert')).toBe(false);
  });

  it('does not take the focus when it appears', async () => {
    const [row] = await table.getRows();
    const box = root().querySelector<HTMLInputElement>('.wr-table__td--select input')!;
    box.focus();
    box.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(await row.isSelected()).toBe(true);
    expect(await table.hasSelectionBar()).toBe(true);
    expect(document.activeElement).toBe(box);
  });

  it('returns the focus to the table when the bar is cleared from inside it', async () => {
    select(1, 2);
    const clear = root().querySelector<HTMLElement>('.wr-table__selection-clear')!;
    clear.focus();
    expect(document.activeElement).toBe(clear);

    await table.clearSelection();
    await fixture.whenStable();

    expect(host.selection()).toEqual([]);
    expect(document.activeElement).toBe(root().querySelector('.wr-table__th--select input'));
  });

  it('returns the focus when an action of the template empties the selection', async () => {
    select(3);
    const archive = root().querySelector<HTMLElement>('.archive')!;
    archive.focus();
    archive.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.activeElement).toBe(root().querySelector('.wr-table__th--select input'));
  });

  it('focuses the scroll area in a table with no checkbox to take it', async () => {
    host.mode.set(null);
    select(3);
    const scroll = root().querySelector<HTMLElement>('.wr-table__scroll')!;
    expect(scroll.getAttribute('tabindex')).toBe('-1');

    root().querySelector<HTMLElement>('.wr-table__selection-clear')!.focus();
    await table.clearSelection();
    await fixture.whenStable();

    expect(document.activeElement).toBe(scroll);
  });

  it('leaves the focus alone when the selection empties from outside the bar', async () => {
    select(1);
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    select();
    await fixture.whenStable();

    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});

describe('WrTable selection bar in another language', () => {
  it('reads the count and the clear button from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.selection.set([1, 2]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.wr-table__selection-count')!.textContent.trim()).toBe('Выбрано: 2');
    expect(el.querySelector('.wr-table__selection-clear')!.textContent.trim()).toBe('Снять выделение');
    fixture.destroy();
  });
});
