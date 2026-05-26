/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

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
 * @see https://ngwr.dev/docs/components/sparkline
 */
@Component({
  selector: 'wr-sparkline',
  templateUrl: './sparkline.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-sparkline' },
})
export class WrSparkline {
  readonly data = input<readonly number[]>([]);

  /** Stroke colour. @default `var(--wr-color-primary)` */
  readonly color = input<string>('var(--wr-color-primary)');

  /** Stroke width in viewBox units. @default 1.5 */
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
    const data = this.data();
    if (data.length === 0) return [] as readonly { x: number; y: number }[];
    if (data.length === 1) return [{ x: this.vbW / 2, y: this.vbH / 2 }];

    let min = data[0];
    let max = data[0];
    for (const v of data) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const span = max - min || 1;
    const pad = this.padding;
    const w = this.vbW - pad * 2;
    const h = this.vbH - pad * 2;
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
