import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTable } from './table';
import { WrTableColumnChooser } from './table-column-chooser';
import { WrTableColumnChooserHarness, WrTableHarness } from './testing';
import type { WrTableColumns, WrTableState } from './types';

type Row = Record<string, unknown>;

const ROWS: readonly Row[] = [
  { id: 1, name: 'Ada', role: 'admin', city: 'London', spent: 10 },
  { id: 2, name: 'Linus', role: 'user', city: 'Helsinki', spent: 20 },
];

const COLUMNS: WrTableColumns = {
  name: { title: 'Name', hideable: false },
  role: { title: 'Role' },
  city: { title: 'City' },
  spent: { title: 'Spent' },
};

@Component({
  imports: [WrTable, WrTableColumnChooser],
  template: `
    <header>
      <wr-table-column-chooser [table]="table" [showAllLabel]="showAllLabel()" />
    </header>
    <wr-table
      #table
      rowKey="id"
      [columns]="columns()"
      [items]="items"
      [columnChooser]="builtIn()"
      [(hiddenColumns)]="hidden"
      (hiddenColumnsChange)="writes.push($event)"
      (stateChange)="states.push($event)"
    />
  `,
})
class Host {
  readonly columns = signal<WrTableColumns>(COLUMNS);
  protected readonly items = ROWS;
  readonly builtIn = signal(false);
  readonly showAllLabel = signal<string | null>(null);
  readonly hidden = signal<readonly string[]>([]);
  readonly writes: (readonly string[])[] = [];
  readonly states: WrTableState[] = [];
}

