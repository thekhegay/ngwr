import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrButton } from 'ngwr/button';
import { WrButtonHarness } from 'ngwr/button/testing';
import { provideWrOverlay } from 'ngwr/overlay';
import { WrTable, WrTableCell, WrTableExpand, type WrTableColumns, type WrTableSortState } from 'ngwr/table';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTableHarness } from './wr-table-harness';

const COLUMNS: WrTableColumns = {
  name: { title: 'Name', sortable: true, pin: 'left' },
  role: { title: 'Role', filterItems: [{ title: 'Admin', value: 'admin' }] },
  score: { title: 'Score', summary: 'sum' },
};

const ROWS = [
  { id: 1, name: 'Ada', role: 'admin', score: 10 },
  { id: 2, name: 'Linus', role: 'user', score: 20 },
  { id: 3, name: 'Grace', role: 'admin', score: 30 },
];

const FOREST = [
  {
    id: 'src',
    name: 'src',
    role: 'dir',
    score: 2,
    kids: [
      {
        id: 'app',
        name: 'app',
        role: 'dir',
        score: 1,
        kids: [{ id: 'main', name: 'main.ts', role: 'file', score: 1 }],
      },
      { id: 'styles', name: 'styles.css', role: 'file', score: 1 },
    ],
  },
  { id: 'readme', name: 'README.md', role: 'file', score: 1 },
];

@Component({
  imports: [WrTable],
  template: `
    <wr-table
      rowKey="id"
      [columns]="columns"
      [items]="items()"
      [loading]="loading()"
      [rowSelection]="rowSelection()"
      [(selection)]="selection"
      [(sort)]="sort"
    />
  `,
})
class Host {
  readonly columns = COLUMNS;
  readonly items = signal<readonly Record<string, unknown>[]>(ROWS);
  readonly loading = signal(false);
  readonly rowSelection = signal<'single' | 'multiple' | null>(null);
  readonly selection = signal<readonly unknown[]>([]);
  readonly sort = signal<readonly WrTableSortState[]>([]);
}

@Component({
  imports: [WrButton, WrTable, WrTableCell, WrTableExpand],
  template: `
    <wr-table rowKey="id" [columns]="columns" [items]="items" [(expanded)]="expanded">
      <ng-template wrTableCell="role" let-value>
        <button type="button" wr-btn color="primary">Edit {{ value }}</button>
      </ng-template>
      <ng-template wrTableExpand let-row>
        <p>Bio of {{ row.name }}</p>
      </ng-template>
    </wr-table>
  `,
})
class ExpandHost {
  readonly columns = COLUMNS;
  readonly items = ROWS;
  readonly expanded = signal<readonly unknown[]>([]);
}

@Component({
  imports: [WrTable],
  template: `<wr-table rowKey="id" childrenKey="kids" [columns]="columns" [items]="items" [(expanded)]="expanded" />`,
})
class TreeHost {
  readonly columns = COLUMNS;
  readonly items = FOREST;
  readonly expanded = signal<readonly unknown[]>([]);
}

@Component({
  imports: [WrTable],
  template: `
    <wr-table
      rowKey="id"
      groupBy="role"
      [columns]="columns"
      [items]="items"
      [groupSummary]="groupSummary()"
      [(collapsedGroups)]="collapsed"
    />
  `,
})
class GroupHost {
  readonly columns = COLUMNS;
  readonly items = ROWS;
  readonly collapsed = signal<readonly unknown[]>([]);
  readonly groupSummary = signal(false);
}

const BIG_COLUMNS: WrTableColumns = { name: { title: 'Name' }, role: { title: 'Role' } };

@Component({
  imports: [WrTable],
  template: `
    <wr-table
      rowKey="id"
      virtualScroll
      [columns]="columns"
      [items]="items"
      [viewportHeight]="200"
      [groupBy]="groupBy()"
      [rowSelection]="rowSelection()"
      [(selection)]="selection"
    />
  `,
})
class VirtualHost {
  readonly columns = BIG_COLUMNS;
  readonly items = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    name: `Row ${i + 1}`,
    role: i % 2 === 0 ? 'admin' : 'user',
  }));
  readonly groupBy = signal<string | null>(null);
  readonly rowSelection = signal<'single' | 'multiple' | null>(null);
  readonly selection = signal<readonly unknown[]>([]);
}

