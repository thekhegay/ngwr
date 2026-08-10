/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import type { WrBarChartDatum } from './interfaces';

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
 * @see https://ngwr.dev/reference/components/bar-chart
 */
@Component({
  selector: 'wr-bar-chart',
  templateUrl: './bar-chart.html',
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

  /**
   * A datum's value, with anything non-finite read as `0`.
   *
   * One `NaN` used to take out the whole chart rather than its own bar:
   * `Math.max(...values)` is `NaN` as soon as one value is, so the scale fell
   * back to `1` and every OTHER bar was asked for a height of `value * 100`%.
   * The bad bar also printed the literal text `NaN` above itself.
   */
  private static value(raw: number): number {
    return Number.isFinite(raw) ? raw : 0;
  }

  protected readonly resolvedMax = computed(() => {
    const explicit = this.max();
    if (explicit > 0) return explicit;
    const data = this.data();
    if (data.length === 0) return 1;
    const top = Math.max(...data.map(d => WrBarChart.value(d.value)), 0);
    return top > 0 ? top : 1;
  });

  protected readonly bars = computed(() =>
    this.data().map(d => {
      const value = WrBarChart.value(d.value);
      return {
        label: d.label,
        value,
        color: d.color ?? this.color(),
        heightPercent: (Math.max(0, value) / this.resolvedMax()) * 100,
        /**
         * The bar's accessible name. The label and the value sit in separate
         * rows, so a screen reader read every number and then every label with
         * nothing tying the two together — and with `showValues` off the
         * numbers were not in the accessible tree at all.
         */
        name: `${d.label}: ${value}`,
      };
    })
  );
}

export type { WrBarChartDatum } from './interfaces';
