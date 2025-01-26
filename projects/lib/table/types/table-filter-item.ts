import { SafeAny } from '../../cdk/types';

export interface WrTableFilterItem<T = SafeAny> {
  title: string;
  value: T;
  isSelected?: boolean;
}
