/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, input } from '@angular/core';

import type { WrChartTooltipDatum } from '../interfaces';

/**
 * The chip a chart's hover tooltip renders into. Not part of the template API —
 * `useChartTooltip()` attaches it.
 *
 * It wears `.wr-tooltip` as well as its own class, so it IS the library's
 * tooltip: the same surface, border, radius, type and arrow as
 * `[wrPopover] mode="tooltip"`, and an app that retints `--wr-tooltip-bg`
 * retints this one with the rest. Only the inside is its own — a swatch, a
 * label and a value, laid out rather than joined into one string, so no
 * separator has to be translated.
 *
 * @internal
 */
@Component({
  selector: 'wr-chart-tooltip',
  templateUrl: './chart-tooltip-panel.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-tooltip wr-chart-tooltip' },
})
export class WrChartTooltipPanel {
  readonly datum = input.required<WrChartTooltipDatum>();
}
