/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

/**
 * Tiny inline trend line. SVG path drawn from `[data]: number[]` — no
 * axes, no labels, just the shape. Optional area fill + tip dot.
 *
 * @example
 * ```html
 * <wr-sparkline [data]="[12, 14, 9, 17, 21, 18, 23]" />
 * <wr-sparkline [data]="prices" [showArea]="true" color="var(--wr-color-success)" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/sparkline
 */
@Component({
  selector: 'wr-sparkline',
  templateUrl: './sparkline.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-sparkline' },
})
export class WrSparkline {
  readonly data = input<readonly number[]>([]);

  /**
   * Accessible name. A sparkline usually sits beside the number it summarises, where
   * announcing it again is noise — so it is `aria-hidden` by default and becomes a
   * named `role="img"` only when a consumer says what it shows.
   */
  readonly ariaLabel = input<string | null>(null);

  /** Stroke colour. @default `var(--wr-color-primary)` */
  readonly color = input<string>('var(--wr-color-primary)');

  /**
   * Line thickness in CSS pixels — `vector-effect="non-scaling-stroke"` keeps it at
   * that width whatever the box is stretched to, so it is NOT in viewBox units.
   * @default 1.5
   */
  readonly strokeWidth = input(1.5, {
    transform: (v: unknown): number => Math.max(0.1, coerceNumberProperty(v, 1.5)),
  });

  /** Fill the area below the line. @default false */
  readonly showArea = input(false, { transform: coerceBooleanProperty });

  /** Show a dot at the last data point. @default true */
  readonly showTip = input(true, { transform: coerceBooleanProperty });

  /** CSS width. @default '8rem' */
  readonly width = input<string>('8rem');

  /** CSS height. @default '2rem' */
  readonly height = input<string>('2rem');

  // Drawn in a 100×40 viewBox — scales smoothly to any CSS size.
  private readonly vbW = 100;
  private readonly vbH = 40;
  private readonly padding = 2;

  /** Mapped `{ x, y }` points for the path. */
  protected readonly points = computed(() => {
    // Non-finite data is dropped rather than scaled: every `min`/`max` comparison
    // against a NaN is false, so it survived into the scale and `toFixed(2)` wrote the
    // literal text `NaN` into the path `d` — invalid geometry, and the line vanishes.
    const data = this.data().filter(v => Number.isFinite(v));
    if (data.length === 0) return [] as readonly { x: number; y: number }[];
    if (data.length === 1) return [{ x: this.vbW / 2, y: this.vbH / 2 }];

    let min = data[0];
    let max = data[0];
    for (const v of data) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const pad = this.padding;
    const w = this.vbW - pad * 2;
    const h = this.vbH - pad * 2;
    // A series with no spread has no shape, and dividing by the old `|| 1` fallback
    // pinned every point to `pad + h` — the bottom edge — so a steady series at 500
    // read as rock bottom. Centred instead, which is what a lone datum already does.
    if (max === min) {
      return data.map((_, i) => ({ x: pad + (i / (data.length - 1)) * w, y: this.vbH / 2 }));
    }
    const span = max - min;
    return data.map((v, i) => ({
      x: pad + (i / (data.length - 1)) * w,
      y: pad + h - ((v - min) / span) * h,
    }));
  });

  protected readonly linePath = computed(() =>
    this.points()
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ')
  );

  protected readonly areaPath = computed(() => {
    const pts = this.points();
    if (pts.length < 2) return '';
    const baseY = this.vbH - this.padding;
    const start = `M ${pts[0].x.toFixed(2)} ${baseY}`;
    const line = pts.map(p => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    const close = `L ${pts[pts.length - 1].x.toFixed(2)} ${baseY} Z`;
    return `${start} ${line} ${close}`;
  });

  protected readonly tipPoint = computed(() => {
    const pts = this.points();
    return pts.length > 0 ? pts[pts.length - 1] : null;
  });

  protected readonly viewBox = `0 0 ${this.vbW} ${this.vbH}`;
}
