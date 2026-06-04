/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Semicircle progress gauge. Display-only — for interactive use see the
 * {@link WrKnob} from `ngwr/knob`.
 *
 * @example
 * ```html
 * <wr-gauge [value]="72" />
 * <wr-gauge [value]="9.5" [min]="0" [max]="10" suffix="/10" valueColor="var(--wr-color-warning)" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/gauge
 */
@Component({
  selector: 'wr-gauge',
  templateUrl: './gauge.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-gauge' },
})
export class WrGauge {
  readonly value = input.required<number>();
  readonly min = input(0, { transform: (v: unknown): number => coerceNumberProperty(v, 0) });
  readonly max = input(100, { transform: (v: unknown): number => coerceNumberProperty(v, 100) });

  /** Diameter in CSS pixels. @default 160 */
  readonly size = input(160, { transform: (v: unknown): number => Math.max(48, coerceNumberProperty(v, 160)) });

  /** Arc stroke thickness in viewBox units (out of 100). @default 10 */
  readonly strokeWidth = input(10, {
    transform: (v: unknown): number => Math.max(1, coerceNumberProperty(v, 10)),
  });

  readonly trackColor = input<string>('rgba(var(--wr-color-light-rgb), 0.6)');
  readonly valueColor = input<string>('var(--wr-color-primary)');

  /** Show the value text in the center. @default true */
  readonly showValue = input(true, { transform: coerceBooleanProperty });

  readonly suffix = input<string>('');

  // Geometry — semicircle in a 100×56 viewBox (centre at 50, 50).
  protected readonly cx = 50;
  protected readonly cy = 50;
  protected readonly radius = computed(() => 50 - this.strokeWidth() / 2 - 0.5);

  protected readonly ratio = computed(() => {
    const range = this.max() - this.min();
    if (range <= 0) return 0;
    return clamp((this.value() - this.min()) / range, 0, 1);
  });

  protected readonly trackPath = computed(() => {
    const r = this.radius();
    return `M ${this.cx - r} ${this.cy} A ${r} ${r} 0 0 1 ${this.cx + r} ${this.cy}`;
  });

  protected readonly valuePath = computed(() => {
    const r = this.radius();
    const angle = Math.PI * (1 - this.ratio());
    const ex = this.cx + r * Math.cos(angle);
    const ey = this.cy - r * Math.sin(angle);
    // The arc always spans `π × ratio` radians (≤ 180°), so largeArc stays 0.
    // Previously this was set to 1 when ratio > 0.5, which made the swept arc
    // take the long way round and visually flipped the bar.
    return `M ${this.cx - r} ${this.cy} A ${r} ${r} 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  });

  protected readonly viewBox = '0 0 100 56';
}