@Component({
  imports: [WrTable],
  template: `
    <wr-table [columns]="people" [items]="rows" />
    <wr-table rowKey="id" childrenKey="kids" [columns]="files" [items]="forest" />
  `,
})
class TwoHost {
  readonly people: WrTableColumns = { name: { title: 'Name' } };
  readonly files: WrTableColumns = { name: { title: 'Path' } };
  readonly rows = ROWS;
  readonly forest = FOREST;
}

/**
 * A table is a TREE of harnesses, and the interesting part of the contract is what
 * counts as a row. A `<tbody>` also holds group bands, per-group subtotals, detail
 * rows, virtual spacers and the "no data" row — every one of them a `<tr>` — so
 * several cases below assert against the RAW `tbody tr` count on purpose: a harness
 * that queried that would answer with rows that have no cells, and every count in
 * a consumer's spec would be quietly wrong.
 *
 * `provideWrOverlay()` is here because the `Role` column is filterable: its header
 * renders a `wr-dropdown` trigger, and an isolated container keeps anything the
 * dropdown creates out of the next spec file.
 */
describe('WrTableHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const bodyRowCount = (): number => (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr').length;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads the column titles, and counts only the columns', async () => {
    const table = await loader.getHarness(WrTableHarness);
    expect(await table.getHeaderTexts()).toEqual(['Name', 'Role', 'Score']);

    fixture.componentInstance.rowSelection.set('multiple');
    fixture.detectChanges();

    // The selection header is a `<th>` too, and it is not a column: counting it
    // would make the header list one wider than every row.
    expect(await table.getHeaderTexts()).toEqual(['Name', 'Role', 'Score']);
  });

  it('announces the native table role, not a grid', async () => {
    const table = await loader.getHarness(WrTableHarness);

    expect(await table.getRole()).toBe('table');
    expect(await table.isTree()).toBe(false);
    expect(await table.isVirtual()).toBe(false);
    expect(await table.getAriaRowCount()).toBeNull();
  });

  it('gives one harness per data row, and the body as a matrix', async () => {
    const table = await loader.getHarness(WrTableHarness);

    expect(await table.getRows()).toHaveLength(3);
    expect(await table.getCellTexts()).toEqual([
      ['Ada', 'admin', '10'],
      ['Linus', 'user', '20'],
      ['Grace', 'admin', '30'],
    ]);
  });

  it('keeps the matrix as wide as the header list once a selection column appears', async () => {
    fixture.componentInstance.rowSelection.set('multiple');
    fixture.detectChanges();

    const table = await loader.getHarness(WrTableHarness);
    const [first] = await table.getCellTexts();

    // The lead checkbox cell shares the `.wr-table__td` class with the data cells;
    // including it would put an empty string in front of every row.
    expect(first).toEqual(['Ada', 'admin', '10']);
    expect(first).toHaveLength((await table.getHeaderTexts()).length);
  });

  it('narrows rows by cell text, exactly or by pattern', async () => {
    const table = await loader.getHarness(WrTableHarness);

    const ada = await table.getRows({ cellText: 'Ada' });
    const admins = await table.getRows({ cellText: /^admin$/ });

    expect(await Promise.all(ada.map(row => row.getCellTexts()))).toEqual([['Ada', 'admin', '10']]);
    expect(await Promise.all(admins.map(async row => (await row.getCellTexts())[0]))).toEqual(['Ada', 'Grace']);
  });

  it('reports the empty message instead of counting the empty row as a row', async () => {
    fixture.componentInstance.items.set([]);
    fixture.detectChanges();

    const table = await loader.getHarness(WrTableHarness);

    expect(await table.getRows()).toEqual([]);
    expect(await table.getEmptyText()).toBe('No data');
    // The "no data" row is a `<tr>` in the body, and it is not a row.
    expect(bodyRowCount()).toBe(1);
  });

  it('sees the loading overlay come and go', async () => {
    const table = await loader.getHarness(WrTableHarness);
    expect(await table.isLoading()).toBe(false);

    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();

    expect(await table.isLoading()).toBe(true);
  });

  it('cycles a column through the sort states and announces each in ARIA', async () => {
    const table = await loader.getHarness(WrTableHarness);
    expect(await table.getSortDirection('Name')).toBe('none');

    await table.sortByColumn('Name');
    expect(await table.getSortDirection('Name')).toBe('ascending');
    // Sorting is an intent the table publishes; the host owns the data, so the
    // model is where the click has to land.
    expect(fixture.componentInstance.sort()).toEqual([{ key: 'name', direction: 'asc' }]);

    await table.sortByColumn('Name');
    expect(await table.getSortDirection('Name')).toBe('descending');

    await table.sortByColumn('Name');
    expect(await table.getSortDirection('Name')).toBe('none');
    expect(fixture.componentInstance.sort()).toEqual([]);
  });

  it('says nothing about sorting on a plain column, and refuses to sort it', async () => {
    const table = await loader.getHarness(WrTableHarness);

    // `null`, not `'none'`: a plain column omits `aria-sort` rather than claiming
    // a sortability it does not have.
    expect(await table.getSortDirection('Role')).toBeNull();
    await expect(table.sortByColumn('Role')).rejects.toThrow(/no sort control/);
  });

  it('narrows headers by sortability', async () => {
    const table = await loader.getHarness(WrTableHarness);

    const sortable = await table.getHeaderCells({ sortable: true });
    const plain = await table.getHeaderCells({ sortable: false });

    expect(await Promise.all(sortable.map(header => header.getText()))).toEqual(['Name']);
    expect(await Promise.all(plain.map(header => header.getText()))).toEqual(['Role', 'Score']);
  });

  it('names the columns it does have when asked for one that does not exist', async () => {
    const table = await loader.getHarness(WrTableHarness);

    // The column KEY never reaches the DOM, so `'name'` is the mistake a consumer
    // makes first — the message has to say so.
    await expect(table.getSortDirection('name')).rejects.toThrow(/no column headed "name"/);
    await expect(table.getSortDirection('name')).rejects.toThrow(/Name, Role, Score/);
  });

  it('reports which columns sort, which filter and which are frozen', async () => {
    const table = await loader.getHarness(WrTableHarness);
    const [name, role] = await table.getHeaderCells();
    const [score] = await table.getHeaderCells({ text: /^Sco/ });

    expect(await name.isSortable()).toBe(true);
    expect(await role.isSortable()).toBe(false);
    expect(await role.isFilterable()).toBe(true);
    expect(await name.isFilterable()).toBe(false);
    expect(await name.getPin()).toBe('left');
    expect(await role.getPin()).toBeNull();
    expect(await score.getText()).toBe('Score');
  });

  it('says which column a cell belongs to, and whether it is frozen', async () => {
    const table = await loader.getHarness(WrTableHarness);
    const [row] = await table.getRows({ cellText: 'Ada' });

    const [name] = await row.getCells({ columnTitle: 'Name' });
    const [score] = await row.getCells({ text: '10' });

    expect(await name.getText()).toBe('Ada');
    expect(await name.getColumnTitle()).toBe('Name');
    expect(await name.getPin()).toBe('left');
    expect(await score.getColumnTitle()).toBe('Score');
    expect(await score.getPin()).toBeNull();
  });

  it('reads the summary footer, aligned with the header list', async () => {
    const table = await loader.getHarness(WrTableHarness);

    // One entry per column, `''` where the column defines no aggregate.
    expect(await table.getFooterTexts()).toEqual(['', '', '60']);

    fixture.componentInstance.rowSelection.set('multiple');
    fixture.detectChanges();

    // The lead footer cell shares `.wr-table__foot-cell` with the summary cells;
    // counting it would put a fourth entry in front and unalign the list from
    // `getHeaderTexts()`.
    expect(await table.getFooterTexts()).toEqual(['', '', '60']);
    expect(await table.getFooterTexts()).toHaveLength((await table.getHeaderTexts()).length);
  });

  it('has no group bands to report when grouping is off', async () => {
    const table = await loader.getHarness(WrTableHarness);

    expect(await table.getGroupLabels()).toEqual([]);
  });
});

