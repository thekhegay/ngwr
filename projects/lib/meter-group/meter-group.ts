/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import { useI18nText } from 'ngwr/i18n';

import type { WrMeterSegment } from './interfaces';

const FALLBACK_COLORS = [
  'var(--wr-color-primary)',
  'var(--wr-color-success)',
  'var(--wr-color-warning)',
  'var(--wr-color-danger)',
  'var(--wr-color-medium)',
];

/**
 * Stacked-segment progress bar. Visualises a breakdown of a total —
 * disk usage, budget, vote share, etc. Each segment contributes a slice
 * proportional to its `value` relative to the sum (or the explicit `max`).
 *
 * @example
 * ```html
 * <wr-meter-group
 *   [segments]="[
 *     { label: 'Used', value: 60 },
 *     { label: 'Reserved', value: 25, color: 'var(--wr-color-warning)' }
 *   ]"
 *   [max]="100"
 * />
 * ```
 *
 * @see https://ngwr.dev/reference/components/meter-group
 */
@Component({
  selector: 'wr-meter-group',
  templateUrl: './meter-group.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-meter-group' },
})
export class WrMeterGroup {
  /** Accessible name — the role needs one. Falls back to `meterGroup.label`. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'meterGroup.label', 'Meter');

  readonly segments = input<readonly WrMeterSegment[]>([]);

  /** Explicit total. When `0` (default), `max = sum(values)`. @default 0 */
  readonly max = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /** Show the labelled legend under the bar. @default true */
  readonly showLegend = input(true, { transform: coerceBooleanProperty });

  /** Show each segment's value in the legend, next to its label. @default true */
  readonly showValues = input(true, { transform: coerceBooleanProperty });

  /**
   * A segment's contribution, floored at `0` and with anything non-finite read
   * as `0`. One `NaN` used to poison the whole bar: the sum is `NaN` as soon as
   * one value is, so the total fell back to `1` and every OTHER segment was
   * asked for a width of `value * 100`%, while `aria-valuenow` announced `NaN`.
   */
  private static amount(raw: number): number {
    return Number.isFinite(raw) ? Math.max(0, raw) : 0;
  }

  protected readonly resolvedMax = computed(() => {
    const explicit = this.max();
    if (explicit > 0) return explicit;
    const sum = this.segments().reduce((acc, s) => acc + WrMeterGroup.amount(s.value), 0);
    return sum > 0 ? sum : 1;
  });

  /**
   * Sum of the segments, for `aria-valuenow`. `role="progressbar"` without it
   * announces no value at all, so the bar was invisible to assistive tech.
   *
   * Capped at the total, because segments summing past an explicit `max` used
   * to announce a value outside the range they were announced against.
   */
  protected readonly totalValue = computed(() =>
    Math.min(
      this.resolvedMax(),
      this.segments().reduce((acc, s) => acc + WrMeterGroup.amount(s.value), 0)
    )
  );

  protected readonly slices = computed(() =>
    this.segments().map((segment, i) => ({
      label: segment.label,
      // The legend keeps a negative value visible — it is data the caller gave
      // us — but not a non-finite one, which reads as the literal text `NaN`.
      value: Number.isFinite(segment.value) ? segment.value : 0,
      color: segment.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      percent: (WrMeterGroup.amount(segment.value) / this.resolvedMax()) * 100,
    }))
  );
}
