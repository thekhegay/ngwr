/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-bullet-chart>` a harness query matches. */
export interface WrBulletChartHarnessFilters extends BaseHarnessFilters {
  /** Match the drawing's accessible name — the sentence, or `ariaLabel`. */
  readonly ariaLabel?: string | RegExp;
  /** Match the label shown beside the drawing. */
  readonly label?: string | RegExp;
}

/**
 * Where a part of the drawing lies along the scale, as {@link WrBulletChartHarness} reads
 * it: shares of the scale from 0 at its start to 1 at its end, as the component wrote them.
 */
export interface WrBulletChartExtent {
  /** Where it starts. The value's bar starts at zero, or at the value for a negative one. */
  readonly start: number;
  /** Where it ends. */
  readonly end: number;
}