describe('WrTableHarness — row selection', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let table: WrTableHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.rowSelection.set('multiple');
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
    table = await loader.getHarness(WrTableHarness);
  });

  afterEach(() => fixture.destroy());

  it('ticks one row and collects its key', async () => {
    const [ada] = await table.getRows({ cellText: 'Ada' });

    expect(await ada.isSelectable()).toBe(true);
    await ada.select();

    expect(await ada.isSelected()).toBe(true);
    // `rowKey="id"` is what makes the selection survive a refetch, so the key is
    // what the model holds — not the row object.
    expect(fixture.componentInstance.selection()).toEqual([1]);
    expect(await table.isAllSelected()).toBe(false);
    expect(await table.isPartiallySelected()).toBe(true);
  });

  it('leaves a selected row alone rather than toggling it back', async () => {
    const [ada] = await table.getRows({ cellText: 'Ada' });

    await ada.select();
    await ada.select();
    expect(fixture.componentInstance.selection()).toEqual([1]);

    await ada.deselect();
    await ada.deselect();
    expect(fixture.componentInstance.selection()).toEqual([]);
    expect(await ada.isSelected()).toBe(false);
  });

  it('flips one row with the raw toggle', async () => {
    const [, linus] = await table.getRows();

    await linus.toggleSelection();
    expect(fixture.componentInstance.selection()).toEqual([2]);

    await linus.toggleSelection();
    expect(fixture.componentInstance.selection()).toEqual([]);
  });

  it('select-all takes every row on screen, and gives them back', async () => {
    expect(await table.hasSelectAll()).toBe(true);

    await table.toggleSelectAll();
    expect(fixture.componentInstance.selection()).toEqual([1, 2, 3]);
    expect(await table.isAllSelected()).toBe(true);
    expect(await table.isPartiallySelected()).toBe(false);

    await table.toggleSelectAll();
    expect(fixture.componentInstance.selection()).toEqual([]);
  });

  it('narrows rows by selected state', async () => {
    const [, linus] = await table.getRows();
    await linus.select();

    const selected = await table.getRows({ selected: true });
    const rest = await table.getRows({ selected: false });

    expect(await Promise.all(selected.map(async row => (await row.getCellTexts())[0]))).toEqual(['Linus']);
    expect(await Promise.all(rest.map(async row => (await row.getCellTexts())[0]))).toEqual(['Ada', 'Grace']);
  });

  it('refuses a select-all that single mode does not have', async () => {
    fixture.componentInstance.rowSelection.set('single');
    fixture.detectChanges();

    expect(await table.hasSelectAll()).toBe(false);
    // Silence here would leave a spec asserting an unchanged selection and passing.
    await expect(table.toggleSelectAll()).rejects.toThrow(/no select-all box/);
    await expect(table.isAllSelected()).rejects.toThrow(/no select-all box/);

    const [ada] = await table.getRows({ cellText: 'Ada' });
    await ada.select();
    expect(fixture.componentInstance.selection()).toEqual([1]);
  });

  it('refuses to tick a row in a table that has no selection column', async () => {
    fixture.componentInstance.rowSelection.set(null);
    fixture.detectChanges();

    const [ada] = await table.getRows({ cellText: 'Ada' });

    expect(await ada.isSelectable()).toBe(false);
    expect(await ada.isSelected()).toBe(false);
    await expect(ada.toggleSelection()).rejects.toThrow(/rowSelection/);
  });
});

