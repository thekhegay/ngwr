/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ElementRef, ViewEncapsulation, computed, inject, input, signal } from '@angular/core';

import type { WrLineSeries } from './interfaces';

const FALLBACK_COLORS = [
  'var(--wr-color-primary)',
  'var(--wr-color-secondary)',
  'var(--wr-color-success)',
  'var(--wr-color-warning)',
  'var(--wr-color-danger)',
];

/**
 * Multi-series line chart with axes, gridlines, and a hover tooltip.
 * SVG-only — no external dependency.
 *
 * @example
 * ```html
 * <wr-lineChart
 *   [series]="[
 *     { label: 'Visits', data: [12, 18, 9, 22, 30, 27, 35] },
 *     { label: 'Signups', data: [3, 5, 4, 8, 11, 9, 14], color: 'var(--wr-color-success)' }
 *   ]"
 *   [xLabels]="['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']"
 * />
 * ```
 *
 * @see https://ngwr.dev/reference/components/line-chart
 */
@Component({
  selector: 'wr-line-chart',
  templateUrl: './line-chart.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-line-chart' },
})
export class WrLineChart {
  readonly series = input<readonly WrLineSeries[]>([]);

  /** Labels for the X axis (one per data point). */
  readonly xLabels = input<readonly string[]>([]);

  /** Chart pixel height. @default 240 */
  readonly height = input(240, { transform: (v: unknown): number => Math.max(80, coerceNumberProperty(v, 240)) });

  /** Show gridlines + axis ticks. @default true */
  readonly showGrid = input(true, { transform: coerceBooleanProperty });

  /** Show the legend above the chart. @default true */
  readonly showLegend = input(true, { transform: coerceBooleanProperty });

  /** Show dots at each data point. @default true */
  readonly showDots = input(true, { transform: coerceBooleanProperty });

  // Drawn in a 600×300 viewBox with reserved space for axis labels.
  protected readonly vbW = 600;
  protected readonly vbH = 300;
  protected readonly padding = { top: 16, right: 16, bottom: 28, left: 36 } as const;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Hovered point index (across all series) — null when no hover. */
  protected readonly hoveredIndex = signal<number | null>(null);

  protected readonly resolvedSeries = computed(() =>
    this.series().map((s, i) => ({
      label: s.label,
      data: s.data,
      color: s.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }))
  );

  protected readonly bounds = computed(() => {
    const all = this.resolvedSeries().flatMap(s => s.data);
    if (all.length === 0) return { min: 0, max: 1 };
    const min = Math.min(...all);
    const max = Math.max(...all);
    if (min === max) return { min: min - 1, max: max + 1 };
    // Pad upper bound by ~10% for breathing room.
    return { min: Math.min(0, min), max: max + (max - min) * 0.1 };
  });

  protected readonly pointCount = computed(() => {
    const maxLen = this.resolvedSeries().reduce((acc, s) => Math.max(acc, s.data.length), 0);
    return Math.max(maxLen, this.xLabels().length);
  });

  /** Y-axis tick marks (5 of them). */
  protected readonly yTicks = computed(() => {
    const { min, max } = this.bounds();
    const step = (max - min) / 4;
    return [0, 1, 2, 3, 4].map(i => {
      const value = max - i * step;
      return { value, y: this.padding.top + ((max - value) / (max - min)) * this.plotHeight() };
    });
  });

  protected readonly plotWidth = (): number => this.vbW - this.padding.left - this.padding.right;
  protected readonly plotHeight = (): number => this.vbH - this.padding.top - this.padding.bottom;

  /** Get the SVG path for a series. */
  protected pathFor(series: { data: readonly number[] }): string {
    const { min, max } = this.bounds();
    const count = this.pointCount();
    if (count <= 1 || series.data.length === 0) return '';
    const pw = this.plotWidth();
    const ph = this.plotHeight();
    return series.data
      .map((v, i) => {
        const x = this.padding.left + (i / (count - 1)) * pw;
        const y = this.padding.top + ((max - v) / (max - min)) * ph;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }

  protected pointX(index: number): number {
    const count = this.pointCount();
    if (count <= 1) return this.padding.left;
    return this.padding.left + (index / (count - 1)) * this.plotWidth();
  }

  protected pointY(value: number): number {
    const { min, max } = this.bounds();
    return this.padding.top + ((max - value) / (max - min)) * this.plotHeight();
  }

  protected readonly hoverPoints = computed(() => {
    const i = this.hoveredIndex();
    if (i === null) return [];
    return this.resolvedSeries()
      .filter(s => i < s.data.length)
      .map(s => ({
        label: s.label,
        value: s.data[i],
        color: s.color,
        x: this.pointX(i),
        y: this.pointY(s.data[i]),
      }));
  });

  protected readonly hoverLabel = computed(() => {
    const i = this.hoveredIndex();
    if (i === null) return '';
    return this.xLabels()[i] ?? String(i);
  });

  protected onPointerMove(event: PointerEvent): void {
    const svg = (event.currentTarget as SVGElement).getBoundingClientRect();
    const ratio = (event.clientX - svg.left) / svg.width;
    const vbX = ratio * this.vbW;
    const count = this.pointCount();
    if (count === 0) return;
    const i = Math.round(((vbX - this.padding.left) / this.plotWidth()) * (count - 1));
    if (i >= 0 && i < count) this.hoveredIndex.set(i);
  }

  protected onPointerLeave(): void {
    this.hoveredIndex.set(null);
  }

  protected formatTick(v: number): string {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
    return v.toFixed(v % 1 === 0 ? 0 : 1);
  }

  protected readonly viewBox = computed(() => `0 0 ${this.vbW} ${this.vbH}`);

  // Convenience accessor so the host can be referenced from the template.
  protected readonly hostEl = this.host.nativeElement;
}

export type { WrLineSeries } from './interfaces';
