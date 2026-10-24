/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `ul[wr-chart-legend]` a harness query matches. */
export interface WrChartLegendHarnessFilters extends BaseHarnessFilters {
  /** Match a legend holding a row with this label. */
  readonly itemLabel?: string | RegExp;
  /** Match a legend by the list's accessible name. */
  readonly ariaLabel?: string | RegExp;
}

/** One legend row as {@link WrChartLegendHarness.getItems} reads it. */
export interface WrChartLegendHarnessItem {
  /** The row's name. */
  readonly label: string;
  /** The value printed after the name, or `null` when the row has none. */
  readonly value: string | null;
  /** What the key draws: a dot, a line, or a marker shape. */
  readonly swatch: 'dot' | 'line' | 'marker';
  /** The colour the component wrote on the key: a dot's inline background, a line's stroke, a marker's fill. */
  readonly color: string | null;
  /** The line's `stroke-dasharray`, `''` for a solid line, `null` when the key is not a line. */
  readonly dash: string | null;
  /** The marker shape, on a marker key or on a line that carries one; otherwise `null`. */
  readonly marker: string | null;
  /** Whether the row shows its series as hidden. */
  readonly hidden: boolean;
}
