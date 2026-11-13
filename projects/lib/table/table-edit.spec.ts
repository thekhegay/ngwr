import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrTable } from './table';
import { WrTableEditCell } from './table-edit-cell';
import { WrTableSelectionBar } from './table-selection-bar';
import { WrTableHarness } from './testing';
import type { WrTableCellEdit, WrTableColumns, WrTableEditable, WrTableSortState } from './types';

interface Product {
  id: number;
  sku: string;
  name: string;
  stock: number;
  price: number;
}

const product = (id: number): Product => ({ id, sku: `S-${id}`, name: `Item ${id}`, stock: id * 2, price: id * 10 });

@Component({
  imports: [WrTable, WrTableEditCell, WrTableSelectionBar],
  template: `
    <button type="button" class="outside">Outside</button>
    <wr-table
      rowKey="id"
      [columns]="columns()"
      [items]="items()"
      [editable]="editable()"
      [rowSelection]="rowSelection()"
      [virtualScroll]="virtual()"
      [rowHeight]="40"
      [viewportHeight]="200"
      [(selection)]="selection"
      [(hiddenColumns)]="hidden"
      [(sort)]="sort"
      (cellEdit)="edits.push($event)"
    >
      <ng-template wrTableSelectionBar>
        <button type="button" class="bulk">Archive</button>
      </ng-template>
      <ng-template wrTableEditCell="sku" let-value>
        <input class="sku-editor" [value]="value" />
      </ng-template>
      <ng-template wrTableEditCell="name" [wrTableEditCellOf]="items()" let-value let-set="set">
        <input class="name-editor" [value]="value" (input)="set(text($event))" />
      </ng-template>
      <ng-template
        wrTableEditCell="price"
        [wrTableEditCellOf]="items()"
        let-value
        let-row="row"
        let-set="set"
        let-commit="commit"
        let-cancel="cancel"
      >
        <input class="price-editor" [value]="value" (input)="set(+text($event))" />
        <button type="button" class="save" (click)="commit(row.price + 1)">Save</button>
        <button type="button" class="discard" (click)="cancel()">Discard</button>
        <button type="button" class="popup" aria-expanded="true">Open</button>
      </ng-template>
    </wr-table>
  `,
})
class Host {
  readonly columns = signal<WrTableColumns<Product>>({
    sku: { title: 'SKU', editable: false },
    name: { title: 'Name', pin: 'left' },
    stock: { title: 'Stock' },
    price: { title: 'Price', sortable: true },
  });
  readonly items = signal<readonly Product[]>([product(1), product(2), product(3)]);
  readonly editable = signal<WrTableEditable<Product> | null>(null);
  readonly rowSelection = signal<'multiple' | null>(null);
  readonly virtual = signal(false);
  readonly selection = signal<readonly unknown[]>([]);
  readonly hidden = signal<readonly string[]>([]);
  readonly sort = signal<readonly WrTableSortState[]>([]);
  readonly edits: WrTableCellEdit<Product>[] = [];

