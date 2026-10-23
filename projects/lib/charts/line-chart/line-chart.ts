/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { DOCUMENT } from '@angular/common';
import {
  Component,
  type ElementRef,
  LOCALE_ID,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import { clamp, round } from 'ngwr/utils';

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

/** The fewest fraction digits that write `value` exactly, up to six. */
function fractionDigits(value: number): number {
  for (let d = 0; d <= 6; d++) if (Math.abs(value * 10 ** d - Math.round(value * 10 ** d)) < 1e-9) return d;
  return 6;
}

/** The power of ten of `value`'s leading digit: 2 for 750, -2 for 0.025. */
function magnitude(value: number): number {
  const abs = Math.abs(value);
  let m = Math.floor(Math.log10(abs));
  // `log10` is a float: guard the exact powers of ten from landing one off.
  if (10 ** (m + 1) <= abs) m++;
  if (10 ** m > abs) m--;
  return m;
}

/**
 * The power of ten of `step`'s LAST significant digit: 1 for 250, -1 for 2.5. Every tick
 * is a whole multiple of the step, so no tick has a digit below it, and a tick written to
 * that digit is written exactly.
 */
function lastDigit(step: number): number {
  for (let e = magnitude(step); e > -21; e--) {
    const scaled = step / 10 ** e;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-6) return e;
  }
  return -21;
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
 * @see https://ngwr.dev/charts/line-chart
 */
@Component({
  selector: 'wr-line-chart',
  templateUrl: './line-chart.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-line-chart' },
})
export class WrLineChart {
  /**
   * One entry per line. A series with no `color` takes the next entry from the
   * chart's fallback palette, so several lines are distinguishable unconfigured.
   */
  readonly series = input<readonly WrLineSeries[]>([]);

  /**
   * Accessible name of the chart. The legend carries the series NAMES only — the numbers
   * are nowhere in text — so without this the plot is nothing at all to a screen reader.
   * Falls back to `lineChart.label`.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'lineChart.label', 'Line chart');

  /**
   * Writes every number the chart shows: the y-axis ticks and the tooltip values.
   * `null` uses `Intl.NumberFormat` in `LOCALE_ID`, with compact ticks (`1.2K`, `3.4M`)
   * unless the full numbers are shorter.
   */
  readonly valueFormat = input<((value: number) => string) | null>(null);

  private readonly locale = inject(LOCALE_ID);
  private readonly numbers = new Intl.NumberFormat(this.locale);
  /**
   * Below one, by significant digits rather than the default three fraction digits,
   * which round a reading of 0.0004 to `0`.
   */
  private readonly smallNumbers = new Intl.NumberFormat(this.locale, { maximumSignificantDigits: 3 });

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

  /**
   * Drawn edge to edge in a 600×300 viewBox that stretches to the plot. Nothing in it is
   * text: the tick labels used to be `<text>` in here, and with
   * `preserveAspectRatio="none"` a glyph stretches with the drawing, while the 36 units
   * kept for them at the left were a different width in pixels at every size. They are
   * HTML beside the drawing now, in a gutter as wide as its longest label, and the space
   * round the lines is CSS padding on the plot.
   */
  protected readonly vbW = 600;
  protected readonly vbH = 300;

  private readonly svg = viewChild.required<ElementRef<SVGSVGElement>>('svg');

  /** Hovered point index (across all series) — null when no hover. */
  protected readonly hoveredIndex = signal<number | null>(null);

  /** The hovered index while the readout is on, so turning `tooltip` off mid-hover clears it. */
  protected readonly activeIndex = computed(() => (this.tooltip() ? this.hoveredIndex() : null));

  /**
   * The index Escape dismissed. It stays shut while the pointer stays on that point —
   * WCAG 1.4.13 asks for dismissal WITHOUT moving the pointer, and every `mousemove`
   * re-reports the point, so a plain close would reopen on the next pixel. The rule
   * the shared chart tooltip follows for the other charts.
   */
  private dismissed: number | null = null;

