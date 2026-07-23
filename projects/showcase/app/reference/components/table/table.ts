import { Component, computed, signal } from '@angular/core';

import { WrTag } from 'ngwr/badge';
import { WrButton } from 'ngwr/button';
import {
  WrTableCell,
  WrTableExpand,
  WrTable,
  type WrTableColumns,
  type WrTableFilterChange,
  type WrTableSortState,
} from 'ngwr/table';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';

interface Row extends Record<string, unknown> {
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

const RAW_ROWS: readonly Row[] = [
  { name: 'Roman', email: 'rk@garuna.dev', role: 'admin' },
  { name: 'Alice', email: 'alice@example.com', role: 'editor' },
  { name: 'Bob', email: 'bob@example.com', role: 'viewer' },
  { name: 'Cara', email: 'cara@example.com', role: 'editor' },
  { name: 'Diego', email: 'diego@example.com', role: 'viewer' },
];

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
    WrTable,
    WrTableCell,
    WrTableExpand,
    WrTag,
    WrButton,
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

  protected readonly visibleRows = computed<readonly Record<string, unknown>[]>(() => {
    const roles = this.roleFilter();
    const filtered: readonly Record<string, unknown>[] =
      roles.length === 0 ? [...RAW_ROWS] : RAW_ROWS.filter(r => roles.includes(r.role));
    const sortRules = this.sort();
    if (sortRules.length === 0) return filtered;

    return [...filtered].sort((a, b) => {
      for (const { key, direction } of sortRules) {
        if (!direction) continue;
        const av = (a as unknown as Record<string, string>)[key] ?? '';
        const bv = (b as unknown as Record<string, string>)[key] ?? '';
        const cmp = av.localeCompare(bv);
        if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  });

  protected readonly paginatedRows = PAGINATED_ROWS;
  protected readonly page = signal(1);

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

  protected readonly snippets = {
    install: `import { WrTable, WrTableCell, type WrTableColumns } from 'ngwr/table';

@Component({ imports: [WrTable, WrTableCell] })
export class MyComponent {}`,
    basic: `<wr-table [columns]="columns" [items]="rows" />`,
    custom: `<wr-table [columns]="columns" [items]="rows" [(sort)]="sort" (filterChange)="onFilter($event)">
  <ng-template wrTableCell="role" let-value>
    <wr-tag [color]="value === 'admin' ? 'danger' : 'medium'">{{ value }}</wr-tag>
  </ng-template>
</wr-table>`,
    paginated: `<wr-table [columns]="columns" [items]="rows" [pageSize]="5" [(page)]="page" />`,
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
    selection: `<wr-table
  rowSelection="multiple"
  rowKey="email"
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
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'columns',
      description: 'Column definitions, keyed by row property name.',
      type: 'WrTableColumns',
      required: true,
    },
    {
      name: 'items',
      description: 'Row items. null/undefined = loading.',
      type: 'readonly Record<string, unknown>[] | null',
      default: 'null',
    },
    { name: 'loading', description: 'Show a spinner overlay.', type: 'boolean', default: 'false' },
    {
      name: 'reorderable',
      description: 'Enable drag-to-reorder on the column headers.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'columnOrder',
      description: 'Two-way column order (array of keys); pinned columns stay anchored.',
      type: 'readonly string[]',
      default: '[]',
    },
    {
      name: 'rowSelection',
      description: "Selection mode — 'single' or 'multiple' (adds a leading checkbox column).",
      type: "'single' | 'multiple' | null",
      default: 'null',
    },
    {
      name: 'rowKey',
      description: 'Identify a row for selection — a property name or a function.',
      type: 'string | ((row) => unknown) | null',
      default: 'null',
    },
    { name: 'selection', description: 'Two-way selected row keys.', type: 'readonly unknown[]', default: '[]' },
    {
      name: 'expanded',
      description: 'Two-way expanded row keys (needs a wrTableExpand template).',
      type: 'readonly unknown[]',
      default: '[]',
    },
    {
      name: '<ng-template wrTableExpand>',
      description: 'Detail template revealed when a row expands (let-row).',
      type: 'directive',
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
    { name: 'sort', description: 'Two-way bindable sort array.', type: 'readonly WrTableSortState[]', default: '[]' },
    {
      name: '(filterChange)',
      description: 'Fires when a column filter changes.',
      type: 'EventEmitter<WrTableFilterChange>',
      default: '—',
    },
    {
      name: 'pageSize',
      description: 'Rows per page. `0` disables client-side pagination.',
      type: 'number',
      default: '0',
    },
    { name: 'page', description: 'Two-way bindable 1-based current page.', type: 'number', default: '1' },
    {
      name: 'totalItems',
      description:
        'Server-side total. When set, the table renders the pager but does NOT slice `items` (you handle paging).',
      type: 'number | null',
      default: 'null',
    },
  ];

  protected onFilter(change: WrTableFilterChange): void {
    if (change.key === 'role') {
      this.roleFilter.set(change.items.map(i => i.value as string));
    }
  }

  protected readonly typeSnippet = `type WrTableColumns = Record<string, WrTableColumn>;

interface WrTableColumn {
  title: string;
  sortable?: boolean;
  filterItems?: readonly WrTableFilterItem[];
  pin?: 'left' | 'right';
  resizable?: boolean;
  width?: number;
  summary?: WrTableSummary;
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

interface WrTableCsvOptions {
  filename?: string;
  selectedOnly?: boolean;
  delimiter?: string;
  escapeFormulas?: boolean;
}`;

  protected readonly typeRows: readonly DocApiRow[] = [
    {
      name: 'WrTableColumns',
      description: 'Column map — keys are row property names.',
      type: 'Record<string, WrTableColumn>',
    },
    { name: 'WrTableColumn', description: 'A single column definition.', type: 'interface' },
    { name: 'title', description: 'Heading shown in the header.', type: 'string', required: true, sub: true },
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
      name: 'resizable',
      description: 'Add a drag handle on the header edge to resize.',
      type: 'boolean',
      default: 'false',
      sub: true,
    },
    { name: 'width', description: 'Initial column width in px (overridden by a drag).', type: 'number', sub: true },
    {
      name: 'summary',
      description: "Footer aggregate — 'sum' / 'avg' / 'count' / 'min' / 'max', or (rows) => value.",
      type: 'WrTableSummary',
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
  ];
}