describe('WrTableColumnChooser', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let table: WrTableHarness;
  let chooser: WrTableColumnChooserHarness;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const list = (): HTMLElement => root().querySelector<HTMLElement>('header wr-table-column-chooser')!;
  const allBox = (): HTMLInputElement =>
    list().querySelector<HTMLInputElement>('.wr-table-column-chooser__all input.wr-checkbox__input')!;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    fixture.detectChanges();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    table = await loader.getHarness(WrTableHarness);
    chooser = await loader.getHarness(WrTableColumnChooserHarness.with({ ancestor: 'header' }));
  });

  afterEach(() => fixture.destroy());

  it('lists every column of its table by title, as a named group of checkboxes', async () => {
    host.hidden.set(['city']);
    fixture.detectChanges();

    expect(await chooser.getColumns()).toEqual(['Name', 'Role', 'City', 'Spent']);
    expect(await chooser.isChecked('Role')).toBe(true);
    expect(await chooser.isChecked('City')).toBe(false);
    expect(list().classList).toContain('wr-table-column-chooser');
    expect(list().getAttribute('role')).toBe('group');
    expect(list().getAttribute('aria-label')).toBe('Columns');
    expect(list().querySelectorAll('input[type="checkbox"]')).toHaveLength(5);
  });

  it('writes `hiddenColumns` on every toggle, with the model and the state events', async () => {
    await chooser.toggle('City');
    expect(host.hidden()).toEqual(['city']);
    expect(await table.getHeaderTexts()).toEqual(['Name', 'Role', 'Spent']);

    await chooser.toggle('City');
    expect(host.hidden()).toEqual([]);
    expect(await table.getHeaderTexts()).toEqual(['Name', 'Role', 'City', 'Spent']);

    expect(host.writes).toEqual([['city'], []]);
    expect(host.states.map(state => state.hiddenColumns)).toEqual([['city'], []]);
  });

  it('keeps a `hideable: false` column checked and disabled', async () => {
    expect(await chooser.isLocked('Name')).toBe(true);
    expect(await chooser.isChecked('Name')).toBe(true);
    expect(await chooser.isLocked('Role')).toBe(false);
    await expect(chooser.toggle('Name')).rejects.toThrow(/cannot be toggled/);
  });

  it('locks the last column shown', async () => {
    host.columns.set({ a: { title: 'A' }, b: { title: 'B' } });
    fixture.detectChanges();

    await chooser.toggle('A');
    expect(await chooser.isLocked('B')).toBe(true);
    expect(await chooser.isChecked('B')).toBe(true);

    await chooser.toggle('A');
    expect(await chooser.isLocked('B')).toBe(false);
  });

  describe('Show all', () => {
    it('is the first row, checked while nothing is hidden', async () => {
      expect(list().firstElementChild!.classList).toContain('wr-table-column-chooser__all');
      expect(await chooser.getShowAllText()).toBe('Show all');
      expect(await chooser.getShowAllState()).toBe('all');
      expect(allBox().getAttribute('aria-checked')).not.toBe('mixed');
    });

    it('reports mixed while some hideable columns are hidden', async () => {
      await chooser.toggle('City');

      expect(await chooser.getShowAllState()).toBe('some');
      expect(allBox().indeterminate).toBe(true);
    });

    it('shows every column from a mixed state', async () => {
      host.hidden.set(['city', 'spent']);
      fixture.detectChanges();

      await chooser.showAll();

      expect(host.hidden()).toEqual([]);
      expect(await chooser.getShowAllState()).toBe('all');
      expect(await table.getHeaderTexts()).toEqual(['Name', 'Role', 'City', 'Spent']);
      expect(host.states.map(state => state.hiddenColumns)).toEqual([[]]);
    });

    it('hides every hideable column on a second press, and shows them on a third', async () => {
      await chooser.showAll();

      expect(host.hidden()).toEqual(['role', 'city', 'spent']);
      expect(await table.getHeaderTexts()).toEqual(['Name']);
      expect(await chooser.getShowAllState()).toBe('none');
      expect(host.states).toHaveLength(1);

      await chooser.showAll();
      expect(host.hidden()).toEqual([]);
      expect(await chooser.getShowAllState()).toBe('all');
    });

    it('keeps the first column when no column is `hideable: false`', async () => {
      host.columns.set({ a: { title: 'A' }, b: { title: 'B' }, c: { title: 'C' } });
      fixture.detectChanges();

      await chooser.showAll();

      expect(host.hidden()).toEqual(['b', 'c']);
      expect(await table.getHeaderTexts()).toEqual(['A']);
      expect(await chooser.isLocked('A')).toBe(true);
      // One column is still shown, so the row is mixed and the next press shows all.
      expect(await chooser.getShowAllState()).toBe('some');

      await chooser.showAll();
      expect(host.hidden()).toEqual([]);
    });

    it('is disabled when no column can be hidden', async () => {
      host.columns.set({ a: { title: 'A', hideable: false }, b: { title: 'B', hideable: false } });
      fixture.detectChanges();

      expect(allBox().disabled).toBe(true);
      await expect(chooser.showAll()).rejects.toThrow(/disabled/);
    });

    it('takes its text from `showAllLabel`', async () => {
      host.showAllLabel.set('Все столбцы');
      fixture.detectChanges();

      expect(await chooser.getShowAllText()).toBe('Все столбцы');
    });
  });

  it('follows columns that change at runtime', async () => {
    await chooser.toggle('City');

    host.columns.set({ name: { title: 'Name' }, city: { title: 'Town' }, age: { title: 'Age' } });
    fixture.detectChanges();

    expect(await chooser.getColumns()).toEqual(['Name', 'Town', 'Age']);
    expect(await chooser.isChecked('Town')).toBe(false);
    expect(await chooser.isLocked('Name')).toBe(false);
    expect(await chooser.getShowAllState()).toBe('some');

    await chooser.toggle('Age');
    expect(host.hidden()).toEqual(['city', 'age']);
    expect(await chooser.isLocked('Name')).toBe(true);
  });

  it('answers the same through the table: chooserColumns, toggleColumn, setHiddenColumns', () => {
    const instance = fixture.debugElement.children[1].componentInstance as WrTable;

    instance.toggleColumn('name');
    instance.toggleColumn('nowhere');
    expect(host.hidden()).toEqual([]);

    instance.toggleColumn('role');
    fixture.detectChanges();
    expect(instance.chooserColumns()).toEqual([
      { key: 'name', title: 'Name', hidden: false, hideable: false, locked: true },
      { key: 'role', title: 'Role', hidden: true, hideable: true, locked: false },
      { key: 'city', title: 'City', hidden: false, hideable: true, locked: false },
      { key: 'spent', title: 'Spent', hidden: false, hideable: true, locked: false },
    ]);

    // Column order, less the column that cannot be hidden and a key no column has.
    instance.setHiddenColumns(['spent', 'name', 'nowhere', 'city']);
    expect(host.hidden()).toEqual(['city', 'spent']);

    instance.setHiddenColumns(['city', 'spent']);
    fixture.detectChanges();
    expect(host.writes).toEqual([['role'], ['city', 'spent']]);
    expect(host.states).toHaveLength(2);
  });

  describe('the built-in `columnChooser`', () => {
    let panel: WrTableColumnChooserHarness;

    beforeEach(async () => {
      host.builtIn.set(true);
      fixture.detectChanges();
      panel = await table.getColumnChooser();
    });

    it('renders the same list in its panel, under the button it had', async () => {
      expect(root().querySelector('.wr-table__toolbar .wr-table__columns-btn')!.textContent.trim()).toBe('Columns');
      const body = document.querySelector('.wr-overlay-container .wr-table__columns')!;
      expect(body.querySelector('wr-table-column-chooser')).not.toBeNull();
      expect([...body.querySelectorAll('.wr-table__columns-item')].map(el => el.textContent.trim())).toEqual([
        'Name',
        'Role',
        'City',
        'Spent',
      ]);
      expect(await panel.getColumns()).toEqual(['Name', 'Role', 'City', 'Spent']);
    });

    it('keeps the table harness methods working', async () => {
      await table.toggleColumn('City');

      expect(host.hidden()).toEqual(['city']);
      expect(await table.getHiddenColumns()).toEqual(['City']);
      expect(await table.isColumnLocked('Name')).toBe(true);
      await expect(table.toggleColumn('Name')).rejects.toThrow(/cannot be toggled/);
    });

    it('has the Show all row, in step with a chooser outside the table', async () => {
      await table.toggleColumn('City');
      expect(await panel.getShowAllState()).toBe('some');
      expect(await chooser.getShowAllState()).toBe('some');

      await panel.showAll();
      expect(host.hidden()).toEqual([]);

      await panel.showAll();
      expect(host.hidden()).toEqual(['role', 'city', 'spent']);
      expect(await chooser.getShowAllState()).toBe('none');
      expect(await chooser.isChecked('Role')).toBe(false);
    });
  });
});

describe('WrTableColumnChooser in another language', () => {
  it('reads the Show all row and its own name from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const list = (fixture.nativeElement as HTMLElement).querySelector('header wr-table-column-chooser')!;
    expect(list.querySelector('.wr-table-column-chooser__all')!.textContent.trim()).toBe('Показать все');
    expect(list.getAttribute('aria-label')).toBe('Столбцы');
    fixture.destroy();
  });
});
