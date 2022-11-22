import { ComponentType, PositionStrategy } from '@angular/cdk/overlay';
import { ViewContainerRef } from '@angular/core';

import { SafeAny } from 'ngwr/core/types';

export class WrDialogConfig<T = SafeAny> {
  id?: string;
  component?: ComponentType<T>;
  title?: string;
  data?: SafeAny;
  viewContainerRef?: ViewContainerRef;
  positionStrategy?: PositionStrategy;
}
