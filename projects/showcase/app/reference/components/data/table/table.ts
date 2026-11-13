import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrTag } from 'ngwr/badge';
import { WrButton } from 'ngwr/button';
import { WrCopyValue } from 'ngwr/copy-value';
import { WrInputNumber } from 'ngwr/input-number';
import { WrOption, WrSelect } from 'ngwr/select';
import {
  WrTableCell,
  WrTableEditCell,
  WrTableExpand,
  WrTableGroupHeader,
  WrTableSelectionBar,
  WrTable,
  type WrTableCellEdit,
  type WrTableColumns,
  type WrTableEditable,
  type WrTableFilterChange,
  type WrTableLoadingMode,
  type WrTableSortState,
  type WrTableState,
  wrSortRows,
} from 'ngwr/table';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';
import { API } from '#core/generated/api';

interface Row extends Record<string, unknown> {
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

interface Invoice {
  id: number;
  customer: string;
  amount: number | null;
  currency: string;
  due: string | null;
  paid: boolean;
}

const INVOICES: readonly Invoice[] = [
  { id: 1, customer: 'Roman', amount: 1200, currency: 'EUR', due: '2026-11-30', paid: true },
  { id: 2, customer: 'Alice', amount: null, currency: 'USD', due: null, paid: false },
  { id: 3, customer: 'Bob', amount: 0, currency: 'EUR', due: '', paid: false },
  { id: 4, customer: 'Cara', amount: 86.5, currency: 'GBP', due: '2026-12-15', paid: false },
];

interface Price {
  id: number;
  product: string;
  price: number;
  status: 'active' | 'draft' | 'archived';
}

const PRICES: readonly Price[] = [
  { id: 1, product: 'Espresso', price: 2.5, status: 'active' },
  { id: 2, product: 'Flat white', price: 3.5, status: 'active' },
  { id: 3, product: 'Cold brew', price: 4, status: 'draft' },
  { id: 4, product: 'Pumpkin latte', price: 4.5, status: 'archived' },
];

const RAW_ROWS: readonly Row[] = [
  { name: 'Roman', email: 'rk@garuna.dev', role: 'admin' },
  { name: 'Alice', email: 'alice@example.com', role: 'editor' },
  { name: 'Bob', email: 'bob@example.com', role: 'viewer' },
  { name: 'Cara', email: 'cara@example.com', role: 'editor' },
  { name: 'Diego', email: 'diego@example.com', role: 'viewer' },
];

// Large dataset for the virtual-scroll demo — 10k rows the DOM never fully holds.
const VIRTUAL_ROWS: readonly Record<string, unknown>[] = Array.from({ length: 10_000 }, (_, i) => ({
  id: i + 1,
  name: `User ${String(i + 1).padStart(5, '0')}`,
  email: `user${i + 1}@example.com`,
  role: i % 7 === 0 ? 'admin' : i % 3 === 0 ? 'editor' : 'viewer',
}));

// Wider dataset for the paginated demo so >1 page is actually visible.
const PAGINATED_ROWS: readonly Row[] = Array.from({ length: 23 }, (_, i) => ({
  name: `User ${String(i + 1).padStart(2, '0')}`,
  email: `user${i + 1}@example.com`,
  role: i % 7 === 0 ? 'admin' : i % 3 === 0 ? 'editor' : 'viewer',
}));

// Many-column dataset for the pinned-columns demo (needs to overflow its box).
const WIDE_ROWS: readonly Record<string, unknown>[] = [
  {
    name: 'Roman',
    email: 'rk@garuna.dev',
    role: 'admin',
    department: 'Engineering',
    location: 'Almaty',
    joined: '2021-03-12',
    status: 'Active',
  },
  {
    name: 'Alice',
    email: 'alice@example.com',
    role: 'editor',
    department: 'Design',
    location: 'Berlin',
    joined: '2022-07-01',
    status: 'Active',
  },
  {
    name: 'Bob',
    email: 'bob@example.com',
    role: 'viewer',
    department: 'Support',
    location: 'Toronto',
    joined: '2023-01-19',
    status: 'Invited',
  },
  {
    name: 'Cara',
    email: 'cara@example.com',
    role: 'editor',
    department: 'Marketing',
    location: 'São Paulo',
    joined: '2020-11-05',
    status: 'Active',
  },
  {
    name: 'Diego',
    email: 'diego@example.com',
    role: 'viewer',
    department: 'Sales',
    location: 'Madrid',
    joined: '2024-02-28',
    status: 'Suspended',
  },
];

@Component({
  selector: 'ngwr-table-page',
  templateUrl: './table.html',
  imports: [
    RouterLink,
    WrTable,
    WrTableCell,
    WrTableEditCell,
    WrTableExpand,
    WrTableGroupHeader,
    WrTableSelectionBar,
    WrInputNumber,
    WrSelect,
    WrOption,
    WrTag,
    WrButton,
    WrCopyValue,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class TablePageComponent {
  protected readonly columns: WrTableColumns = {
    name: { title: 'Name', sortable: true },
    email: { title: 'Email' },
    role: {
      title: 'Role',
      filterItems: [
        { title: 'Admin', value: 'admin' },
        { title: 'Editor', value: 'editor' },
        { title: 'Viewer', value: 'viewer' },
      ],
    },
  };

  protected readonly sort = signal<readonly WrTableSortState[]>([]);
  protected readonly roleFilter = signal<readonly string[]>([]);

  protected readonly invoices = INVOICES;
  protected readonly invoiceColumns: WrTableColumns<Invoice> = {
    customer: { title: 'Customer' },
    amount: {
      title: 'Amount',
      align: 'end',
      empty: '-',
      format: (value, row) => `${row.currency} ${Number(value).toFixed(2)}`,
    },
    due: { title: 'Due', align: 'center', empty: 'open' },
    paid: { title: 'Paid', format: value => (value ? 'yes' : 'no') },
  };

  protected readonly visibleRows = computed<readonly Record<string, unknown>[]>(() => {
    const roles = this.roleFilter();
    return wrSortRows(roles.length === 0 ? [...RAW_ROWS] : RAW_ROWS.filter(r => roles.includes(r.role)), this.sort());
  });

  // One column with both a sort and a filter.
  protected readonly bothColumns: WrTableColumns = {
    name: { title: 'Name', sortable: true },
    email: { title: 'Email' },
    role: {
      title: 'Role',
      sortable: true,
      filterItems: [
        { title: 'Admin', value: 'admin' },
        { title: 'Editor', value: 'editor' },
        { title: 'Viewer', value: 'viewer' },
      ],
    },
  };

  protected readonly bothSort = signal<readonly WrTableSortState[]>([]);
  protected readonly bothRoleFilter = signal<readonly string[]>([]);

  protected readonly bothRows = computed<readonly Record<string, unknown>[]>(() =>
    wrSortRows(
      this.bothRoleFilter().length === 0 ? [...RAW_ROWS] : RAW_ROWS.filter(r => this.bothRoleFilter().includes(r.role)),
      this.bothSort()
    )
  );

  protected onBothFilter(change: WrTableFilterChange): void {
    if (change.key === 'role') {
      this.bothRoleFilter.set(change.items.map(i => i.value as string));
    }
  }

  protected readonly paginatedRows = PAGINATED_ROWS;
  protected readonly page = signal(1);
  protected readonly pageSize = signal(5);
  protected readonly stickyPage = signal(1);

  // Row-actions demo. A column key with no data behind it (`actions`) plus a
  // cell template that reads `let-row="item"` — the pair a "Delete" button needs.
  protected readonly actionRows = signal<readonly Record<string, unknown>[]>([...RAW_ROWS]);
  protected readonly actionColumns: WrTableColumns = {
    name: { title: 'Name' },
    email: { title: 'Email' },
    actions: { title: '', width: 96 },
  };

  protected removeRow(row: Record<string, unknown>): void {
    this.actionRows.update(rows => rows.filter(r => r !== row));
  }

  protected restoreRows(): void {
    this.actionRows.set([...RAW_ROWS]);
  }

  protected readonly loadModes: readonly WrTableLoadingMode[] = ['auto', 'overlay', 'bar'];
  protected readonly loadMode = signal<WrTableLoadingMode>('auto');
  protected readonly loadRows = signal<readonly Row[]>(RAW_ROWS);
  protected readonly refreshing = signal(false);

  protected refresh(): void {
    this.refreshing.set(true);
    setTimeout(() => this.refreshing.set(false), 2000);
  }

  protected toggleLoadRows(): void {
    this.loadRows.update(rows => (rows.length ? [] : RAW_ROWS));
  }

  protected readonly rows = RAW_ROWS;
  protected readonly opened = signal<string | null>(null);
  protected readonly clickColumns: WrTableColumns<Row> = {
    name: { title: 'Name' },
    email: { title: 'Email' },
    role: { title: 'Role' },
    open: { title: '', width: 96 },
  };

  protected readonly hintRows: readonly Record<string, unknown>[] = [
    { name: 'Roman', note: 'Owns the release train and signs off every publish to npm', seats: 12, alarm: '!' },
    { name: 'Alice', note: 'Design', seats: 3, alarm: '' },
    { name: 'Bob', note: 'Answers the support queue on weekdays, escalates billing to finance', seats: 5, alarm: '!' },
  ];
  protected readonly hintColumns: WrTableColumns = {
    name: { title: 'Name', sortable: true, width: 140 },
    note: { title: 'Note', width: 220, truncate: 'tooltip' },
    seats: { title: 'Seats', align: 'end', sortable: true, headerHint: 'Paid seats on the current plan' },
    alarm: { title: '', width: 56, sortable: true, headerHint: 'Needs attention' },
  };

  protected readonly wideRows = WIDE_ROWS;
  protected readonly wideColumns: WrTableColumns = {
    name: { title: 'Name', pin: 'left', sortable: true },
    email: { title: 'Email' },
    role: { title: 'Role' },
    department: { title: 'Department' },
    location: { title: 'Location' },
    joined: { title: 'Joined', sortable: true },
    status: { title: 'Status', pin: 'right' },
  };

  protected readonly resizableColumns: WrTableColumns = {
    name: { title: 'Name', resizable: true, sortable: true },
    email: { title: 'Email', resizable: true, width: 240 },
    role: { title: 'Role', resizable: true },
  };

  protected readonly selected = signal<readonly unknown[]>([]);
  protected readonly selectedAcross = signal<readonly unknown[]>([]);
  protected readonly expanded = signal<readonly unknown[]>([]);

  protected readonly summaryRows: readonly Record<string, unknown>[] = [
    { product: 'Widget', price: 19.99, qty: 3 },
    { product: 'Gadget', price: 49.5, qty: 1 },
    { product: 'Gizmo', price: 8.75, qty: 12 },
    { product: 'Doohickey', price: 120, qty: 2 },
  ];
  protected readonly summaryColumns: WrTableColumns = {
    product: { title: 'Product', summary: () => 'Total' },
    price: { title: 'Price', summary: 'avg' },
    qty: { title: 'Qty', summary: 'sum' },
  };

  protected readonly decimalRows: readonly Record<string, unknown>[] = [
    { item: 'Widget', asNumber: 0.1, asString: '0.1' },
    { item: 'Gadget', asNumber: 0.2, asString: '0.2' },
    { item: 'Gizmo', asNumber: 0.3, asString: '0.3' },
  ];
  protected readonly decimalColumns: WrTableColumns = {
    item: { title: 'Item', summary: () => 'Sum' },
    asNumber: { title: 'As a number', align: 'end', summary: 'sum' },
    asString: { title: 'As a string', align: 'end', summary: 'sum' },
  };

  protected readonly groupCollapsed = signal<readonly unknown[]>([]);

  protected readonly salesRows: readonly Record<string, unknown>[] = [
    { region: 'EMEA', rep: 'Alice', deals: 12, revenue: 48200 },
    { region: 'EMEA', rep: 'Bob', deals: 7, revenue: 21500 },
    { region: 'AMER', rep: 'Cara', deals: 15, revenue: 61000 },
    { region: 'AMER', rep: 'Diego', deals: 9, revenue: 33750 },
    { region: 'APAC', rep: 'Emi', deals: 11, revenue: 40100 },
  ];
  protected readonly salesColumns: WrTableColumns = {
    // One function feeds the group rows and the grand total; the context says which.
    region: { title: 'Region', summary: (_rows, { scope }) => (scope === 'group' ? 'Subtotal' : 'Total') },
    rep: { title: 'Rep' },
    deals: { title: 'Deals', summary: 'sum' },
    revenue: { title: 'Revenue', summary: 'sum' },
  };

  protected readonly virtualRows = VIRTUAL_ROWS;
  protected readonly virtualColumns: WrTableColumns = {
    id: { title: 'ID', width: 96 },
    name: { title: 'Name', width: 220 },
    email: { title: 'Email', width: 280 },
    role: { title: 'Role', width: 160 },
  };

  protected readonly hiddenColumns = signal<readonly string[]>(['joined']);
  protected readonly chooserColumns: WrTableColumns = {
    name: { title: 'Name', hideable: false },
    email: { title: 'Email' },
    department: { title: 'Department' },
    location: { title: 'Location' },
    joined: { title: 'Joined' },
  };

  protected readonly bulkSelected = signal<readonly unknown[]>([]);
  protected readonly bulkRows = signal<readonly Row[]>(RAW_ROWS);
  protected readonly bulkColumns: WrTableColumns<Row> = {
    name: { title: 'Name' },
    email: { title: 'Email' },
    role: { title: 'Role' },
  };

  protected removeRows(rows: readonly Row[], clear: () => void): void {
    this.bulkRows.update(all => all.filter(row => !rows.includes(row)));
    clear();
  }

  protected resetBulkRows(): void {
    this.bulkRows.set(RAW_ROWS);
  }

  protected readonly prices = signal<readonly Price[]>(PRICES);
  protected readonly priceColumns: WrTableColumns<Price> = {
    product: { title: 'Product' },
    price: { title: 'Price', align: 'end', format: value => Number(value).toFixed(2) },
    status: { title: 'Status' },
  };
  protected readonly priceEditable: WrTableEditable<Price> = (row, key) => key !== 'price' || row.status !== 'archived';

  protected savePrice({ row, key, value }: WrTableCellEdit<Price>): void {
    if (key === 'price' && typeof value !== 'number') return;
    this.prices.update(all => all.map(item => (item === row ? { ...item, [key]: value } : item)));
  }

  protected readonly viewState = signal<WrTableState | null>(null);
  protected readonly savedView = signal<WrTableState | null>(null);
  protected readonly viewColumns: WrTableColumns<Row> = {
    name: { title: 'Name', sortable: true },
    email: { title: 'Email' },
    role: {
      title: 'Role',
      sortable: true,
      filterItems: [
        { title: 'Admin', value: 'admin' },
        { title: 'Editor', value: 'editor' },
        { title: 'Viewer', value: 'viewer' },
      ],
    },
  };
  // The table sorts and filters nothing: the host reads both off the state.
  protected readonly viewRows = computed<readonly Row[]>(() => {
    const state = this.viewState();
    const roles = state?.filters['role'] ?? [];
    const rows = roles.length === 0 ? PAGINATED_ROWS : PAGINATED_ROWS.filter(row => roles.includes(row.role));
    return wrSortRows(rows, state?.sort ?? []);
  });
  protected readonly viewStateText = computed(() => JSON.stringify(this.viewState(), null, 2));

  protected saveView(): void {
    this.savedView.set(this.viewState());
  }

  protected restoreView(): void {
    const saved = this.savedView();
    if (saved) this.viewState.set({ ...saved });
  }

  protected readonly snippets = {
    basic: `<wr-table [columns]="columns" [items]="rows" />`,
    custom: `<wr-table [columns]="columns" [items]="rows" [(sort)]="sort" (filterChange)="onFilter($event)">
  <ng-template wrTableCell="role" let-value>
    <wr-tag [color]="value === 'admin' ? 'danger' : 'info'">{{ value }}</wr-tag>
  </ng-template>
</wr-table>`,
    sortAndFilter: `const columns: WrTableColumns = {
  name: { title: 'Name', sortable: true },
  email: { title: 'Email' },
  role: {
    title: 'Role',
    sortable: true,
    filterItems: [
      { title: 'Admin', value: 'admin' },
      { title: 'Editor', value: 'editor' },
      { title: 'Viewer', value: 'viewer' },
    ],
  },
};

<wr-table [columns]="columns" [items]="rows()" [(sort)]="sort" (filterChange)="onFilter($event)" />`,
    cellContext: `<ng-template wrTableCell="role" let-value let-row="item" let-col="column">
  {{ col.title }}: {{ value }} — {{ row.email }}
</ng-template>`,
    columnKeys: `const columns: WrTableColumns<Invoice> = {
  customer: { title: 'Customer' },
  amount: {
    title: 'Amount',
    align: 'end',
    empty: '-',
    format: (value, row) => \`\${row.currency} \${Number(value).toFixed(2)}\`,
  },
  due: { title: 'Due', align: 'center', empty: 'open' },
  paid: { title: 'Paid', format: value => (value ? 'yes' : 'no') },
};

<wr-table [columns]="columns" [items]="invoices" />`,
    typedRows: `interface Invoice {
  customer: string;
  amount: number | null;
  currency: string;
}

const columns: WrTableColumns<Invoice> = {
  customer: { title: 'Customer' },
  amount: { title: 'Amount', align: 'end', format: (value, row) => \`\${row.currency} \${value}\` },
};

<wr-table [columns]="columns" [items]="invoices">
  <ng-template wrTableCell="amount" [wrTableCellOf]="invoices" let-value let-row="item">
    {{ row.customer }} owes {{ value ?? 'nothing' }}
  </ng-template>
</wr-table>`,
    rowActions: `const columns: WrTableColumns = {
  name: { title: 'Name' },
  email: { title: 'Email' },
  actions: { title: '', width: 96 },
};

<wr-table [columns]="columns" [items]="rows">
  <ng-template wrTableCell="actions" let-row="item">
    <wr-btn size="sm" color="danger" outlined (click)="remove(row)">Delete</wr-btn>
  </ng-template>
</wr-table>`,
    states: `<wr-table [columns]="columns" [items]="rows()" [loading]="loading()" emptyLabel="No users yet" />

<!-- An error goes beside the table. -->
@if (error(); as message) {
  <wr-alert type="danger" title="Could not load users" [message]="message" />
}
<wr-table [columns]="columns" [items]="rows()" [loading]="loading()" />`,
    rowClick: `<wr-table [columns]="columns" [items]="rows" (rowClick)="open($event.row)">
  <!-- The copy button is a button: it copies, and the row does not open. -->
  <ng-template wrTableCell="email" let-value>
    <wr-copy-value [value]="value" />
  </ng-template>
  <!-- The same action for the keyboard. -->
  <ng-template wrTableCell="open" let-row="item">
    <wr-btn size="sm" outlined (click)="open(row)">Open</wr-btn>
  </ng-template>
</wr-table>

<!-- An element of your own that handles its clicks. -->
<app-status-menu wrTableIgnoreRowClick [status]="value" />`,
    hints: `protected readonly columns: WrTableColumns = {
  name: { title: 'Name', sortable: true, width: 140 },
  // One line, an ellipsis, and the full text in a tooltip while it is cut.
  note: { title: 'Note', width: 220, truncate: 'tooltip' },
  // The sort button reads "Sort Seats, Paid seats on the current plan".
  seats: { title: 'Seats', align: 'end', sortable: true, headerHint: 'Paid seats on the current plan' },
  // No title: the hint names the column and its sort button.
  alarm: { title: '', width: 56, sortable: true, headerHint: 'Needs attention' },
};`,
    loadingModes: `<!-- 'auto': a spinner over an empty table, a bar over a filled one. -->
<wr-table [columns]="columns" [items]="rows()" [loading]="refreshing()" />

<!-- Always the bar, or always the overlay. -->
<wr-table [columns]="columns" [items]="rows()" [loading]="refreshing()" loadingMode="bar" />`,
    paginated: `<wr-table
  [columns]="columns"
  [items]="rows"
  [(pageSize)]="pageSize"
  [pageSizeOptions]="[5, 10, 20]"
  [(page)]="page"
/>`,
    sortState: `protected readonly sort = signal<readonly WrTableSortState[]>([]);

protected readonly rows = computed(() => wrSortRows(this.source(), this.sort()));

// A key that is not a field of the row goes through an accessor.
protected readonly byTotal = computed(() =>
  wrSortRows(this.source(), this.sort(), (row, key) => (key === 'total' ? row.price * row.qty : wrReadField(row, key)))
);

// Server-side, send it with the request instead.
effect(() => {
  const [primary] = this.sort();
  this.load({ sortBy: primary?.key, order: primary?.direction });
});`,
    serverHtml: `<wr-table
  [columns]="columns"
  [items]="pageRows()"
  [total]="total()"
  [pageSize]="20"
  [page]="page()"
  (pageChange)="onPage($event)"
  [(sort)]="sort"
/>`,
    serverTs: `protected onPage(page: number): void {
  this.page.set(page);
  this.load(); // limit: 20, skip: (page - 1) * 20
}`,
    pinned: `const columns: WrTableColumns = {
  name:   { title: 'Name', pin: 'left' },
  email:  { title: 'Email' },
  role:   { title: 'Role' },
  // …more columns in between…
  status: { title: 'Status', pin: 'right' },
};`,
    resizable: `const columns: WrTableColumns = {
  name:  { title: 'Name', resizable: true },
  email: { title: 'Email', resizable: true, width: 240 },
  role:  { title: 'Role', resizable: true },
};`,
    reorderable: `<wr-table reorderable [(columnOrder)]="order" [columns]="columns" [items]="rows" />`,
    hiddenColumns: `const columns: WrTableColumns = {
  name:   { title: 'Name', hideable: false },
  email:  { title: 'Email' },
  joined: { title: 'Joined' },
};
readonly hidden = signal<readonly string[]>(['joined']);

<wr-table columnChooser [(hiddenColumns)]="hidden" [columns]="columns" [items]="rows" />`,
    selectionBar: `<wr-table rowSelection="multiple" rowKey="email" [(selection)]="selected" [columns]="columns" [items]="rows()">
  <ng-template wrTableSelectionBar [wrTableSelectionBarOf]="rows()" let-rows let-clear="clear">
    <button wr-btn type="button" size="sm" color="danger" (click)="remove(rows, clear)">Delete</button>
  </ng-template>
</wr-table>`,
    inlineEdit: `readonly prices = signal<readonly Price[]>(PRICES);
readonly editable: WrTableEditable<Price> = (row, key) => key !== 'price' || row.status !== 'archived';

save({ row, key, value }: WrTableCellEdit<Price>): void {
  if (key === 'price' && typeof value !== 'number') return;
  this.prices.update(all => all.map(item => (item === row ? { ...item, [key]: value } : item)));
}

<wr-table rowKey="id" [columns]="columns" [items]="prices()" [editable]="editable" (cellEdit)="save($event)">
  <ng-template wrTableEditCell="price" let-value let-set="set">
    <wr-input-number ariaLabel="Price" [min]="0" [value]="value" (valueChange)="set($event)" />
  </ng-template>
  <ng-template wrTableEditCell="status" [wrTableEditCellOf]="prices()" let-value let-commit="commit">
    <wr-select ariaLabel="Status" [value]="value" (valueChange)="commit($event)">
      <wr-option value="active">active</wr-option>
      <wr-option value="draft">draft</wr-option>
      <wr-option value="archived">archived</wr-option>
    </wr-select>
  </ng-template>
</wr-table>`,
    savedView: `readonly state = signal<WrTableState | null>(null);
readonly saved = signal<WrTableState | null>(null);

save(): void {
  this.saved.set(this.state());
}

restore(): void {
  const saved = this.saved();
  if (saved) this.state.set({ ...saved });
}

<wr-table [columns]="columns" [items]="rows()" [pageSize]="5" [(state)]="state" />`,
    selection: `<wr-table
  rowSelection="multiple"
  rowKey="email"
  [(selection)]="selected"
  [columns]="columns"
  [items]="rows"
/>`,
    selectAllScope: `<wr-table
  rowSelection="multiple"
  selectAllScope="all"
  rowKey="email"
  [pageSize]="5"
  [(selection)]="selected"
  [columns]="columns"
  [items]="rows"
/>`,
    expandable: `<wr-table rowKey="email" [(expanded)]="expanded" [columns]="columns" [items]="rows">
  <ng-template wrTableExpand let-row>
    <p>{{ row.name }} — {{ row.email }}</p>
  </ng-template>
</wr-table>`,
    summary: `const columns: WrTableColumns = {
  product: { title: 'Product', summary: () => 'Total' },
  price:   { title: 'Price', summary: 'avg' },
  qty:     { title: 'Qty', summary: 'sum' },
};`,
    csv: `<wr-table #table [columns]="columns" [items]="rows" />

<wr-btn (click)="table.exportCsv({ filename: 'users.csv' })">Export CSV</wr-btn>`,
    grouping: `<wr-table
  groupBy="role"
  [(collapsedGroups)]="collapsed"
  [columns]="columns"
  [items]="rows"
/>`,
    decimalSummary: `const rows = [
  { item: 'Widget', asNumber: 0.1, asString: '0.1' },
  { item: 'Gadget', asNumber: 0.2, asString: '0.2' },
  { item: 'Gizmo', asNumber: 0.3, asString: '0.3' },
];

const columns: WrTableColumns = {
  item:     { title: 'Item', summary: () => 'Sum' },
  asNumber: { title: 'As a number', align: 'end', summary: 'sum' },
  asString: { title: 'As a string', align: 'end', summary: 'sum' },
};`,
    groupSummary: `const columns: WrTableColumns = {
  // One function feeds the group rows and the grand total; the context says which.
  region:  { title: 'Region', summary: (rows, { scope }) => (scope === 'group' ? 'Subtotal' : 'Total') },
  rep:     { title: 'Rep' },
  deals:   { title: 'Deals',   summary: 'sum' },
  revenue: { title: 'Revenue', summary: 'sum' },
};

<wr-table groupBy="region" groupSummary [columns]="columns" [items]="rows" />`,
    groupHeader: `<wr-table groupBy="role" [columns]="columns" [items]="rows">
  <ng-template wrTableGroupHeader let-value let-count="count">
    <wr-tag color="primary" transparent>{{ value }}</wr-tag>
    <small>{{ count }} users</small>
  </ng-template>
</wr-table>`,
    sticky: `<wr-table
  stickyHeader
  [viewportHeight]="320"
  [columns]="columns"
  [items]="rows"
  [pageSize]="10"
  [(page)]="page"
/>`,
    stickyFill: `<section style="display: flex; flex-direction: column; height: 100dvh">
  <header>…</header>
  <wr-table stickyHeader viewportHeight="fill" [columns]="columns" [items]="rows" [pageSize]="50" />
</section>`,
    virtual: `<wr-table
  virtualScroll
  [rowHeight]="41"
  [viewportHeight]="440"
  [columns]="columns"
  [items]="rows"
/>`,
    tree: `<wr-table
  rowKey="id"
  childrenKey="reports"
  treeColumn="name"
  rowSelection="multiple"
  [columns]="orgColumns"
  [items]="org"
  [(expanded)]="openRows"
  [(selection)]="picked"
/>`,
  };

  protected readonly api = API.WrTable;

  protected readonly templatesApi: readonly DocApiRow[] = [
    {
      name: '<ng-template wrTableExpand>',
      description: 'Detail template revealed when a row expands (let-row).',
      type: 'directive',
      default: '—',
    },
    {
      name: '<ng-template wrTableGroupHeader>',
      description: 'Custom band label template (let-value, let-count, let-toggle, …).',
      type: 'directive',
      default: '—',
    },
    {
      name: '[wrTableEditCell]',
      description:
        "A column's editor, by column key, which makes the column editable; import `WrTableEditCell`. Since v16.3.",
      type: 'directive',
      default: '—',
    },
    {
      name: '[wrTableEditCellOf]',
      description:
        'The rows, for the type checker only: types `let-value` and `let-row`. Bind the same array as `[items]`.',
      type: 'readonly T[] | null | undefined',
      sub: true,
    },
    {
      name: 'let-value',
      description: "The pending value: the cell's own at first, then what `set` last took.",
      type: 'T[K]',
      default: '—',
      sub: true,
    },
    {
      name: 'let-row="row"',
      description: 'The row being edited.',
      type: 'T',
      default: '—',
      sub: true,
    },
    {
      name: 'let-col="column"',
      description: 'The column definition.',
      type: 'WrTableColumn',
      default: '—',
      sub: true,
    },
    {
      name: 'let-set="set"',
      description: 'Keeps a value without ending the edit. Enter, Tab and a click outside commit it.',
      type: '(value: unknown) => void',
      default: '—',
      sub: true,
    },
    {
      name: 'let-commit="commit"',
      description: 'Ends the edit with a value: the table emits `cellEdit` and focus returns to the cell.',
      type: '(value: unknown) => void',
      default: '—',
      sub: true,
    },
    {
      name: 'let-cancel="cancel"',
      description: 'Drops the edit. Focus returns to the cell.',
      type: '() => void',
      default: '—',
      sub: true,
    },
    {
      name: '[wrTableSelectionBar]',
      description:
        'Actions of the bar drawn over the header while rows are selected; import `WrTableSelectionBar`. Since v16.3.',
      type: 'directive',
      default: '—',
    },
    {
      name: '[wrTableSelectionBarOf]',
      description: 'The rows, for the type checker only: types `let-rows`. Bind the same array as `[items]`.',
      type: 'readonly T[] | null | undefined',
      sub: true,
    },
    {
      name: 'let-rows',
      description: 'The selected rows the table holds, in `items` order.',
      type: 'readonly T[]',
      default: '—',
      sub: true,
    },
    {
      name: 'let-count="count"',
      description: 'How many keys `selection` holds.',
      type: 'number',
      default: '—',
      sub: true,
    },
    {
      name: 'let-clear="clear"',
      description: 'Empties the selection.',
      type: '() => void',
      default: '—',
      sub: true,
    },
    {
      name: 'let-scope="scope"',
      description: "The select-all scope in force: `selectAllScope`, or `'page'` in server mode.",
      type: "'page' | 'all'",
      default: '—',
      sub: true,
    },
    {
      name: '[wrTableIgnoreRowClick]',
      description:
        'A plain attribute, no import: a click on the element or in it does not fire `rowClick`. Since v16.1.',
      type: 'attribute',
      default: '—',
    },
    {
      name: '[wrTableCell]',
      description: 'Per-column cell template. The attribute value is the column key; import `WrTableCell`.',
      type: 'directive',
      default: '—',
    },
    {
      name: '[wrTableCellOf]',
      description:
        'The rows, for the type checker only: types `let-row` and `let-value`. Bind the same array as `[items]`.',
      type: 'readonly T[] | null | undefined',
      sub: true,
    },
    {
      name: 'let-value',
      description: 'The cell value, `item[columnKey]`. `T[K]` with `[wrTableCellOf]`, else `any`.',
      type: 'T[K]',
      default: '—',
      sub: true,
    },
    {
      name: 'let-row="item"',
      description: 'The whole row. A bare `let-row` binds the cell value instead.',
      type: 'T',
      default: '—',
      sub: true,
    },
    {
      name: 'let-col="column"',
      description: 'The column definition.',
      type: 'WrTableColumn',
      default: '—',
      sub: true,
    },
  ];

  protected readonly methodsApi: readonly DocApiRow[] = [
    {
      name: 'expandAllRows() / collapseAllRows()',
      description: 'Open or close every parent in a tree-mode forest. No-ops when `childrenKey` is unset.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'clearSelection()',
      description: 'Empty the selection, as the clear button of the selection bar does. Since v16.3.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'exportCsv(options?)',
      description: 'Download the rows as a CSV file (options: filename, selectedOnly, delimiter).',
      type: '(WrTableCsvOptions) => void',
      default: '—',
    },
    {
      name: 'toCsv(options?)',
      description: 'Return the table as a CSV string instead of downloading.',
      type: '(WrTableCsvOptions) => string',
      default: '—',
    },
    {
      name: 'collapseAllGroups() / expandAllGroups()',
      description: 'Collapse or expand every group on the current page.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'scrollToRow(index, behavior?)',
      description: 'Scroll a row index to the top of the virtual viewport.',
      type: '(number, ScrollBehavior) => void',
      default: '—',
    },
  ];

  protected readonly helpersApi: readonly DocApiRow[] = [
    {
      name: 'wrSortRows(rows, sort, accessor?)',
      description:
        'Rows sorted by the sort state: the first entry decides, later ones break ties, a null direction is skipped. Returns `rows` itself when nothing sorts, a copy otherwise. Stable.',
      type: '<T>(rows: readonly T[], sort: readonly WrTableSortState[], accessor?: WrTableSortAccessor<T>) => readonly T[]',
      default: '-',
    },
    {
      name: 'wrReadField(item, key)',
      description:
        "The default accessor. null, undefined, '' and an invalid Date read as ''; a number, a numeric string, a boolean (0 or 1) and a Date (its timestamp) read as a number; anything else as String(value).",
      type: '<T>(item: T, key: string) => string | number',
      default: '-',
    },
  ];

  protected readonly filterApi = API.WrTableFilter;

  protected readonly sortApi = API.WrTableSort;

  protected onFilter(change: WrTableFilterChange): void {
    if (change.key === 'role') {
      this.roleFilter.set(change.items.map(i => i.value as string));
    }
  }

  protected readonly typeSnippet = `type WrTableColumns<T = object> = Record<string, WrTableColumn<T>>;

interface WrTableColumn<T = object> {
  title: string;
  headerHint?: string;
  sortable?: boolean;
  filterItems?: readonly WrTableFilterItem[];
  pin?: 'left' | 'right';
  hideable?: boolean;
  editable?: boolean;
  resizable?: boolean;
  width?: number;
  summary?: WrTableSummary;
  align?: 'start' | 'center' | 'end';
  format?: (value: unknown, row: T) => string;
  empty?: string;
  truncate?: 'tooltip' | null;
  class?: WrClassInput;
}

interface WrTableFilterItem<T = unknown> {
  title: string;
  value: T;
  selected?: boolean;
}

interface WrTableSortState {
  key: string;
  direction: 'asc' | 'desc' | null;
}

type WrTableSortAccessor<T> = (item: T, key: string) => string | number;

interface WrTableCsvOptions {
  filename?: string;
  selectedOnly?: boolean;
  delimiter?: string;
  escapeFormulas?: boolean;
}

interface WrTableGroupContext {
  value: unknown;
  label: string;
  rows: readonly Record<string, unknown>[];
  count: number;
  collapsed: boolean;
  index: number;
  toggle: () => void;
}

interface WrTableSelectionContext<T = object> {
  $implicit: readonly T[];
  count: number;
  clear: () => void;
  scope: 'page' | 'all';
}

interface WrTableCellEdit<T = object> {
  row: T;
  key: string;
  value: unknown;
  previous: unknown;
}

type WrTableEditable<T = object> = (row: T, key: string) => boolean;

interface WrTableEditCellContext<T, K extends string> {
  $implicit: T[K];
  row: T;
  column: WrTableColumn<T>;
  set: (value: unknown) => void;
  commit: (value: unknown) => void;
  cancel: () => void;
}

interface WrTableState {
  sort: readonly WrTableSortState[];
  filters: Readonly<Record<string, readonly unknown[]>>;
  page: number;
  pageSize: number;
  columnOrder: readonly string[];
  hiddenColumns: readonly string[];
}

type WrTableSummary =
  | 'sum' | 'avg' | 'count' | 'min' | 'max'
  | ((rows: readonly Record<string, unknown>[], context: WrTableSummaryContext) => unknown);

type WrTableSummaryContext =
  | { scope: 'total'; group: null }
  | { scope: 'group'; group: WrTableGroupContext };`;

  protected readonly typeRows: readonly DocApiRow[] = [
    {
      name: 'WrTableColumns',
      description: 'Column map keyed by row property name. `T` is the row; name it to type `format`.',
      type: 'Record<string, WrTableColumn<T>>',
    },
    { name: 'WrTableColumn', description: 'A single column definition.', type: 'interface' },
    { name: 'title', description: 'Heading shown in the header.', type: 'string', required: true, sub: true },
    {
      name: 'headerHint',
      description:
        'Tooltip on the header, added to the names of the sort and filter controls. Names the column when `title` is empty. Since v16.1.',
      type: 'string',
      sub: true,
    },
    { name: 'sortable', description: 'Show a clickable sort indicator.', type: 'boolean', default: 'false', sub: true },
    {
      name: 'filterItems',
      description: 'Non-empty list shows a filter dropdown.',
      type: 'readonly WrTableFilterItem[]',
      sub: true,
    },
    {
      name: 'pin',
      description: "Freeze the column against the 'left' or 'right' edge while the rest scrolls.",
      type: "'left' | 'right'",
      sub: true,
    },
    {
      name: 'hideable',
      description: '`false` keeps the column out of reach of `hiddenColumns` and the column chooser. Since v16.3.',
      type: 'boolean',
      default: 'true',
      sub: true,
    },
    {
      name: 'editable',
      description: '`false` keeps the column read-only even with a `[wrTableEditCell]` template. Since v16.3.',
      type: 'boolean',
      default: 'true',
      sub: true,
    },
    {
      name: 'resizable',
      description: 'Add a drag handle on the header edge to resize.',
      type: 'boolean',
      default: 'false',
      sub: true,
    },
    { name: 'width', description: 'Initial column width in px (overridden by a drag).', type: 'number', sub: true },
    {
      name: 'summary',
      description:
        "Footer aggregate — 'sum' / 'avg' / 'count' / 'min' / 'max', or (rows, context) => value. Decimal strings are aggregated exactly.",
      type: 'WrTableSummary',
      sub: true,
    },
    {
      name: 'align',
      description: "Alignment of the header, body and summary cells. 'end' adds tabular digits.",
      type: "'start' | 'center' | 'end'",
      sub: true,
    },
    {
      name: 'format',
      description: 'Text of a plain cell. Not called for a missing value; a cell template wins. The CSV uses it.',
      type: '(value: unknown, row: T) => string',
      sub: true,
    },
    {
      name: 'empty',
      description: "Placeholder for null, undefined and ''. 0 and false are values. The CSV uses it.",
      type: 'string',
      sub: true,
    },
    {
      name: 'truncate',
      description:
        "'tooltip' cuts the cells to one line and shows a cut cell's full text in a tooltip. `null` turns the table's `truncate` off for the column. Since v16.1.",
      type: "'tooltip' | null",
      sub: true,
    },
    {
      name: 'class',
      description: "Extra classes on this column's header cell and every body cell under it. Not the summary row.",
      type: 'WrClassInput',
      sub: true,
    },
    { name: 'WrTableFilterItem', description: 'One entry in a column filter.', type: 'interface' },
    { name: 'title', description: 'Visible label.', type: 'string', required: true, sub: true },
    { name: 'value', description: 'Value matched against the cell.', type: 'T', required: true, sub: true },
    { name: 'selected', description: 'Pre-check the entry.', type: 'boolean', default: 'false', sub: true },
    {
      name: 'WrTableSortState',
      description: 'Emitted by (sortChange).',
      type: '{ key: string; direction: WrTableSortDirection }',
    },
    {
      name: 'WrTableSortAccessor',
      description: 'Third argument of wrSortRows(): the value a key sorts by.',
      type: '(item: T, key: string) => string | number',
    },
    { name: 'WrTableCsvOptions', description: 'Argument of exportCsv() / toCsv().', type: 'interface' },
    { name: 'filename', description: 'Download filename.', type: 'string', default: "'table.csv'", sub: true },
    {
      name: 'selectedOnly',
      description: 'Export only the selected rows (needs rowSelection).',
      type: 'boolean',
      default: 'false',
      sub: true,
    },
    {
      name: 'delimiter',
      description: "Field delimiter — use ';' where Excel expects it.",
      type: 'string',
      default: "','",
      sub: true,
    },
    {
      name: 'escapeFormulas',
      description: 'Prefix values starting with = + - @ so spreadsheets keep them as text.',
      type: 'boolean',
      default: 'true',
      sub: true,
    },
    {
      name: 'WrTableGroupContext',
      description: 'Passed to a wrTableGroupHeader template (also the built-in band context).',
      type: 'interface',
    },
    {
      name: 'value',
      description: 'The value groupBy returned; also the collapse identity.',
      type: 'unknown',
      sub: true,
    },
    { name: 'label', description: "Default label — String(value), or '—' for empty.", type: 'string', sub: true },
    {
      name: 'rows',
      description: "The group's rows on the current page.",
      type: 'readonly Record<string, unknown>[]',
      sub: true,
    },
    { name: 'count', description: 'rows.length — page-scoped row count.', type: 'number', sub: true },
    { name: 'collapsed', description: 'Whether the group is currently collapsed.', type: 'boolean', sub: true },
    { name: 'index', description: '0-based index of the group on the current page.', type: 'number', sub: true },
    { name: 'toggle', description: 'Collapse / expand this group.', type: '() => void', sub: true },
    {
      name: 'WrTableSummaryContext',
      description: "A summary function's second argument: which footer row it computes. Since v15.",
      type: "{ scope: 'total'; group: null } | { scope: 'group'; group: WrTableGroupContext }",
    },
    {
      name: 'scope',
      description: "'total' for the footer row, 'group' for a subtotal under a group.",
      type: "'total' | 'group'",
      sub: true,
    },
    {
      name: 'group',
      description: 'The group being subtotalled; null for the total.',
      type: 'WrTableGroupContext | null',
      sub: true,
    },
  ];

  // --- Tree mode ------------------------------------------------------------
  protected readonly orgColumns: WrTableColumns = {
    name: { title: 'Team / person' },
    head: { title: 'Reports to' },
    headcount: { title: 'Headcount', summary: 'sum' },
  };

  protected readonly org: readonly Record<string, unknown>[] = [
    {
      id: 'eng',
      name: 'Engineering',
      head: '—',
      headcount: 0,
      reports: [
        {
          id: 'eng-web',
          name: 'Web platform',
          head: 'Ada',
          headcount: 0,
          reports: [
            { id: 'p-rk', name: 'Roman', head: 'Ada', headcount: 1 },
            { id: 'p-mia', name: 'Mia', head: 'Ada', headcount: 1 },
          ],
        },
        {
          id: 'eng-infra',
          name: 'Infrastructure',
          head: 'Grace',
          headcount: 0,
          reports: [{ id: 'p-lev', name: 'Lev', head: 'Grace', headcount: 1 }],
        },
      ],
    },
    {
      id: 'design',
      name: 'Design',
      head: '—',
      headcount: 0,
      reports: [{ id: 'p-noa', name: 'Noa', head: 'Ivan', headcount: 1 }],
    },
  ];

  protected readonly openRows = signal<readonly unknown[]>(['eng']);
  protected readonly picked = signal<readonly unknown[]>([]);
}