describe('WrTableHarness — detail rows', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ExpandHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let table: WrTableHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(ExpandHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
    table = await loader.getHarness(WrTableHarness);
  });

  afterEach(() => fixture.destroy());

  it('opens a row and finds the detail beside it, not inside it', async () => {
    const [ada] = await table.getRows({ cellText: 'Ada' });

    expect(await ada.isExpandable()).toBe(true);
    expect(await ada.isExpanded()).toBe(false);

    await ada.toggleExpand();

    expect(await ada.isExpanded()).toBe(true);
    expect(fixture.componentInstance.expanded()).toEqual([1]);
    expect(await table.getDetailTexts()).toEqual(['Bio of Ada']);
    // The detail is a full-width `<tr>` NEXT TO the row: it is neither a fourth
    // row nor a fourth cell of Ada's row.
    expect(await table.getRows()).toHaveLength(3);
    expect(await ada.getCellTexts()).toHaveLength(3);

    await ada.toggleExpand();
    expect(await table.getDetailTexts()).toEqual([]);
  });

  it('narrows rows by open state', async () => {
    const [, linus] = await table.getRows();
    await linus.toggleExpand();

    const open = await table.getRows({ expanded: true });

    expect(await Promise.all(open.map(async row => (await row.getCellTexts())[0]))).toEqual(['Linus']);
  });

  it("reaches the consumer's own component inside one cell of one row", async () => {
    const rows = await table.getRows();
    const [role] = await rows[0].getCells({ columnTitle: 'Role' });

    // The point of a content container: the button resolves inside THIS cell of
    // THIS row. A bare document query would answer with whichever row came first,
    // and every row here has an `Edit …` button.
    const edit = await role.getHarness(WrButtonHarness);
    expect(await edit.getText()).toBe('Edit admin');
    expect(await edit.getColor()).toBe('primary');

    expect(await (await rows[1].getHarness(WrButtonHarness)).getText()).toBe('Edit user');
    expect(await (await rows[2].getHarness(WrButtonHarness)).getText()).toBe('Edit admin');
  });

  it('reads a templated cell as the text it renders', async () => {
    const [ada] = await table.getRows({ cellText: 'Ada' });

    // A `[wrTableCell]` template replaces the raw value, and the indentation
    // around it must not reach the assertion.
    expect(await ada.getCellTexts()).toEqual(['Ada', 'Edit admin', '10']);
  });

  it('keeps the expand header out of the column list', async () => {
    // The lead expand `<th>` is empty — it carries the disclosure column, not a
    // column of data — so counting it would leave the header list one wider than
    // every row, and there would be no `.wr-table__title` in it to read.
    expect(await table.getHeaderTexts()).toEqual(['Name', 'Role', 'Score']);
    expect(await table.getHeaderTexts()).toHaveLength((await table.getCellTexts())[0].length);
  });
});

