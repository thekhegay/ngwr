/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-gauge>` a harness query matches. */
export interface WrGaugeHarnessFilters extends BaseHarnessFilters {
  /** Match the dial's accessible name. */
  readonly ariaLabel?: string | RegExp;
  /** Match the value the dial announces. */
  readonly value?: number;
}
