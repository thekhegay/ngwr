/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentType, PositionStrategy, ScrollStrategy } from '@angular/cdk/overlay';
import { ViewContainerRef } from '@angular/core';

import { SafeAny } from 'ngwr/cdk/types';

export class WrDialogOptions<C = SafeAny> {
  id?: string;
  component?: ComponentType<C>;
  data?: SafeAny;
  hasBackdrop?: boolean;
  backdropClass?: string;
  positionStrategy?: PositionStrategy;
  scrollStrategy?: ScrollStrategy;
  viewContainerRef?: ViewContainerRef;
}
