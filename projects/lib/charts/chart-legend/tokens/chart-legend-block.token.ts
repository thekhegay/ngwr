/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

/**
 * The BEM block of the chart a legend is drawn inside, provided by that chart:
 * `'wr-donut-chart'` makes every row also carry `.wr-donut-chart__legend-item`,
 * its key `.wr-donut-chart__swatch`, its name `.wr-donut-chart__legend-label` and
 * its value `.wr-donut-chart__legend-value` — the classes the chart drew before it
 * drew its legend through `WrChartLegend`, which are public API and stay on the
 * same elements.
 *
 * A chart provides it in `viewProviders`, and the legend reads it with `host: true`:
 * that lookup stops at the host element of the view the legend is declared in, where
 * it sees that component's `viewProviders` and not its `providers`. So only a legend
 * in the chart's OWN template takes the block, never one further down the tree.
 *
 * @internal
 */
export const WR_CHART_LEGEND_BLOCK = new InjectionToken<string>('WR_CHART_LEGEND_BLOCK');
