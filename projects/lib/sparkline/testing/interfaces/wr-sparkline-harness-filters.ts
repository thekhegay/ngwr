/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-sparkline>` a harness query matches. */
export interface WrSparklineHarnessFilters extends BaseHarnessFilters {
  /** Match the sparkline's accessible name — `null` for the decorative ones. */
  readonly ariaLabel?: string | RegExp;
}