@Component({
  imports: [WrTable],
  template: `<wr-table [columns]="columns" [items]="items" />`,
})
class MultilineHost {
  readonly columns: WrTableColumns = { name: { title: 'Name' }, note: { title: 'Note' } };
  readonly items = [{ name: 'Ada  Lovelace', note: '  first\n\n  programmer  ' }];
}

describe('WrTableHarness — cell text', () => {
  it('reads a value with runs of whitespace in it as one line', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(MultilineHost);
    fixture.detectChanges();

    const table = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrTableHarness);

    // The template's own indentation never reaches `textContent` (Angular's
    // default `preserveWhitespaces: false` drops it at compile time), but the
    // whitespace inside a VALUE does, and `TestElement.text()` only trims the
    // ends. A spec asserts the one line a user reads.
    expect(await table.getCellTexts()).toEqual([['Ada Lovelace', 'first programmer']]);
    expect(await table.getEmptyText()).toBeNull();

    fixture.destroy();
  });
});

describe('WrTableHarness — tree rows', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TreeHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let table: WrTableHarness;

  const firstColumn = async (): Promise<string[]> => (await table.getCellTexts()).map(cells => cells[0]);

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(TreeHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
    table = await loader.getHarness(WrTableHarness);
  });

  afterEach(() => fixture.destroy());

  it('announces a treegrid, because the rows are a hierarchy', async () => {
    // The role is the only place the structure lives for a screen-reader user —
    // the indent is decoration.
    expect(await table.getRole()).toBe('treegrid');
    expect(await table.isTree()).toBe(true);
  });

  it('describes where each row sits in the hierarchy', async () => {
    const [src, readme] = await table.getRows();

    expect(await src.getLevel()).toBe(1);
    expect(await src.getPosInSet()).toBe(1);
    expect(await src.getSetSize()).toBe(2);
    expect(await readme.getPosInSet()).toBe(2);
    // Only a windowed table publishes a row index.
    expect(await src.getRowIndex()).toBeNull();
  });

  it('opens one level at a time', async () => {
    expect(await firstColumn()).toEqual(['src', 'README.md']);

    const [src] = await table.getRows();
    await src.toggleExpand();

    // The grandchild stays away: opening `src` reveals its children, not its
    // whole subtree.
    expect(await firstColumn()).toEqual(['src', 'app', 'styles.css', 'README.md']);
    expect(await src.isExpanded()).toBe(true);
    expect(fixture.componentInstance.expanded()).toEqual(['src']);
  });

  it('narrows rows by level', async () => {
    const [src] = await table.getRows();
    await src.toggleExpand();

    const children = await table.getRows({ level: 2 });

    expect(await Promise.all(children.map(async row => (await row.getCellTexts())[0]))).toEqual(['app', 'styles.css']);
    // A flat table's rows announce no level, so no level ever matches there.
    expect(await table.getRows({ level: 9 })).toEqual([]);
  });

  it('calls a leaf a leaf, rather than a closed branch', async () => {
    const [, readme] = await table.getRows();

    // The trap: a leaf renders a `<span>` carrying the same
    // `.wr-table__tree-toggle` class, purely to hold the indent. Taking that for
    // a control would report every leaf as expandable and every click as a no-op.
    expect(await readme.isExpandable()).toBe(false);
    expect(await readme.isExpanded()).toBe(false);
    await expect(readme.toggleExpand()).rejects.toThrow(/leaf/);
  });
});

