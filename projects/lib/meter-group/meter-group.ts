/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

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
 * @see https://ngwr.dev/components/meter-group
 */
@Component({
  selector: 'wr-meter-group',
  templateUrl: './meter-group.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-meter-group' },
})
export class WrMeterGroup {
  readonly segments = input<readonly WrMeterSegment[]>([]);

  /** Explicit total. When `0` (default), `max = sum(values)`. @default 0 */
  readonly max = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /** Show the labelled legend under the bar. @default true */
  readonly showLegend = input(true, { transform: coerceBooleanProperty });

  /** Show each segment's percent value in the legend. @default true */
  readonly showValues = input(true, { transform: coerceBooleanProperty });

  protected readonly resolvedMax = computed(() => {
    const explicit = this.max();
    if (explicit > 0) return explicit;
    const sum = this.segments().reduce((acc, s) => acc + Math.max(0, s.value), 0);
    return sum > 0 ? sum : 1;
  });

  protected readonly slices = computed(() =>
    this.segments().map((segment, i) => ({
      label: segment.label,
      value: segment.value,
      color: segment.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      percent: (Math.max(0, segment.value) / this.resolvedMax()) * 100,
    }))
  );
}
