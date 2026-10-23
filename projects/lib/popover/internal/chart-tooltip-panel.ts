/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { NgTemplateOutlet } from '@angular/common';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import type { WrChartTooltipDatum } from '../types';

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
 * With `rows`, those three become a heading in `.wr-chart-tooltip__head` and
 * each row a line of its own under it, again a swatch, a label and a value.
 * Without them the chip is exactly the single line it always was: no heading
 * wrapper, no modifier, so no chart that never passes rows draws anything new.
 *
 * @internal
 */
@Component({
  selector: 'wr-chart-tooltip',
  templateUrl: './chart-tooltip-panel.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-tooltip wr-chart-tooltip',
    '[class.wr-chart-tooltip--rows]': 'rows().length > 0',
  },
  imports: [NgTemplateOutlet],
})
export class WrChartTooltipPanel {
  readonly datum = input.required<WrChartTooltipDatum>();

  protected readonly rows = computed(() => this.datum().rows ?? []);
}
