import {
  ChangeDetectionStrategy,
  Component,
  effect,
  HostBinding,
  inject,
  OnInit,
  signal,
  ViewEncapsulation,
} from '@angular/core';

import { WrTableCellDirective, WrTableComponent, WrTableFilterEmit, WrTableOrder, WrTableOrderItem } from 'ngwr/table';
import { WrTagComponent } from 'ngwr/tag';

import { CodeComponent, SnippetComponent } from '#core/components';
import { SeoService } from '#core/services';

interface User {
  id: number;
  name: string;
  age: number;
  status: string;
  [key: string]: string | number;
}

@Component({
  standalone: true,
  selector: 'ngwr-table',
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CodeComponent, SnippetComponent, WrTableComponent, WrTagComponent, WrTableCellDirective],
})
export class TableComponent implements OnInit {
  @HostBinding()
  class = 'ngwr-page';

  private readonly seoService = inject(SeoService);

  title = 'Table';
  description = 'A powerful and flexible table component for displaying data';

  private allUsers: User[] = Array.from({ length: 60 }, (_, index) => ({
    id: index + 1,
    name: `User ${index + 1}`,
    age: 20 + (index % 30),
    status: index % 2 === 0 ? 'active' : 'inactive',
  }));

  users: User[] = this.allUsers.slice(0, 10);

  usersWithPagination: User[] = [];
  currentPage = signal<number>(1);
  pageSize = signal<number>(15);
  total = signal<number>(60);
  ordering = signal<WrTableOrderItem[]>([]);
  filter = signal<WrTableFilterEmit | undefined>(undefined);

  columns = {
    id: { title: 'ID' },
    name: { title: 'Name' },
    age: { title: 'Age' },
    status: { title: 'Status' },
  };

  columnsSortableFilter = {
    id: { title: 'ID' },
    name: { title: 'Name', sortable: true },
    age: { title: 'Age', sortable: true },
    status: {
      title: 'Status',
      filterItems: [
        { title: 'Active', value: 'active', isSelected: false },
        { title: 'Inactive', value: 'inactive', isSelected: false },
      ],
    },
  };

  code = {
    import: `import { WrTableComponent } from "ngwr/table";`,
    component: `@Component({
                  //...,
                  imports: [WrTableComponent],
                })
                export class MyComponent {}`,
    basic: `@Component({
              template: '<wr-table [columns]="columns" [items]="users"></wr-table>'
              })
            export class MyComponent {
              columns = {
                id: { title: 'ID' },
                name: { title: 'Name' },
                age: { title: 'Age' },
                status: { title: 'Status' },
              };

              users: User[] = [...];
            }`,
    pagination: `@Component({
template: \`
    <wr-table
      [pagination]="true"
      [columns]="columns"
      [items]="users"
      [total]="total()"
      [pageSizeOptions]="[15, 25, 50]"
      [pageSize]="pageSize()"
      [(currentPage)]="currentPage"
      [(ordering)]="ordering"
      (pageSizeChange)="onPageSizeChange($event)"
      (filterChange)="onFilterChange($event)"
    >
    </wr-table>
  \`
})
                export class MyComponent {
                  currentPage = signal<number>(1);
                  pageSize = signal<number>(15);
                  total = signal<number>(60);
                  ordering = signal<WrTableOrderItem[]>([]);
                  filter = signal<WrTableFilterEmit | undefined>(undefined);

                  columns = {
                    id: { title: 'ID' },
                    name: { title: 'Name', sortable: true },
                    age: { title: 'Age', sortable: true },
                    status: {
                      title: 'Status',
                      filterItems: [
                        { title: 'Active', value: 'active', isSelected: false },
                        { title: 'Inactive', value: 'inactive', isSelected: false },
                      ],
                    },
                  };

                  users: User[] = [...];

                  constructor() {
                    effect(() => {
                      if (this.filter() || this.currentPage() || this.ordering()) {
                        this.updatePaginatedUsers();
                      }
                    });
                  }

                  onFilterChange(filter: WrTableFilterEmit): void {
                    this.filter.set(filter);
                  }

                  onPageSizeChange(newPageSize: number): void {
                    this.pageSize.set(newPageSize);
                    this.currentPage.set(1);
                  }

                  private updatePaginatedUsers(): void { ... }
                }`,
    customCell: `<wr-table [columns]="columns" [items]="users">
                  <ng-template wrTableCell="status" let-status let-item="item">
                    <span class="status-badge" [class.active]="status === 'active'">
                      {{ status }}
                    </span>
                  </ng-template>
                </wr-table>`,
    loading: `<wr-table
                [columns]="columns"
                [items]="users"
                [loading]="isLoading">
              </wr-table>`,
    loadingItems: `<wr-table
                [columns]="columns"
                [items]="[]"
               >
              </wr-table>`,
    styling: `:root {
                --wr-table-columns: 1;
                --wr-table-padding: calc(var(--wr-grid-gutter) / 3);

                --wr-table-filter-size: 1.25rem;
                --wr-table-filter-padding: 0.125rem;
                --wr-table-filter-color: var(--wr-color-light);
                --wr-table-filter-bg: transparent;

                --wr-table-filter-dd-padding: 0.375rem;
                --wr-table-filter-dd-max-items: 10;
                --wr-table-filter-dd-item-height: 2rem;

                --wr-table-sort-size: 1.25rem;
                --wr-table-sort-padding: 0.125rem;
                --wr-table-sort-rotate: -90deg;
                --wr-table-sort-color: var(--wr-color-light);
                --wr-table-sort-bg: transparent;
              }`,
  };

  constructor() {
    effect(() => {
      if (this.filter() || this.currentPage() || this.ordering()) {
        this.updatePaginatedUsers();
      }
    });
  }

  ngOnInit(): void {
    this.updatePaginatedUsers();
    this.seoService.setCanonicalURL();
    this.seoService.setTitle(this.title);
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['table', 'wr-table', 'data-table', 'sorting', 'filtering']);
  }

  onFilterChange(filter: WrTableFilterEmit): void {
    this.filter.set(filter);
  }

  onPageSizeChange(newPageSize: number): void {
    this.pageSize.set(newPageSize);
    this.currentPage.set(1);
  }

  private updatePaginatedUsers(): void {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    let totalUsers = [];

    if (this.filter()?.items?.length) {
      totalUsers = this.allUsers.filter(user => this.filter()?.items.some(item => item.value === user.status));
    } else {
      totalUsers = this.allUsers;
    }

    for (const order of this.ordering()) {
      totalUsers = totalUsers.sort((a, b) => {
        const aValue = a[order.key];
        const bValue = b[order.key];

        if (order.order === WrTableOrder.ASC) {
          return aValue > bValue ? 1 : -1;
        }
        if (order.order === WrTableOrder.DESC) {
          return aValue < bValue ? 1 : -1;
        }
        return 0;
      });
    }

    this.total.set(totalUsers.length);

    this.usersWithPagination = totalUsers.slice(startIndex, endIndex);
  }
}
