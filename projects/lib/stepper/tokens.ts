/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken, type Signal } from '@angular/core';

/** Surface a {@link WrStepperComponent} provides for its child `<wr-step>`s. */
export type WrStepperContext = {
  /** Index of the currently visible step. */
  readonly active: Signal<number>;
  /** Linear mode — steps after the latest completed one are locked. */
  readonly linear: Signal<boolean>;
};

export const WR_STEPPER = new InjectionToken<WrStepperContext>('WR_STEPPER');
