/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import { wrCheckStyles } from 'ngwr/utils';

import { WrChartLegendPart } from './internal/chart-legend-part';
import type { WrChartLegendPosition } from './types';

/**
 * The key of a colour scale: its steps side by side, lowest first, between the labels of
 * its two ends. What a heatmap and a calendar heatmap draw where a categorical chart
 * draws `ul[wr-chart-legend]`, and it stands on its own for a key several charts share.
 *
 * Not a mode of the legend: a legend is a list of series, each a row a reader can name,
 * hover and toggle, and a scale is one ramp with two ends and no rows. It lives beside
 * the legend because it takes the legend's place: the same `position`, the same room
 * from its chart (`--wr-chart-legend-space`), the same type.
 *
 * Each step is painted by an inline background, any CSS colour, so a chart hands over the
 * paints it draws its own cells with. Whatever the chart projects into it follows the
 * ramp: a heatmap adds the key of an empty cell there.
 *
 * `block` adds the host chart's own classes to the parts, as `WR_CHART_LEGEND_BLOCK`
 * does for a legend: `<block>__legend-label`, `<block>__scale` and `<block>__swatch`,
 * the classes the heatmap drew its key with before it drew it through this.
 *
 * It announces nothing of its own: where the figures it keys are in text elsewhere, as a
 * chart's are in its data table, hide it with `aria-hidden`.
 *
 * @example
 * ```html
 * <wr-chart-scale aria-hidden="true" minLabel="0" maxLabel="120" [steps]="paints" />
 * ```
 *
 * @see https://ngwr.dev/charts/chart-legend
 */
@Component({
  selector: 'wr-chart-scale',
  templateUrl: './chart-scale.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-chart-scale',
    '[class.wr-chart-scale--top]': "position() === 'top'",
    '[class.wr-chart-scale--bottom]': "position() === 'bottom'",
    '[class.wr-chart-scale--start]': "position() === 'start'",
    '[class.wr-chart-scale--end]': "position() === 'end'",
    '[class.wr-chart-scale--none]': "position() === 'none'",
  },
  imports: [WrChartLegendPart],
})
export class WrChartScale {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('charts/chart-legend');
  }

  /** The paint of each step, lowest first: any CSS colour, `var(--wr-…)` included. */
  readonly steps = input<readonly string[]>([]);

  /** What the lowest step stands for, written before the ramp. `null` writes nothing. */
  readonly minLabel = input<string | null>(null);

  /** What the highest step stands for, written after the ramp. `null` writes nothing. */
  readonly maxLabel = input<string | null>(null);

  /**
   * Where the key sits beside its chart, as a legend's `position`: it picks the margin
   * that keeps it off the chart, and `none` draws nothing. @default 'bottom'
   */
  readonly position = input<WrChartLegendPosition>('bottom');

  /** The host chart's block, for its own class on each part. `null` adds none. */
  readonly block = input<string | null>(null);

  /** The host chart's own class for each part, or nothing outside a chart. */
  protected readonly parts = computed(() => {
    const block = this.block();
    return {
      label: block ? `${block}__legend-label` : '',
      ramp: block ? `${block}__scale` : '',
      step: block ? `${block}__swatch` : '',
    };
  });
}
