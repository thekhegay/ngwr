import { Component, computed, signal } from '@angular/core';

import { WrTableCell, WrTable, type WrTableColumns, type WrTableFilterChange, type WrTableSortState } from 'ngwr/table';
import { WrTag } from 'ngwr/badge';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
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

@Component({
  selector: 'ngwr-table-page',
  templateUrl: './table.html',
  imports: [
    WrTable,
    WrTableCell,
    WrTag,
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
      description: 'Server-side total. When set, the table renders the pager but does NOT slice `items` (you handle paging).',
      type: 'number | null',
      default: 'null',
    },
  ];

  protected onFilter(change: WrTableFilterChange): void {
    if (change.key === 'role') {
      this.roleFilter.set(change.items.map(i => i.value as string));
    }
  }
}
