/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

/**
 * KPI card — label + big number + optional prefix/suffix + delta. Pair
 * with a layout grid for dashboards.
 *
 * @example
 * ```html
 * <wr-statistic label="Active users" [value]="12345" suffix="users" />
 * <wr-statistic label="Revenue" [value]="9512" prefix="$" [delta]="12.4" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/statistic
 */
@Component({
  selector: 'wr-statistic',
  templateUrl: './statistic.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-statistic' },
})
export class WrStatisticComponent {
  readonly label = input<string>('');

  /** The number (or string) to display in the main slot. */
  readonly value = input<number | string | null>(null);

  /** Prefix glyph / symbol (e.g. `'$'`). */
  readonly prefix = input<string>('');

  /** Suffix glyph / unit (e.g. `'%'`, `'kg'`). */
  readonly suffix = input<string>('');

  /**
   * Optional delta vs previous period — shown as `+x.x%` (or `-x.x%`).
   * Use `deltaSuffix` to change the trailing unit.
   */
  readonly delta = input<number | null>(null, {
    transform: (v: unknown): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = coerceNumberProperty(v, Number.NaN);
      return Number.isFinite(n) ? n : null;
    },
  });

  /** Unit appended to the delta value. @default '%' */
  readonly deltaSuffix = input<string>('%');

  protected readonly hasDelta = computed(() => this.delta() !== null);

  protected readonly deltaDirection = computed<'up' | 'down' | 'flat'>(() => {
    const d = this.delta();
    if (d === null || d === 0) return 'flat';
    return d > 0 ? 'up' : 'down';
  });

  protected readonly deltaText = computed(() => {
    const d = this.delta();
    if (d === null) return '';
    const sign = d > 0 ? '+' : '';
    return `${sign}${d}${this.deltaSuffix()}`;
  });
}
