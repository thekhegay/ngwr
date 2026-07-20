/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, input } from '@angular/core';

/**
 * Dashboard grid for `<wr-statistic>` cards. The column count follows the
 * group's OWN width — an intrinsic container-query grid sized by its box, not
 * a viewport media query — so it reflows correctly inside any column, card, or
 * split pane. Columns are never narrower than `min`; `columns` optionally caps
 * how many ever sit side by side on a wide container.
 *
 * @example
 * ```html
 * <wr-statistic-group [columns]="4" min="11rem">
 *   <wr-statistic label="Active users" [value]="12345" />
 *   <wr-statistic label="Revenue" [value]="9512" prefix="$" [delta]="12.4" />
 *   <wr-statistic label="Churn" [value]="1.8" suffix="%" [delta]="-0.4" />
 *   <wr-statistic label="Sessions" [value]="48210" />
 * </wr-statistic-group>
 * ```
 *
 * @see https://ngwr.dev/reference/components/statistic
 */
@Component({
  selector: 'wr-statistic-group',
  template: '<div class="wr-statistic-group__grid"><ng-content /></div>',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-statistic-group',
    '[style.--wr-statistic-group-min]': 'min()',
    '[style.--wr-statistic-group-columns]': 'columns() || null',
  },
})
export class WrStatisticGroup {
  /**
   * Minimum width of each column before the grid reflows to fewer columns.
   * Any CSS length — smaller packs more cards per row. @default '12rem'
   */
  readonly min = input<string>('12rem');

  /**
   * Cap on how many columns ever sit side by side on a wide container. `0`
   * (default) leaves it uncapped — fit as many `min`-wide columns as the
   * width allows. @default 0
   */
  readonly columns = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });
}
