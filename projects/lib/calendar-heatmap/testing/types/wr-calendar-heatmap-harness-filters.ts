/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-calendar-heatmap>` a harness query matches. */
export interface WrCalendarHeatmapHarnessFilters extends BaseHarnessFilters {
  /** Match the grid's accessible name. */
  readonly ariaLabel?: string | RegExp;
}

/** One day square, as its tooltip describes it. */
export interface WrCalendarHeatmapCell {
  /** The ISO date the square stands for. */
  readonly iso: string;
  /** The value as printed in the tooltip. */
  readonly value: string;
  /** Which week column it sits in, one-based, as the grid places it. */
  readonly week: number;
  /** Which weekday row it sits in, one-based. */
  readonly day: number;
}
