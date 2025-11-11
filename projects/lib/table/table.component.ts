import { KeyValuePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  EventEmitter,
  HostBinding,
  HostListener,
  numberAttribute,
  Output,
  QueryList,
  TemplateRef,
  ViewEncapsulation,
  AfterContentInit,
  input,
  model,
} from '@angular/core';

import { SafeAny } from 'ngwr/cdk/types';
import { WrDropdownDirective, WrDropdownMenuComponent } from 'ngwr/dropdown';
import { infoCircleOutline, provideWrIcons, WrIconComponent } from 'ngwr/icon';
import { WrPaginationComponent } from 'ngwr/pagination';
import { NewArrayPipe } from 'ngwr/pipes';
import { WrSpinnerComponent } from 'ngwr/spinner';

import { WrTableCellDirective } from './table-cell';
import { WrTableFilterComponent } from './table-filter';
import { WrTableSortComponent } from './table-sort';
import {
  WrTableCellContext,
  WrTableColumns,
  WrTableFilterEmit,
  WrTableFilterItem,
  WrTableOrder,
  WrTableOrderItem,
} from './types';

@Component({
  selector: 'wr-table',
  templateUrl: './table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    NgTemplateOutlet,
    KeyValuePipe,
    NewArrayPipe,
    WrIconComponent,
    WrSpinnerComponent,
    WrDropdownDirective,
    WrDropdownMenuComponent,
    WrPaginationComponent,
    WrTableSortComponent,
    WrTableFilterComponent,
  ],
  providers: [provideWrIcons([infoCircleOutline])],
  host: {
    class: 'wr-table',
  },
})
export class WrTableComponent implements AfterContentInit {
  columns = input.required<WrTableColumns>();
  items = input.required<SafeAny[] | undefined>();
  loading = input<boolean>();
  pagination = input<boolean>(false);
  total = input<number, unknown>(1, { transform: numberAttribute });
  currentPage = model<number>(1);
  pageSize = model<number>(15);
  pageSizeOptions = input<number[]>([15, 25, 50]);
  ordering = model<WrTableOrderItem[]>();

  @Output() readonly filterChange = new EventEmitter<WrTableFilterEmit>();

  @HostBinding('style')
  get styles(): Record<string, string | number> {
    return {
      '--wr-table-columns': Object.keys(this.columns).length,
    };
  }

  @HostListener('document:keydown', ['$event'])
  onKeypress(evt: KeyboardEvent): void {
    const isCtrl = evt.ctrlKey;
    const isPeriod = evt.code === 'Period';
    const isComma = evt.code === 'Comma';

    if (isCtrl && isPeriod) {
      const totalPages = Math.ceil(this.total() / this.pageSize());

      if (this.currentPage() < totalPages) {
        this.currentPage.update(value => ++value);
      }
    }

    if (isCtrl && isComma) {
      if (this.currentPage() > 1) {
        this.currentPage.update(value => --value);
      }
    }
  }

  @ContentChildren(WrTableCellDirective)
  private customCells: QueryList<WrTableCellDirective> | undefined;

  private cellTemplates = new Map<string, TemplateRef<WrTableCellContext>>();

  ngAfterContentInit(): void {
    this.customCells?.forEach(cell => {
      this.cellTemplates.set(cell.columnKey(), cell.template);
    });
  }

  protected getCellTemplate(columnKey: string): TemplateRef<WrTableCellContext> | null {
    return this.cellTemplates.get(columnKey) || null;
  }

  protected hasCellTemplate(columnKey: string): boolean {
    return this.cellTemplates.has(columnKey);
  }

  /**
   * We need to pass null to save original order for keyvalue pipe
   * https://angular.dev/api/common/KeyValuePipe?tab=description
   */
  protected readonly keepOrder = (): SafeAny => null;

  protected getOrder(key: string): WrTableOrder {
    return this.ordering()?.find(o => o.key === key)?.order ?? WrTableOrder.REMOVE;
  }

  protected onOrderChange(key: string): void {
    const item = this.ordering()?.find(o => o.key === key);

    let order: WrTableOrder;
    switch (item?.order) {
      case WrTableOrder.ASC:
        order = WrTableOrder.DESC;
        break;
      case WrTableOrder.DESC:
        order = WrTableOrder.REMOVE;
        break;
      default:
        order = WrTableOrder.ASC;
    }

    const orderingItem: WrTableOrderItem = {
      key,
      order,
    };

    this.ordering.update(ordering => {
      const orderingMap = new Map(ordering?.map(item => [item.key, item]) ?? []);
      orderingMap.set(key, orderingItem);
      return Array.from(orderingMap.values());
    });
  }

  protected onFilterChange(key: string, items: WrTableFilterItem[]): void {
    this.filterChange.emit({ key, items });
  }
}