describe('WrTableHarness — group bands', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<GroupHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let table: WrTableHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(GroupHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
    table = await loader.getHarness(WrTableHarness);
  });

  afterEach(() => fixture.destroy());

  it('keeps the bands out of the row list', async () => {
    const rows = await table.getRows();

    expect(await table.getGroupLabels()).toEqual(['admin', 'user']);
    expect(rows).toHaveLength(3);
    // Five `<tr>`s in the body, three of them rows. A harness that queried
    // `tbody tr` would report two extra rows with no cells at all.
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')).toHaveLength(5);
  });

  it('collapses a band and takes its rows off screen', async () => {
    expect(await table.isGroupCollapsed('admin')).toBe(false);

    await table.toggleGroup('admin');

    expect(await table.isGroupCollapsed('admin')).toBe(true);
    expect(fixture.componentInstance.collapsed()).toEqual(['admin']);
    expect(await table.getCellTexts()).toEqual([['Linus', 'user', '20']]);

    await table.toggleGroup('admin');
    expect(await table.getRows()).toHaveLength(3);
  });

  it('collapses the band it was asked for, not the first one', async () => {
    // The label list and the toggle list are paired by index, so a band other than
    // the first is the only case that proves the pairing: a harness that always
    // clicked the first toggle would pass every assertion about `admin`.
    await table.toggleGroup('user');

    expect(await table.isGroupCollapsed('user')).toBe(true);
    expect(await table.isGroupCollapsed('admin')).toBe(false);
    expect(fixture.componentInstance.collapsed()).toEqual(['user']);
    expect(await table.getCellTexts()).toEqual([
      ['Ada', 'admin', '10'],
      ['Grace', 'admin', '30'],
    ]);
  });

  it('keeps the per-group subtotals out of the summary footer', async () => {
    fixture.componentInstance.groupSummary.set(true);
    fixture.detectChanges();

    // A subtotal row carries `.wr-table__foot-cell` too, in the BODY under its
    // band. Only `<tfoot>` is the summary footer — sweeping the body in would
    // answer with three rows' worth of cells in one flat list.
    expect(await table.getFooterTexts()).toEqual(['', '', '60']);
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll('tbody .wr-table__foot-cell').length
    ).toBeGreaterThan(0);
  });

  it('says which bands exist when asked for one that does not', async () => {
    await expect(table.toggleGroup('manager')).rejects.toThrow(/no group band labelled "manager"/);
  });
});

