import { WrTableFilterItem } from './table-filter-item';

export interface WrTableColumn {
  title: string;
  sortable?: boolean;
  filterItems?: WrTableFilterItem[];
}

export type WrTableColumns = Record<string, WrTableColumn>;
