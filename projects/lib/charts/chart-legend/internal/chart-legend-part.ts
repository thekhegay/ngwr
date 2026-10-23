/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, input } from '@angular/core';

/**
 * Adds the host chart's own class to one part of a legend row, beside the part's
 * static `wr-chart-legend__*` classes.
 *
 * A host `[class]` binding merges with the element's static `class`, where a
 * template's `class` plus `[class]` pair is one the template lint refuses — and the
 * static half has to stay static: `charts/stylesheets.spec.ts` reads the first class
 * of every inline-painted mark off the template to hold it to `forced-color-adjust`.
 *
 * @internal
 */
@Directive({
  selector: '[wrChartLegendPart]',
  host: { '[class]': 'wrChartLegendPart()' },
})
export class WrChartLegendPart {
  /** The class to add; `''` adds none. */
  readonly wrChartLegendPart = input('');
}
