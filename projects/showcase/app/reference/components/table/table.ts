import { Component, computed, signal } from '@angular/core';

import { WrTag } from 'ngwr/badge';
import { WrButton } from 'ngwr/button';
import {
  WrTableCell,
  WrTableExpand,
  WrTableGroupHeader,
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
import { API } from '#core/generated/api';

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
    WrTable,
    WrTableCell,
    WrTableExpand,
    WrTableGroupHeader,
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

  protected readonly groupCollapsed = signal<readonly unknown[]>([]);

  protected readonly salesRows: readonly Record<string, unknown>[] = [
    { region: 'EMEA', rep: 'Alice', deals: 12, revenue: 48200 },
    { region: 'EMEA', rep: 'Bob', deals: 7, revenue: 21500 },
    { region: 'AMER', rep: 'Cara', deals: 15, revenue: 61000 },
    { region: 'AMER', rep: 'Diego', deals: 9, revenue: 33750 },
    { region: 'APAC', rep: 'Emi', deals: 11, revenue: 40100 },
  ];
  protected readonly salesColumns: WrTableColumns = {
    region: { title: 'Region', summary: () => 'Subtotal' },
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

  protected readonly snippets = {
    install: `import { WrTable, WrTableCell, type WrTableColumns } from 'ngwr/table';

@Component({ imports: [WrTable, WrTableCell] })
export class MyComponent {}

// Each projected template is its own directive, and \`imports: []\` takes the
// class, not the selector. Add the ones your template actually uses:
//   <ng-template wrTableCell>        -> WrTableCell
//   <ng-template wrTableExpand>      -> WrTableExpand
//   <ng-template wrTableGroupHeader> -> WrTableGroupHeader`,
    basic: `<wr-table [columns]="columns" [items]="rows" />`,
    custom: `<wr-table [columns]="columns" [items]="rows" [(sort)]="sort" (filterChange)="onFilter($event)">
  <ng-template wrTableCell="role" let-value>
    <wr-tag [color]="value === 'admin' ? 'danger' : 'medium'">{{ value }}</wr-tag>
  </ng-template>
</wr-table>`,
    cellContext: `<!-- The cell template's context is \`WrTableCellContext\`: three names,
     and only the first is implicit.

       let-value             the cell value — item[columnKey]
       let-row="item"        the WHOLE row object
       let-col="column"      that column's own definition (title, width, …)

     \`let-row\` alone binds \`$implicit\`, i.e. the value again — the row needs
     the explicit \`="item"\`. -->
<ng-template wrTableCell="role" let-value let-row="item" let-col="column">
  {{ col.title }}: {{ value }} — {{ row.email }}
</ng-template>`,
    rowActions: `// A column whose cells are buttons: give it a key of its own and no
// title-bearing data behind it. \`let-row="item"\` is what the handler needs —
// the cell value for an action column is \`undefined\`, and that is fine.
const columns: WrTableColumns = {
  name: { title: 'Name' },
  email: { title: 'Email' },
  actions: { title: '', width: 96 },
};

<wr-table [columns]="columns" [items]="rows">
  <ng-template wrTableCell="actions" let-row="item">
    <wr-btn size="sm" color="danger" outlined (click)="remove(row)">Delete</wr-btn>
  </ng-template>
</wr-table>`,
    states: `<!-- Two states are built in. \`[loading]\` draws the spinner overlay;
     \`items\` that is empty (or null) draws the empty row, whose copy is
     \`emptyLabel\` — or the \`table.empty\` i18n key when you leave it unset. -->
<wr-table [columns]="columns" [items]="rows()" [loading]="loading()" emptyLabel="No users yet" />

<!-- There is deliberately NO error input. A failed request is the page's
     state, not the table's, so render it beside the table and pass the empty
     list through: -->
@if (error(); as message) {
  <wr-alert type="danger" title="Could not load users" [message]="message" />
}
<wr-table [columns]="columns" [items]="rows()" [loading]="loading()" />`,
    paginated: `<wr-table [columns]="columns" [items]="rows" [pageSize]="5" [(page)]="page" />`,
    sortState: `// The table writes \`sort\` and reads nothing back from your rows. Sorting
// them is yours — this is the comparator the demo above runs.
protected readonly sort = signal<readonly WrTableSortState[]>([]);

protected readonly rows = computed(() => {
  const rules = this.sort();
  if (rules.length === 0) return this.source();

  return [...this.source()].sort((a, b) => {
    for (const { key, direction } of rules) {   // array order = application order
      if (!direction) continue;                 // a header cycled back to "off"
      const cmp = String(a[key] ?? '').localeCompare(String(b[key] ?? ''));
      if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
});

// Server-side, the same array becomes query parameters — still no client sort.
effect(() => {
  const [primary] = this.sort();
  this.load({ sortBy: primary?.key, order: primary?.direction });
});`,
    serverHtml: `<!-- \`[total]\` switches the pager to server mode; \`[pageSize]\` still has to
     be there or no pager renders at all. \`page\` is a model, so the output
     it publishes is \`(pageChange)\`. -->
<wr-table
  [columns]="columns"
  [items]="pageRows()"
  [total]="total()"
  [pageSize]="20"
  [page]="page()"
  (pageChange)="onPage($event)"
  [(sort)]="sort"
/>`,
    serverTs: `// The handler. Nothing is sliced for you — you fetch the window you were asked for.
protected onPage(page: number): void {
  this.page.set(page);
  this.load();                 // limit: 20, skip: (page - 1) * 20
}

// Two-way binding works just as well when the page number is your own state:
//   <wr-table [total]="total()" [pageSize]="20" [(page)]="page" />
// …with an effect on \`page\` issuing the request.`,
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
    grouping: `<wr-table
  groupBy="role"
  [(collapsedGroups)]="collapsed"
  [columns]="columns"
  [items]="rows"
/>`,
    groupSummary: `const columns: WrTableColumns = {
  region:  { title: 'Region', summary: () => 'Subtotal' },
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
    virtual: `<wr-table
  virtualScroll
  [rowHeight]="41"
  [viewportHeight]="440"
  [columns]="columns"
  [items]="rows"
/>`,
    tree: `<!-- \`childrenKey\` names the child array; \`items\` becomes the roots.
     Open state reuses \`[(expanded)]\` and identity reuses \`rowKey\`. -->
<wr-table
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
      name: '[wrTableCell]',
      description:
        'Per-column cell template. The attribute value is the column key it overrides; import `WrTableCell`. Its context is `WrTableCellContext` — three names, listed below.',
      type: 'directive',
      default: '—',
    },
    {
      name: 'let-value',
      description: 'The cell value, `item[columnKey]`. The implicit context member, so the name is yours to pick.',
      type: 'unknown',
      default: '—',
      sub: true,
    },
    {
      name: 'let-row="item"',
      description:
        'The whole row object. Needs the explicit `="item"` — a bare `let-row` binds the implicit value instead. This is what a row-action button reads.',
      type: 'Record<string, unknown>',
      default: '—',
      sub: true,
    },
    {
      name: 'let-col="column"',
      description: 'That column’s own definition — `title`, `width`, `align`, and the rest of `WrTableColumn`.',
      type: 'WrTableColumn',
      default: '—',
      sub: true,
    },
  ];

  protected readonly methodsApi: readonly DocApiRow[] = [
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

  protected readonly filterApi = API.WrTableFilter;

  protected readonly sortApi = API.WrTableSort;

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
}

interface WrTableGroupContext {
  value: unknown;
  label: string;
  rows: readonly Record<string, unknown>[];
  count: number;
  collapsed: boolean;
  index: number;
  toggle: () => void;
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