  protected text(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}

describe('WrTable inline editing', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  /** A data cell by 0-based row and column title. */
  const cell = (row: number, title: string): HTMLTableCellElement =>
    root()
      .querySelectorAll<HTMLElement>('tbody .wr-table__tr')
      [row].querySelector<HTMLTableCellElement>(`.wr-table__td[data-label="${title}"]`)!;
  const editingCells = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-table__td--editing')];
  const editor = (cls: string): HTMLInputElement => root().querySelector<HTMLInputElement>(`.${cls}`)!;

  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const key = async (target: HTMLElement, name: string, init: KeyboardEventInit = {}): Promise<KeyboardEvent> => {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    await settle();
    return event;
  };
  const dblclick = async (target: HTMLElement): Promise<void> => {
    target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle();
  };
  const type = async (input: HTMLInputElement, value: string): Promise<void> => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await settle();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('the grid', () => {
    it('announces a grid whose data cells hold one roving tab stop', () => {
      expect(root().querySelector('table')!.getAttribute('role')).toBe('grid');
      const stops = [...root().querySelectorAll('tbody .wr-table__td')].map(td => td.getAttribute('tabindex'));
      expect(stops.filter(stop => stop === '0')).toHaveLength(1);
      expect(stops.filter(stop => stop === '-1')).toHaveLength(stops.length - 1);
      expect(cell(0, 'SKU').getAttribute('tabindex')).toBe('0');
    });

    it('moves focus between cells with the arrows, Home and End, and the tab stop follows', async () => {
      cell(0, 'SKU').focus();
      await key(cell(0, 'SKU'), 'ArrowRight');
      expect(document.activeElement).toBe(cell(0, 'Name'));
      await key(cell(0, 'Name'), 'ArrowDown');
      expect(document.activeElement).toBe(cell(1, 'Name'));
      expect(cell(1, 'Name').getAttribute('tabindex')).toBe('0');
      expect(cell(0, 'SKU').getAttribute('tabindex')).toBe('-1');
      await key(cell(1, 'Name'), 'End');
      expect(document.activeElement).toBe(cell(1, 'Price'));
      await key(cell(1, 'Price'), 'Home', { ctrlKey: true });
      expect(document.activeElement).toBe(cell(0, 'SKU'));
      await key(cell(0, 'SKU'), 'ArrowUp');
      expect(document.activeElement).toBe(cell(0, 'SKU'));
    });

    it('marks the cells that open an editor', () => {
      expect(cell(0, 'Name').classList.contains('wr-table__td--editable')).toBe(true);
      expect(cell(0, 'Price').classList.contains('wr-table__td--editable')).toBe(true);
      expect(cell(0, 'Stock').classList.contains('wr-table__td--editable')).toBe(false);
    });
  });

  describe('entering', () => {
    it('opens the editor on a double click and focuses its field', async () => {
      await dblclick(cell(0, 'Name'));
      expect(editingCells()).toEqual([cell(0, 'Name')]);
      expect(editor('name-editor').value).toBe('Item 1');
      expect(document.activeElement).toBe(editor('name-editor'));
      expect(cell(0, 'Name').textContent.trim()).toBe('');
    });

    it.each(['Enter', 'F2'])('opens the editor on %s from the focused cell', async name => {
      cell(1, 'Price').focus();
      const event = await key(cell(1, 'Price'), name);
      expect(event.defaultPrevented).toBe(true);
      expect(editingCells()).toEqual([cell(1, 'Price')]);
      expect(document.activeElement).toBe(editor('price-editor'));
      expect(editor('price-editor').value).toBe('20');
    });

    it('starts with the character a printable key typed', async () => {
      cell(0, 'Name').focus();
      await key(cell(0, 'Name'), 'Z');
      expect(editingCells()).toEqual([cell(0, 'Name')]);
      expect(editor('name-editor').value).toBe('Z');
      await key(editor('name-editor'), 'Enter');
      expect(host.edits).toEqual([{ row: host.items()[0], key: 'name', value: 'Z', previous: 'Item 1' }]);
    });

    it('leaves a key with a shortcut modifier and the space bar alone', async () => {
      cell(0, 'Name').focus();
      await key(cell(0, 'Name'), 'c', { ctrlKey: true });
      await key(cell(0, 'Name'), ' ');
      expect(editingCells()).toEqual([]);
      await key(cell(0, 'Name'), 'c');
      expect(editingCells()).toEqual([cell(0, 'Name')]);
    });

    it('does not open a cell with no editor', async () => {
      await dblclick(cell(0, 'Stock'));
      cell(0, 'Stock').focus();
      await key(cell(0, 'Stock'), 'Enter');
      expect(editingCells()).toEqual([]);
      // The cell is still part of the grid: it takes focus and the arrows.
      expect(cell(0, 'Stock').getAttribute('tabindex')).toBe('0');
    });
  });

  describe('committing', () => {
    it('emits cellEdit on Enter, leaves the data alone and returns focus to the cell', async () => {
      const before = host.items();
      await dblclick(cell(0, 'Name'));
      await type(editor('name-editor'), 'Renamed');
      const event = await key(editor('name-editor'), 'Enter');
      expect(event.defaultPrevented).toBe(true);
      expect(host.edits).toEqual([{ row: before[0], key: 'name', value: 'Renamed', previous: 'Item 1' }]);
      expect(host.items()).toBe(before);
      expect(before[0].name).toBe('Item 1');
      expect(editingCells()).toEqual([]);
      expect(cell(0, 'Name').textContent.trim()).toBe('Item 1');
      expect(document.activeElement).toBe(cell(0, 'Name'));
    });

    it('commits on Tab and moves to the next editable cell of the row', async () => {
      await dblclick(cell(0, 'Name'));
      await type(editor('name-editor'), 'Renamed');
      const event = await key(editor('name-editor'), 'Tab');
      expect(event.defaultPrevented).toBe(true);
      expect(host.edits).toEqual([{ row: host.items()[0], key: 'name', value: 'Renamed', previous: 'Item 1' }]);
      expect(editingCells()).toEqual([]);
      // Stock has no editor, so the next editable cell is Price.
      expect(document.activeElement).toBe(cell(0, 'Price'));
    });

    it('goes back on Shift+Tab, and stays on the cell where the row has no editable cell left', async () => {
      await dblclick(cell(0, 'Price'));
      await key(editor('price-editor'), 'Tab', { shiftKey: true });
      expect(document.activeElement).toBe(cell(0, 'Name'));
      await key(cell(0, 'Name'), 'Enter');
      // SKU says `editable: false`.
      await key(editor('name-editor'), 'Tab', { shiftKey: true });
      expect(editingCells()).toEqual([]);
      expect(document.activeElement).toBe(cell(0, 'Name'));
    });

    it('commits on a click outside the cell and leaves focus where the click put it', async () => {
      await dblclick(cell(0, 'Price'));
      await type(editor('price-editor'), '15');
      const outside = root().querySelector<HTMLElement>('.outside')!;
      outside.focus();
      outside.click();
      await settle();
      expect(host.edits).toEqual([{ row: host.items()[0], key: 'price', value: 15, previous: 10 }]);
      expect(editingCells()).toEqual([]);
      expect(document.activeElement).toBe(outside);
    });

    it('keeps editing through a click inside the editor', async () => {
      await dblclick(cell(0, 'Price'));
      await type(editor('price-editor'), '15');
      editor('price-editor').click();
      await settle();
      expect(editingCells()).toEqual([cell(0, 'Price')]);
      expect(host.edits).toEqual([]);
    });

    it("commits the template's own commit(value)", async () => {
      await dblclick(cell(1, 'Price'));
      root().querySelector<HTMLElement>('.save')!.click();
      await settle();
      expect(host.edits).toEqual([{ row: host.items()[1], key: 'price', value: 21, previous: 20 }]);
      expect(editingCells()).toEqual([]);
      expect(document.activeElement).toBe(cell(1, 'Price'));
    });

    it('emits nothing for a value that did not change', async () => {
      await dblclick(cell(0, 'Name'));
      await key(editor('name-editor'), 'Enter');
      expect(editingCells()).toEqual([]);
      expect(host.edits).toEqual([]);
    });
  });

  describe('cancelling', () => {
    it('restores the cell on Escape and returns focus to it', async () => {
      await dblclick(cell(0, 'Name'));
      await type(editor('name-editor'), 'Renamed');
      const event = await key(editor('name-editor'), 'Escape');
      expect(event.defaultPrevented).toBe(true);
      expect(host.edits).toEqual([]);
      expect(editingCells()).toEqual([]);
      expect(cell(0, 'Name').textContent.trim()).toBe('Item 1');
      expect(document.activeElement).toBe(cell(0, 'Name'));
    });

    it("leaves Escape and Enter to the editor's open popup", async () => {
      await dblclick(cell(0, 'Price'));
      await type(editor('price-editor'), '15');
      const popup = root().querySelector<HTMLElement>('.popup')!;
      expect((await key(popup, 'Escape')).defaultPrevented).toBe(false);
      expect((await key(popup, 'Enter')).defaultPrevented).toBe(false);
      expect(editingCells()).toEqual([cell(0, 'Price')]);
      await key(popup, 'Tab');
      expect(editingCells()).toEqual([]);
      expect(host.edits).toEqual([{ row: host.items()[0], key: 'price', value: 15, previous: 10 }]);
    });

    it("drops the edit on the template's cancel()", async () => {
      await dblclick(cell(0, 'Price'));
      await type(editor('price-editor'), '15');
      root().querySelector<HTMLElement>('.discard')!.click();
      await settle();
      expect(host.edits).toEqual([]);
      expect(editingCells()).toEqual([]);
      expect(document.activeElement).toBe(cell(0, 'Price'));
    });

    it('starts the next edit from the cell, not from the dropped value', async () => {
      await dblclick(cell(0, 'Name'));
      await type(editor('name-editor'), 'Renamed');
      await key(editor('name-editor'), 'Escape');
      await key(cell(0, 'Name'), 'F2');
      expect(editor('name-editor').value).toBe('Item 1');
    });
  });

  it('edits one cell at a time: opening another commits the first', async () => {
    await dblclick(cell(0, 'Name'));
    await type(editor('name-editor'), 'Renamed');
    await dblclick(cell(2, 'Price'));
    expect(editingCells()).toEqual([cell(2, 'Price')]);
    expect(root().querySelectorAll('.name-editor')).toHaveLength(0);
    expect(host.edits).toEqual([{ row: host.items()[0], key: 'name', value: 'Renamed', previous: 'Item 1' }]);
    expect(document.activeElement).toBe(editor('price-editor'));
  });

  describe('what is editable', () => {
    it('keeps an `editable: false` column read-only despite its template', async () => {
      expect(cell(0, 'SKU').classList.contains('wr-table__td--editable')).toBe(false);
      await dblclick(cell(0, 'SKU'));
      cell(0, 'SKU').focus();
      await key(cell(0, 'SKU'), 'F2');
      await key(cell(0, 'SKU'), 'x');
      expect(editingCells()).toEqual([]);
      expect(root().querySelector('.sku-editor')).toBeNull();

      host.columns.update(columns => ({ ...columns, sku: { title: 'SKU' } }));
      await settle();
      await key(cell(0, 'SKU'), 'F2');
      expect(root().querySelector('.sku-editor')).not.toBeNull();
    });

    it('lets the `editable` predicate veto single cells', async () => {
      const asked: [number, string][] = [];
      host.editable.set((row, column) => {
        asked.push([row.id, column]);
        return !(row.id === 2 && column === 'price');
      });
      await settle();
      expect(cell(1, 'Price').classList.contains('wr-table__td--editable')).toBe(false);
      expect(cell(1, 'Name').classList.contains('wr-table__td--editable')).toBe(true);
      expect(cell(0, 'Price').classList.contains('wr-table__td--editable')).toBe(true);
      // Never asked about a column that cannot be edited at all.
      expect(asked.some(([, column]) => column === 'sku' || column === 'stock')).toBe(false);

      await dblclick(cell(1, 'Price'));
      expect(editingCells()).toEqual([]);

      // Tab from Name finds no editable cell after it in that row.
      await dblclick(cell(1, 'Name'));
      await key(editor('name-editor'), 'Tab');
      expect(document.activeElement).toBe(cell(1, 'Name'));

      await dblclick(cell(0, 'Price'));
      expect(editingCells()).toEqual([cell(0, 'Price')]);
    });
  });

  describe('beside the other features', () => {
    it('edits a pinned column in place', async () => {
      await dblclick(cell(0, 'Name'));
      expect(cell(0, 'Name').classList.contains('wr-table__td--pin-left')).toBe(true);
      expect(editingCells()).toEqual([cell(0, 'Name')]);
    });

    it('ends the edit without a commit when its column is hidden', async () => {
      await dblclick(cell(0, 'Price'));
      await type(editor('price-editor'), '15');
      host.hidden.set(['price']);
      await settle();
      expect(root().querySelector('.price-editor')).toBeNull();
      expect(editingCells()).toEqual([]);
      expect(host.edits).toEqual([]);
      host.hidden.set([]);
      await settle();
      expect(editingCells()).toEqual([]);
    });

    it('steps over a hidden column on Tab', async () => {
      host.columns.update(columns => ({ ...columns, stock: { title: 'Stock' }, sku: { title: 'SKU' } }));
      host.hidden.set(['name']);
      await settle();
      await dblclick(cell(0, 'SKU'));
      await key(editor('sku-editor'), 'Tab');
      expect(document.activeElement).toBe(cell(0, 'Price'));
    });

    it('ends the edit without a commit when the sort changes', async () => {
      await dblclick(cell(0, 'Name'));
      await type(editor('name-editor'), 'Renamed');
      host.sort.set([{ key: 'price', direction: 'desc' }]);
      await settle();
      expect(editingCells()).toEqual([]);
      expect(host.edits).toEqual([]);
      // The editor held focus, so it goes to the cell rather than to the body.
      expect(document.activeElement).toBe(cell(0, 'Name'));
    });

    it('commits before the sort a click on the header asks for', async () => {
      await dblclick(cell(0, 'Name'));
      await type(editor('name-editor'), 'Renamed');
      root().querySelector<HTMLElement>('.wr-table__sort-btn')!.click();
      await settle();
      expect(host.edits).toEqual([{ row: host.items()[0], key: 'name', value: 'Renamed', previous: 'Item 1' }]);
      expect(host.sort()).toEqual([{ key: 'price', direction: 'asc' }]);
      expect(editingCells()).toEqual([]);
    });

    it('ends the edit when its row leaves the data', async () => {
      await dblclick(cell(0, 'Name'));
      await type(editor('name-editor'), 'Renamed');
      host.items.update(items => items.slice(1));
      await settle();
      expect(editingCells()).toEqual([]);
      expect(host.edits).toEqual([]);
    });

    it('finds its cells past the selection column and under the selection bar', async () => {
      host.rowSelection.set('multiple');
      host.selection.set([1, 2]);
      await settle();
      expect(root().querySelector('.wr-table__selection-bar')).not.toBeNull();
      await dblclick(cell(1, 'Price'));
      expect(editingCells()).toEqual([cell(1, 'Price')]);
      await type(editor('price-editor'), '25');
      await key(editor('price-editor'), 'Tab', { shiftKey: true });
      expect(host.edits).toEqual([{ row: host.items()[1], key: 'price', value: 25, previous: 20 }]);
      expect(document.activeElement).toBe(cell(1, 'Name'));
      expect(host.selection()).toEqual([1, 2]);
      // The arrows stop at the first data cell, short of the selection box.
      await key(cell(1, 'Name'), 'Home');
      expect(document.activeElement).toBe(cell(1, 'SKU'));
      await key(cell(1, 'SKU'), 'ArrowLeft');
      expect(document.activeElement).toBe(cell(1, 'SKU'));
    });

    it('commits an edit whose row the virtual window drops', async () => {
      host.items.set(Array.from({ length: 200 }, (_, i) => product(i + 1)));
      host.virtual.set(true);
      await settle();
      expect(root().querySelector('wr-table')!.classList.contains('wr-table--virtual')).toBe(true);
      expect(root().querySelectorAll('tbody .wr-table__tr').length).toBeLessThan(200);

      await dblclick(cell(0, 'Name'));
      await type(editor('name-editor'), 'Renamed');
      const scroll = root().querySelector<HTMLElement>('.wr-table__scroll')!;
      scroll.scrollTop = 4000;
      // The table reads the offset in a frame. Stubbed for the one dispatch:
      // Angular's own scheduler asks for frames too.
      vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback): number => {
        callback(0);
        return 1;
      });
      scroll.dispatchEvent(new Event('scroll'));
      vi.unstubAllGlobals();
      await settle();

      expect(root().querySelector('.name-editor')).toBeNull();
      expect(editingCells()).toEqual([]);
      expect(host.edits).toEqual([{ row: host.items()[0], key: 'name', value: 'Renamed', previous: 'Item 1' }]);
    });
  });

  describe('WrTableHarness', () => {
    const table = (): Promise<WrTableHarness> => TestbedHarnessEnvironment.loader(fixture).getHarness(WrTableHarness);

    it('reports the grid role', async () => {
      expect(await (await table()).getRole()).toBe('grid');
    });

    it('opens a cell with editCell() and commits it with commitEdit()', async () => {
      const harness = await table();
      expect(await harness.isEditing()).toBe(false);
      const edited = await harness.editCell(1, 'Name');
      expect(await harness.isEditing()).toBe(true);
      expect(await edited.isEditing()).toBe(true);
      expect(await edited.isEditable()).toBe(true);
      await type(editor('name-editor'), 'Renamed');
      await harness.commitEdit();
      expect(await harness.isEditing()).toBe(false);
      expect(host.edits).toEqual([{ row: host.items()[1], key: 'name', value: 'Renamed', previous: 'Item 2' }]);
    });

    it('drops the edit with cancelEdit()', async () => {
      const harness = await table();
      await harness.editCell(0, 'Price');
      await type(editor('price-editor'), '15');
      await harness.cancelEdit();
      expect(await harness.isEditing()).toBe(false);
      expect(host.edits).toEqual([]);
    });

    it('says why a cell did not open, and that there is no edit to end', async () => {
      const harness = await table();
      await expect(harness.editCell(0, 'SKU')).rejects.toThrow(/is not editable/);
      await expect(harness.editCell(0, 'Nope')).rejects.toThrow(/no cell under "Nope"/);
      await expect(harness.editCell(9, 'Name')).rejects.toThrow(/no row 9/);
      await expect(harness.commitEdit()).rejects.toThrow(/no cell is being edited/);
      await expect(harness.cancelEdit()).rejects.toThrow(/no cell is being edited/);
    });
  });
});
