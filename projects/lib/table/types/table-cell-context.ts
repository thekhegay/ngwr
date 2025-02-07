import { WrTableColumn } from './table-columns';

export interface WrTableCellContext {
  $implicit: unknown;
  item: Record<string, unknown>;
  column: WrTableColumn;
}
