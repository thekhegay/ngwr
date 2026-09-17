/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, type ElementRef, ViewEncapsulation, computed, input, viewChild } from '@angular/core';

import { useChartTooltip } from 'ngwr/popover';

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

  /**
   * Show a tooltip with the value of the point nearest the pointer, marking that
   * point, and named by `ariaLabel` when one is given. Pointer only. @default true
   */
  readonly tooltip = input(true, { transform: coerceBooleanProperty });

  private readonly svg = viewChild<ElementRef<SVGSVGElement>>('svg');
  private readonly marker = viewChild<ElementRef<HTMLElement>>('marker');

  // Drawn in a 100×40 viewBox — scales smoothly to any CSS size.
  private readonly vbW = 100;
  private readonly vbH = 40;
  private readonly padding = 2;

  /**
   * The data as drawn. Non-finite values are dropped rather than scaled: every
   * `min`/`max` comparison against a NaN is false, so it survived into the scale and
   * `toFixed(2)` wrote the literal text `NaN` into the path `d` — invalid geometry,
   * and the line vanishes. The tooltip reads this list too, so the value it shows is
   * the one under the point it marks.
   */
  private readonly values = computed(() => this.data().filter(v => Number.isFinite(v)));

  /** Mapped `{ x, y }` points for the path. */
  protected readonly points = computed(() => {
    const data = this.values();
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

  /**
   * One tooltip, pointing at the hovered point: above its marker, below it when there
   * is no room. The marker is the anchor element itself, drawn for the point the
   * tooltip reads — it renders before this runs, since both follow `tip.active()`.
   *
   * The chip sits INSIDE the drawing, over the stretch of line above the marker, so the
   * helper is also told which point any spot over the drawing reads: a pointer scrubbing
   * along the top of a sparkline would otherwise land on the chip and stop there.
   */
  protected readonly tip = useChartTooltip(
    this.tooltip,
    index => {
      const value = this.values()[index];
      const marker = this.marker()?.nativeElement;
      if (value === undefined || !marker) return null;
      return {
        datum: { label: this.ariaLabel() ?? undefined, value: String(value), color: this.color() },
        anchor: marker,
      };
    },
    (x, y) => {
      const svg = this.svg()?.nativeElement;
      if (!svg) return null;
      const box = svg.getBoundingClientRect();
      if (x < box.left || x > box.right || y < box.top || y > box.bottom) return null;
      return this.indexAt(x, box);
    }
  );

  /**
   * The marker's place, as percentages of the box the drawing stretches to. An
   * element rather than a `<circle>`: the drawing stretches to any box with
   * `preserveAspectRatio="none"`, which would squash a circle into an ellipse.
   */
  protected readonly markerAt = computed(() => {
    const index = this.tip.active();
    const point = index === null ? undefined : this.points()[index];
    return point ? { x: (point.x / this.vbW) * 100, y: (point.y / this.vbH) * 100 } : null;
  });

  protected onPointerMove(event: MouseEvent): void {
    const index = this.indexAt(event.clientX, (event.currentTarget as Element).getBoundingClientRect());
    if (index !== null) this.tip.enter(index);
  }

  /**
   * The point nearest the pointer, along x only — the points are evenly spaced, so
   * that is a rounding rather than a search. A box with no width (nothing laid out
   * yet) answers nothing rather than a NaN index.
   */
  private indexAt(clientX: number, box: DOMRect): number | null {
    const count = this.points().length;
    if (count === 0 || box.width <= 0) return null;
    if (count === 1) return 0;
    const x = ((clientX - box.left) / box.width) * this.vbW;
    const step = (this.vbW - this.padding * 2) / (count - 1);
    return Math.min(count - 1, Math.max(0, Math.round((x - this.padding) / step)));
  }
}
