/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ElementRef, LOCALE_ID, ViewEncapsulation, computed, inject, input, signal } from '@angular/core';

import { useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { round } from 'ngwr/utils';

import type { WrLineSeries } from './types';

/** How many gaps the y axis aims for. Five labels, four gaps. */
const TICK_COUNT = 4;

/**
 * The smallest 1 / 2 / 2.5 / 5 × 10ⁿ at or above `raw` — the conventional
 * nice-number ladder every plotting library uses to pick an axis step.
 *
 * `2.5` earns its place on the small end: without it a span that wants a step
 * of 2.1 jumps to 5 and the axis loses half its labels.
 */
function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalised = raw / magnitude;
  const nice = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10;
  return nice * magnitude;
}

/**
 * Default series colours, in order.
 *
 * Four intents and the neutral role, and `info` is deliberately absent: it is the
 * same blue as `primary` to every reader (1.061:1 apart in light, 1.004:1 in
 * dark, and the same hue), so two adjacent series would be one series with a
 * seam. The neutral closes the list because it is the one tone here that no
 * intent is near — it used to be the `medium` intent, which v15 removed, and the
 * role resolves to the same step of the gray ramp.
 */
const FALLBACK_COLORS = [
  'var(--wr-color-primary)',
  'var(--wr-color-success)',
  'var(--wr-color-warning)',
  'var(--wr-color-danger)',
  'var(--wr-color-on-surface-muted)',
];

