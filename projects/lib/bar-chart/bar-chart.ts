/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

/** One bar's worth of data. */
export interface WrBarChartDatum {
  readonly label: string;
  readonly value: number;
  readonly color?: string;
}

/**
 * Minimal vertical bar chart. Pass `[data]` — each datum becomes a bar.
 * Axis-free; for the simple "show me a comparison" case.
 *
 * @example
 * ```html
 * <wr-bar-chart [data]="[
 *   { label: 'Mon', value: 12 },
 *   { label: 'Tue', value: 18, color: 'var(--wr-color-success)' },
 *   { label: 'Wed', value: 9 }
 * ]" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/bar-chart
 */
@Component({
  selector: 'wr-bar-chart',
  templateUrl: './bar-chart.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-bar-chart' },
})
export class WrBarChart {
  readonly data = input<readonly WrBarChartDatum[]>([]);

  /** Default bar colour when a datum has none. @default primary */
  readonly color = input<string>('var(--wr-color-primary)');

  /** Show value labels above each bar. @default true */
  readonly showValues = input(true, { transform: coerceBooleanProperty });

  /** Pixel height of the chart area. @default 200 */
  readonly height = input(200, { transform: (v: unknown): number => Math.max(40, coerceNumberProperty(v, 200)) });

  /** Explicit max value. `0` = auto. @default 0 */
  readonly max = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  protected readonly resolvedMax = computed(() => {
    const explicit = this.max();
    if (explicit > 0) return explicit;
    const data = this.data();
    if (data.length === 0) return 1;
    const top = Math.max(...data.map(d => d.value), 0);
    return top > 0 ? top : 1;
  });

  protected readonly bars = computed(() =>
    this.data().map(d => ({
      label: d.label,
      value: d.value,
      color: d.color ?? this.color(),
      heightPercent: (Math.max(0, d.value) / this.resolvedMax()) * 100,
    }))
  );
}