  constructor() {
    // Escape closes the readout wherever focus is, the way it closes every other
    // chart's: nothing in the readout can take focus, so a key handler on the chart
    // would never hear it. Listened for only while the readout is up, which is never
    // on the server.
    const document = inject(DOCUMENT);
    effect(onCleanup => {
      if (this.activeIndex() === null) return;
      const onKeydown = (event: KeyboardEvent): void => {
        if (event.key !== 'Escape') return;
        this.dismissed = this.hoveredIndex();
        this.hoveredIndex.set(null);
      };
      document.addEventListener('keydown', onKeydown);
      onCleanup(() => document.removeEventListener('keydown', onKeydown));
    });
  }

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
      out.push({ value, y: ((max - value) / (max - min)) * this.vbH });
    }
    return out;
  });

  /**
   * The SVG path for a series — one subpath per unbroken run, so a hole in the data
   * leaves a hole in the line rather than a straight segment across it.
   */
  protected pathFor(series: { data: readonly (number | null)[] }): string {
    const { min, max } = this.bounds();
    const count = this.pointCount();
    if (count <= 1) return '';

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
      const x = (i / (count - 1)) * this.vbW;
      const y = ((max - v) / (max - min)) * this.vbH;
      last = `${x.toFixed(2)} ${y.toFixed(2)}`;
      commands.push(`${run === 0 ? 'M' : 'L'} ${last}`);
      run++;
    });
    closeRun();

    return commands.join(' ');
  }

  /** A point's x in the viewBox — a lone point in the middle, as the sparkline draws one. */
  protected pointX(index: number): number {
    const count = this.pointCount();
    if (count <= 1) return this.vbW / 2;
    return (index / (count - 1)) * this.vbW;
  }

  protected pointY(value: number): number {
    const { min, max } = this.bounds();
    return ((max - value) / (max - min)) * this.vbH;
  }

  /**
   * A point's x as a percentage of the drawing's width, which the SVG stretches to. The
   * x labels and the tooltip are placed with it, in a box as wide as the plot: the
   * stylesheet adds the plot's inline padding, so they land on the point at any size.
   */
  protected xPercent(index: number): number {
    return (this.pointX(index) / this.vbW) * 100;
  }

  /**
   * How far apart two neighbouring points are, as a percentage of the drawing's width —
   * the room each x label has, half on either side of its point. The stylesheet bounds a
   * label to it, cut back at the ends of the strip, and ellipsises past that. Centring a
   * label on its point says nothing about its WIDTH, and with no bound at all twelve
   * month names printed over each other and the last one hung outside the chart.
   */
  protected readonly xSlot = computed(() => {
    const count = this.pointCount();
    // A single label has no neighbour to collide with and the whole strip to sit in.
    return count <= 1 ? 100 : 100 / (count - 1);
  });

  protected readonly hoverPoints = computed(() => {
    const i = this.activeIndex();
    if (i === null) return [];
    return this.resolvedSeries().flatMap(s => {
      // Past the end of a short series, or on a hole in a longer one — either way there
      // is no reading at this x, so the series contributes neither a marker nor a row.
      const value = s.data[i];
      if (value === undefined || value === null) return [];
      const text = this.formatValue(value);
      return [{ label: s.label, value, text, color: s.color, x: this.pointX(i), y: this.pointY(value) }];
    });
  });

  protected readonly hoverLabel = computed(() => {
    const i = this.activeIndex();
    if (i === null) return '';
    return this.xLabels()[i] ?? String(i);
  });

  /**
   * The point under the pointer. A MOUSE event, as the sparkline's is: a tap fires
   * `pointerdown`, `pointerup` and `pointerleave` and no `pointermove`, then the
   * compatibility `mousemove`, so a `pointermove` listener never opened the readout on
   * a phone and the `pointerleave` closed whatever it had. Every other chart opens on
   * the compatibility events a tap fires.
   *
   * Heard on the whole plot and measured against the drawing inside it. The drawing
   * runs edge to edge, so the first and last dots overhang it into the plot's padding;
   * listening on the drawing alone closed the readout on the outer half of either dot.
   * Over the padding the nearest point is the end one, so the index is clamped.
   */
  protected onPointerMove(event: MouseEvent): void {
    if (!this.tooltip()) return;
    const count = this.pointCount();
    const box = this.svg().nativeElement.getBoundingClientRect();
    if (count === 0 || box.width <= 0) return;
    const ratio = (event.clientX - box.left) / box.width;
    const i = count === 1 ? 0 : clamp(Math.round(ratio * (count - 1)), 0, count - 1);
    if (i === this.dismissed) return;
    this.dismissed = null;
    this.hoveredIndex.set(i);
  }

  protected onPointerLeave(): void {
    this.dismissed = null;
    this.hoveredIndex.set(null);
  }

  /** A zero-length line at a point, which a round cap paints as a dot. */
  protected dotPath(x: number, y: number): string {
    return `M ${x.toFixed(2)} ${y.toFixed(2)} h 0`;
  }

  /**
   * A reading as the tooltip writes it: `valueFormat` when one is given, else
   * `Intl.NumberFormat` in `LOCALE_ID` — never compact, since the tooltip is where a
   * reader goes for the exact figure the axis rounds.
   */
  private formatValue(value: number): string {
    const custom = this.valueFormat();
    if (custom) return custom(value);
    return (value !== 0 && Math.abs(value) < 1 ? this.smallNumbers : this.numbers).format(value);
  }

  /**
   * The y-axis labels, top to bottom, in the reader's own language — and decided for
   * the AXIS, not one tick at a time.
   *
   * Compact, through `Intl` (`1.2K`, `3.4M`, `4 Mio.`, `5 тыс.`): the abbreviation used
   * to be a `k` from the catalog beside digits from `Intl`, which no locale's own
   * convention matched past the thousands, and `Intl` knows each one's units — German
   * abbreviates no thousands at all, Japanese counts in ten-thousands.
   *
   * Each tick gets exactly the significant digits the STEP needs: down to the step's last
   * digit, and no further. A fixed count cannot be right at every magnitude — one
   * fraction digit printed 1250 beside 1000 as `1.3k` and `1k` on an axis stepping by
   * 250, and -1000 and -1025 as `-1k` twice on one stepping by 25. A hard `1` below the
   * thousands printed a 0.25 step as 0.2, 0.3, 0.2, 0.3.
   *
   * And when abbreviating would make the labels LONGER — a fine step on large numbers,
   * where `-1.025K` is wider than `-1,025` — the whole axis is written in full instead, so
   * no axis mixes `-1K` with `-1,025`. Grouping is the locale's.
   */
  protected readonly tickLabels = computed<readonly string[]>(() => {
    const ticks = this.yTicks();
    const custom = this.valueFormat();
    if (custom) return ticks.map(tick => custom(tick.value));

    const { step } = this.bounds();
    const last = lastDigit(step);
    // A CEILING rather than a fixed count, so trailing zeros are dropped: a 0.25 step
    // wants two digits on 0.25 and none on 1, and `1.00` beside `0.25` reads as spurious
    // precision.
    const full = new Intl.NumberFormat(this.locale, { maximumFractionDigits: fractionDigits(step) });
    const plain = ticks.map(tick => full.format(tick.value));
    const compact = ticks.map(({ value }) =>
      value === 0
        ? full.format(0)
        : new Intl.NumberFormat(this.locale, {
            notation: 'compact',
            maximumSignificantDigits: clamp(magnitude(value) - last + 1, 1, 21),
          }).format(value)
    );
    const longest = (labels: readonly string[]): number => Math.max(...labels.map(label => label.length));
    return longest(compact) <= longest(plain) ? compact : plain;
  });

  /**
   * Each y label beside the y of its gridline, as a percentage of the drawing's height.
   * The stylesheet places a label from that number inside the plot's block padding, the
   * way the x labels are placed from `xPercent`, so a label meets its line at any height
   * whatever the labels around it measure.
   */
  protected readonly yAxis = computed(() => {
    const labels = this.tickLabels();
    return this.yTicks().map((tick, i) => ({ label: labels[i], y: (tick.y / this.vbH) * 100 }));
  });

  protected readonly viewBox = computed(() => `0 0 ${this.vbW} ${this.vbH}`);
}

export type { WrLineSeries } from './types';