/**
 * Multi-series line chart with axes, gridlines, and a hover tooltip.
 * SVG-only — no external dependency.
 *
 * @example
 * ```html
 * <wr-line-chart
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

  /**
   * Accessible name of the chart. The legend carries the series NAMES only — the numbers
   * are nowhere in text — so without this the plot is nothing at all to a screen reader.
   * Falls back to `lineChart.label`.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'lineChart.label', 'Line chart');

  private readonly locale = inject(LOCALE_ID);
  private readonly thousandsText = useI18nFormatter('lineChart.thousands', '{{value}}k');

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

  /**
   * Show the hover readout: the crosshair, the point markers and the tooltip. Off
   * drops all three, since a crosshair with no values beside it points at nothing.
   * @default true
   */
  readonly tooltip = input(true, { transform: coerceBooleanProperty });

  // Drawn in a 600×300 viewBox with reserved space for axis labels.
  protected readonly vbW = 600;
  protected readonly vbH = 300;
  protected readonly padding = { top: 16, right: 16, bottom: 28, left: 36 } as const;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Hovered point index (across all series) — null when no hover. */
  protected readonly hoveredIndex = signal<number | null>(null);

  /** The hovered index while the readout is on, so turning `tooltip` off mid-hover clears it. */
  protected readonly activeIndex = computed(() => (this.tooltip() ? this.hoveredIndex() : null));

  /**
   * A dash pattern per series, so the lines are told apart by SHAPE and not
   * only by hue.
   *
   * The default palette's colours sit within about 1.06:1 of each other in
   * relative luminance — that is the whole nine-intent scale's constraint, and
   * it means a reader with red-green colour blindness sees several of these
   * strokes as one grey. A legend that pairs a coloured square with a name does
   * not rescue it: matching the square to the line is exactly the step that
   * needs hue. Distinguishing series by dash is the standard remedy and the
   * only one that survives greyscale, printing and a monochrome display.
   *
   * The FIRST entry is solid on purpose. A single-series chart is the common
   * case and there is nothing to tell apart in it, so it is left exactly as it
   * was; the patterns only appear once a second series does.
   */
  private static readonly DASHES = ['', '7 4', '2 3', '10 4 2 4', '1 4', '6 3 2 3'] as const;

  protected readonly resolvedSeries = computed(() =>
    this.series().map((s, i) => ({
      label: s.label,
      dash: WrLineChart.DASHES[i % WrLineChart.DASHES.length],
      // A non-finite point becomes a HOLE at its own index, not a missing element.
      // It cannot stay a number: `Math.min`/`Math.max` over the pooled data are both
      // NaN as soon as one datum is, so every coordinate in EVERY series came out
      // `NaN` — invalid path geometry, and the whole chart vanished rather than the
      // one bad point. But filtering it out closed the gap and slid every LATER point
      // one x-slot to the left, so each of them was drawn under, and reported in the
      // tooltip as, the wrong x label. A gap is kept as a gap and the line is broken
      // across it: interpolating would invent a reading the data never took.
      data: s.data.map(v => (Number.isFinite(v) ? v : null)),
      color: s.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }))
  );

  /**
   * The axis bounds, SNAPPED to a readable step — and the snapping is the point.
   *
   * This used to be "the data's max plus 10%, divided into four", which lands on
   * a round number almost never: seven integers between 3 and 35 gave an axis
   * reading 38.2 / 28.7 / 19.1 / 9.6 / 0. The numbers were right and nobody can
   * read them. A chart's axis is the one part of it a reader is supposed to do
   * arithmetic against.
   *
   * So the step is rounded UP to the nearest 1, 2, 2.5 or 5 times a power of
   * ten — the conventional nice-number ladder — and the bounds are then snapped
   * outward to whole multiples of it. The same 3..35 now reads 0 / 10 / 20 / 30
   * / 40. Snapping outward is what replaces the old 10% padding: the top tick is
   * at or above the data, so the line never touches the frame.
   */
  protected readonly bounds = computed(() => {
    const all = this.resolvedSeries().flatMap(s => s.data.filter(v => v !== null));
    if (all.length === 0) return { min: 0, max: 1, step: 0.25 };
    const rawMin = Math.min(0, Math.min(...all));
    const rawMax = Math.max(...all);
    // A flat series has no span to divide, so give it one rather than a zero step.
    const span = rawMax - rawMin || Math.abs(rawMax) || 1;
    const step = niceStep(span / TICK_COUNT);
    const min = Math.floor(rawMin / step) * step;
    let max = Math.ceil(rawMax / step) * step;
    // The data's peak sitting exactly on the frame reads as clipped, so lift the
    // ceiling by one step when the snap did not already do it.
    if (max === rawMax) max += step;
    return { min, max, step };
  });

  protected readonly pointCount = computed(() => {
    const maxLen = this.resolvedSeries().reduce((acc, s) => Math.max(acc, s.data.length), 0);
    return Math.max(maxLen, this.xLabels().length);
  });

  /**
   * Y-axis tick marks, one per `step` from the top down — so every label is a
   * whole multiple of a readable number rather than a quarter of whatever the
   * data happened to reach.
   */
  protected readonly yTicks = computed(() => {
    const { min, max, step } = this.bounds();
    const out: { value: number; y: number }[] = [];
    // Floating-point: 0.1 + 0.2 walks past an exact bound, so count in integers
    // and multiply, and stop on the count rather than on `value >= min`.
    const count = Math.round((max - min) / step);
    for (let i = 0; i <= count; i++) {
      const value = round(max - i * step, 6);
      out.push({ value, y: this.padding.top + ((max - value) / (max - min)) * this.plotHeight() });
    }
    return out;
  });

  protected readonly plotWidth = (): number => this.vbW - this.padding.left - this.padding.right;
  protected readonly plotHeight = (): number => this.vbH - this.padding.top - this.padding.bottom;

  /**
   * The SVG path for a series — one subpath per unbroken run, so a hole in the data
   * leaves a hole in the line rather than a straight segment across it.
   */
  protected pathFor(series: { data: readonly (number | null)[] }): string {
    const { min, max } = this.bounds();
    const count = this.pointCount();
    if (count <= 1) return '';
    const pw = this.plotWidth();
    const ph = this.plotHeight();

    const commands: string[] = [];
    let run = 0;
    let last = '';
    // A subpath of one `M` is not stroked at all, so a point with a gap on both sides
    // would simply vanish when `showDots` is off. Repeating it gives the round linecap
    // something to paint.
    const closeRun = (): void => {
      if (run === 1) commands.push(`L ${last}`);
      run = 0;
    };

    series.data.forEach((v, i) => {
      if (v === null) {
        closeRun();
        return;
      }
      const x = this.padding.left + (i / (count - 1)) * pw;
      const y = this.padding.top + ((max - v) / (max - min)) * ph;
      last = `${x.toFixed(2)} ${y.toFixed(2)}`;
      commands.push(`${run === 0 ? 'M' : 'L'} ${last}`);
      run++;
    });
    closeRun();

    return commands.join(' ');
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

  /**
   * A point's x as a percentage of the host's width. The x-label strip and the SVG share
   * that width — the drawing stretches to it — so this is the same space the tooltip and
   * the labels are placed in, at any size.
   */
  protected xPercent(index: number): number {
    return (this.pointX(index) / this.vbW) * 100;
  }

  /**
   * How wide an x label may be, as a percentage of the host's width: its own slot — half
   * the distance to a neighbour on each side — cut back to what is left between its point
   * and the end of the strip. Centring a label on its point says nothing about its WIDTH,
   * and with no bound at all twelve month names printed over each other and the last one
   * hung outside the chart. Past this the stylesheet ellipsises.
   */
  protected xMaxPercent(index: number): number {
    const count = this.pointCount();
    // A single label has no neighbour to collide with and the whole strip to sit in.
    if (count <= 1) return 100;
    const slot = (this.plotWidth() / (count - 1) / this.vbW) * 100;
    const x = this.xPercent(index);
    return Math.min(slot, x + slot / 2, 100 - x + slot / 2);
  }

  protected readonly hoverPoints = computed(() => {
    const i = this.activeIndex();
    if (i === null) return [];
    return this.resolvedSeries().flatMap(s => {
      // Past the end of a short series, or on a hole in a longer one — either way there
      // is no reading at this x, so the series contributes neither a marker nor a row.
      const value = s.data[i];
      if (value === undefined || value === null) return [];
      return [{ label: s.label, value, color: s.color, x: this.pointX(i), y: this.pointY(value) }];
    });
  });

  protected readonly hoverLabel = computed(() => {
    const i = this.activeIndex();
    if (i === null) return '';
    return this.xLabels()[i] ?? String(i);
  });

  protected onPointerMove(event: PointerEvent): void {
    if (!this.tooltip()) return;
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

  /**
   * A Y-axis tick, in the reader's own language.
   *
   * Two halves and both were English. The `k` was a hardcoded Latin
   * abbreviation — `тыс.` in Russian — so it goes through the catalog like every
   * other word the library paints. The digits went through `toFixed`, which
   * always writes a full stop, so a German axis read `1.5` where the rest of the
   * page read `1,5`; they go through `Intl` now, the way `wrNumber`, `wrDate`
   * and `wrPlural` already did.
   *
   * Grouping is OFF deliberately: a tick is a short axis label, and `5,000k`
   * would be both wider and a change to what every existing chart draws.
   */
  /**
   * How many fraction digits a tick needs, taken from the STEP rather than from
   * the value.
   *
   * It was a hard `1`, which is right for the common case and wrong below it: a
   * series inside 0..1 steps by 0.25 and the labels came out `1 / 0.8 / 0.5 /
   * 0.3 / 0` — four gaps printed as 0.2, 0.3, 0.2, 0.3 on an axis that is
   * evenly spaced. An axis whose own labels disagree about their spacing is
   * worse than a crowded one.
   */
  private readonly tickDigits = computed(() => {
    const { step } = this.bounds();
    for (let d = 0; d <= 6; d++) if (Math.abs(step * 10 ** d - Math.round(step * 10 ** d)) < 1e-9) return d;
    return 6;
  });

  protected formatTick(v: number): string {
    // A CEILING rather than a fixed count, so trailing zeros are dropped: a
    // 0.25 step wants two digits on 0.25 and none on 1, and `1.00` beside
    // `0.25` reads as spurious precision.
    const digits = (n: number, fraction: number): string =>
      new Intl.NumberFormat(this.locale, {
        useGrouping: false,
        minimumFractionDigits: 0,
        maximumFractionDigits: fraction,
      }).format(n);

    if (Math.abs(v) >= 1000) return this.thousandsText({ value: digits(v / 1000, v % 1000 === 0 ? 0 : 1) });
    return digits(v, this.tickDigits());
  }

  protected readonly viewBox = computed(() => `0 0 ${this.vbW} ${this.vbH}`);

  // Convenience accessor so the host can be referenced from the template.
  protected readonly hostEl = this.host.nativeElement;
}

export type { WrLineSeries } from './types';