describe('WrTableHarness — virtual scrolling', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<VirtualHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let table: WrTableHarness;

  const spacerCount = (): number =>
    (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr.wr-table__spacer').length;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(VirtualHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
    table = await loader.getHarness(WrTableHarness);
  });

  afterEach(() => fixture.destroy());

  it('returns the window and says how big the dataset is', async () => {
    expect(await table.isVirtual()).toBe(true);

    const rows = await table.getRows();

    // The honest answer, and the documented one: only the window is in the DOM,
    // so `getRows()` cannot mean "all 100 rows". `aria-rowcount` is where the
    // total lives (header included), and `getRowIndex()` places each row in it.
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(100);
    expect(await table.getAriaRowCount()).toBe(101);
    expect(await rows[0].getRowIndex()).toBe(2);
    expect(await rows[rows.length - 1].getRowIndex()).toBe(rows.length + 1);
    expect(await rows[0].getCellTexts()).toEqual(['Row 1', 'admin']);
  });

  it('leaves the spacer rows out of the row list', async () => {
    const rows = await table.getRows();
    const bodyRows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr').length;

    // The pads are `<tr aria-hidden>`s holding one tall `<td>`. Counting them
    // would inflate every row assertion by up to two and hand back a "row" whose
    // cell list is empty.
    expect(spacerCount()).toBeGreaterThan(0);
    expect(rows).toHaveLength(bodyRows - spacerCount());
  });

  it('sweeps the whole dataset into a select-all, not just the window', async () => {
    fixture.componentInstance.rowSelection.set('multiple');
    fixture.detectChanges();

    const rows = await table.getRows();
    await table.toggleSelectAll();

    // The window is a slice taken AFTER the render list is built, and the header
    // box reads the whole list — so the off-window rows are selected too. A
    // harness doc claiming otherwise would send a consumer looking for a bug in
    // their own code.
    expect(rows.length).toBeLessThan(100);
    expect(fixture.componentInstance.selection()).toHaveLength(100);
    expect(await table.isAllSelected()).toBe(true);
  });

  it('reports the fallback rather than a windowing that is not happening', async () => {
    // `virtualScroll` is a request: the table drops it whenever the layout stops
    // being uniform, and grouping is one of those. A harness that read the input
    // instead of the modifier would claim a window that does not exist.
    fixture.componentInstance.groupBy.set('role');
    fixture.detectChanges();

    expect(await table.isVirtual()).toBe(false);
    expect(await table.getAriaRowCount()).toBeNull();
    expect(spacerCount()).toBe(0);
    expect(await table.getRows()).toHaveLength(100);
  });
});

describe('WrTableHarness — two tables on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(TwoHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('narrows to the table with a given column', async () => {
    const files = await loader.getHarness(WrTableHarness.with({ columnTitle: 'Path' }));
    const people = await loader.getHarness(WrTableHarness.with({ columnTitle: /^Nam/ }));

    expect(await files.isTree()).toBe(true);
    expect(await people.isTree()).toBe(false);
  });

  it('narrows to the hierarchy among several tables', async () => {
    const tree = await loader.getHarness(WrTableHarness.with({ tree: true }));
    const flat = await loader.getHarness(WrTableHarness.with({ tree: false }));

    expect(await tree.getHeaderTexts()).toEqual(['Path']);
    expect(await flat.getHeaderTexts()).toEqual(['Name']);
  });

  it('reads only its own rows', async () => {
    const [people, files] = await loader.getAllHarnesses(WrTableHarness);

    // Two tables in one fixture is the case where a query scoped to the document
    // instead of to the host answers with the wrong table's rows.
    expect(await people.getCellTexts()).toEqual([['Ada'], ['Linus'], ['Grace']]);
    expect(await files.getCellTexts()).toEqual([['src'], ['README.md']]);
  });
});
