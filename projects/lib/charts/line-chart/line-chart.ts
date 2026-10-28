/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  type ElementRef,
  LOCALE_ID,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { WR_CHART_LEGEND_BLOCK, WrChartLegend, type WrChartLegendItem } from 'ngwr/charts/chart-legend';
import {
  WrChartTable,
  type WrChartTableData,
  chartAxis,
  chartColor,
  chartDash,
  useChartNumbers,
} from 'ngwr/charts/core';
import { useI18nText } from 'ngwr/i18n';
import { clamp } from 'ngwr/utils';

import type { WrLineSeries } from './types';

/**
 * The drawing's width in CSS px, assumed until a browser has measured it: what the server
 * and the first paint thin the x labels against.
 */
const ASSUMED_WIDTH = 560;

/** The plot's inline padding in CSS px — `--wr-line-chart-plot-inset-x` — until measured. */
const ASSUMED_INSET = 16;

/** How wide a character of an x label is taken to be, in CSS px, before a browser has measured the widest. */
const CHAR_WIDTH = 7;

/** The least room between two printed x labels, in CSS px. */
const LABEL_GAP = 8;

/** The hover marker's radius in CSS px: half the 12px stroke its ring is drawn with. */
const HOVER_RADIUS = 6;

/**
 * How far a readout set beside the crosshair (`--left` / `--right`) keeps from it, in CSS
 * px: the marker's radius and as much again. The stylesheet's `$beside`.
 */
const BESIDE = 12;

/**
 * Where the readout sits: over the crosshair at the top of the plot, over it at the bottom,
 * or at the top beside it on either side. Physical, as the drawing's own x is.
 */
type TooltipPlacement = 'top' | 'below' | 'left' | 'right';

/** What a browser measured, in CSS px: the drawing's width, the plot's inline padding and the widest x label. */
interface Measured {
  readonly width: number;
  readonly inset: number;
  readonly label: number;
}

/** A series as it is drawn: `tops` is what each x is plotted at, `bases` where its band starts under `stacked`. */
interface PlottedSeries {
  readonly index: number;
  readonly label: string;
  readonly dash: string;
  readonly color: string;
  readonly data: readonly (number | null)[];
  readonly tops: readonly (number | null)[];
  readonly bases: readonly (number | null)[] | null;
}

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
 * The legend is a `ul[wr-chart-legend]` (`ngwr/charts/chart-legend`), and with
 * `toggleableLegend` its rows show and hide their series through `hiddenSeries`.
 *
 * An AREA chart is this one with `showArea`, which fills under every line down to
 * zero, and `stacked` piles the series on each other so the top line reads the total:
 *
 * ```html
 * <wr-line-chart [series]="series" [xLabels]="labels" showArea stacked />
 * ```
 *
 * The x labels are printed every one while the widest fits between two points, and every
 * n-th otherwise, so a long axis keeps whole labels rather than a row of ellipses; the
 * tooltip and the data table name every x. The drawing keeps time running left to right
 * under RTL, as every SVG chart here does; the y labels move to the right of it.
 *
 * @see https://ngwr.dev/charts/line-chart
 */
@Component({
  selector: 'wr-line-chart',
  templateUrl: './line-chart.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-line-chart',
    '[class.wr-line-chart--area]': 'showArea()',
    '[class.wr-line-chart--stacked]': 'stacked()',
  },
  imports: [WrChartLegend, WrChartTable],
  // The legend's rows keep the classes this chart drew before it drew them through
  // `WrChartLegend`: `.wr-line-chart__legend-item`, `__swatch` and `__legend-label`.
  viewProviders: [{ provide: WR_CHART_LEGEND_BLOCK, useValue: 'wr-line-chart' }],
})
export class WrLineChart {
  /**
   * One entry per line. A series with no `color` takes the next entry from the
   * chart's fallback palette, so several lines are distinguishable unconfigured.
   */
  readonly series = input<readonly WrLineSeries[]>([]);

  /**
   * Accessible name of the chart. The legend carries the series NAMES only — the numbers
   * are nowhere in text unless `dataTable` puts them there — so without this the plot is
   * nothing at all to a screen reader. Falls back to `lineChart.label`, or to
   * `lineChart.areaLabel` with `showArea`.
   */
  readonly ariaLabel = input<string | null>(null);

  private readonly lineLabel = useI18nText(this.ariaLabel, 'lineChart.label', 'Line chart');
  private readonly areaLabel = useI18nText(this.ariaLabel, 'lineChart.areaLabel', 'Area chart');

  /** The plot's name, which the data table takes as its caption. */
  protected readonly resolvedAriaLabel = computed(() => (this.showArea() ? this.areaLabel() : this.lineLabel()));

  /**
   * Writes every number the chart shows: the y-axis ticks and the tooltip values.
   * `null` uses `Intl.NumberFormat` in `LOCALE_ID`, with compact ticks (`1.2K`, `3.4M`)
   * unless the full numbers are shorter.
   */
  readonly valueFormat = input<((value: number) => string) | null>(null);

  /** The tooltip's exact figures and the axis' compact ticks, in `LOCALE_ID` unless `valueFormat` is given. */
  private readonly numbers = useChartNumbers(this.valueFormat);

  /**
   * Labels for the X axis (one per data point). Printed every one while the widest fits
   * between two points, and every n-th otherwise. An x past the end of this list is named
   * by its position, counting from 1, in `LOCALE_ID`'s digits, in the tooltip and the data
   * table.
   */
  readonly xLabels = input<readonly string[]>([]);

  /** Chart pixel height. @default 240 */
  readonly height = input(240, { transform: (v: unknown): number => Math.max(80, coerceNumberProperty(v, 240)) });

  /** Show gridlines + axis ticks. @default true */
  readonly showGrid = input(true, { transform: coerceBooleanProperty });

  /** Show the legend above the chart. @default true */
  readonly showLegend = input(true, { transform: coerceBooleanProperty });

  /**
   * Make each legend row a toggle button that shows and hides its series, through
   * `hiddenSeries`. A row is a `<button aria-pressed>`, pressed while its series is
   * shown, so the legend becomes one tab stop per series. @default false
   */
  readonly toggleableLegend = input(false, { transform: coerceBooleanProperty });

  /**
   * The positions in `series` of the series that are hidden. Positions rather than
   * labels, since two series may share a label. A toggleable legend writes it, and a
   * host may bind it with or without one: `[(hiddenSeries)]`.
   *
   * A hidden series is left out of everything that reads its values. It draws no line
   * and no dots, it has no row or ring in the tooltip, and the y axis is fitted to the
   * series still shown, so hiding a large series lets the small ones fill the plot. The
   * x axis does not change, because its length belongs to the chart (`xLabels`) rather
   * than to one series, and the lines still shown keep their positions. The legend keeps
   * the hidden series' row, struck through, so it can be shown again; the row says
   * "hidden" to a screen reader as well, through `aria-pressed` on a toggle and a
   * visually hidden word otherwise. With every series
   * hidden the plot is the empty 0 to 1 frame. A position past the end of `series` is
   * kept and ignored.
   */
  readonly hiddenSeries = model<readonly number[]>([]);

  /** Show dots at each data point. @default true */
  readonly showDots = input(true, { transform: coerceBooleanProperty });

  /**
   * Fill the space under each line, down to zero, which makes this an area chart.
   *
   * Each unbroken run of a series is one fill (`.wr-line-chart__area`) in the series'
   * colour at `--wr-line-chart-area-opacity`. A hole in the data breaks the fill as it
   * breaks the line, and a lone point between two holes has nothing to fill. Every fill
   * is drawn under every line, so the lines and their dashes stay on top and the series
   * are still told apart by shape where the fills overlap. The y axis takes zero in,
   * since the fills reach it: an all-negative series fills up to a zero at the top of
   * the plot. The plot's name falls back to `lineChart.areaLabel`. @default false
   */
  readonly showArea = input(false, { transform: coerceBooleanProperty });

  /**
   * Stack the series on each other in order, so at every x each series is drawn on top
   * of the ones before it and the top line reads the total.
   *
   * Positive values stack up from zero and negative values stack down from it, each sign
   * on its own, so no band crosses another at a point. A hole, or the missing end of a
   * shorter series, adds nothing to the stack and breaks that series' own line. The
   * lines, the dots, the hover markers and the y axis follow the stacked tops; the
   * tooltip and the data table keep each series' own value, which is the figure a reader
   * asks for. A series hidden through `hiddenSeries` leaves the stack. With `showArea`
   * each band fills from the series below to its own line, and the fill is stronger,
   * since the bands do not overlap. @default false
   */
  readonly stacked = input(false, { transform: coerceBooleanProperty });

  /**
   * Render the chart's figures as a table that only assistive technology reaches: a row
   * per x, headed by its x label, and a column per series shown, every value written the
   * way the tooltip writes it. A hole is an empty cell.
   *
   * The plot is one named `role="img"`, which hides everything inside it, so without
   * the table the numbers are nowhere a screen reader can walk. It is rendered beside
   * the plot, clipped to nothing: it takes no room, draws nothing and holds no tab stop.
   * A stacked chart's table keeps each series' own values, and a hidden series leaves
   * it. @default false
   */
  readonly dataTable = input(false, { transform: coerceBooleanProperty });

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

  private readonly plot = viewChild.required<ElementRef<HTMLElement>>('plot');

  private readonly probe = viewChild<ElementRef<HTMLElement>>('probe');

  private readonly tooltipEl = viewChild<ElementRef<HTMLElement>>('tooltip');

  /** An x with no label of its own, by its position from 1 in the reader's own digits. */
  private readonly ordinals = new Intl.NumberFormat(inject(LOCALE_ID));

  /** What a browser measured, once it has: `null` on the server and until the first render. */
  private readonly measured = signal<Measured | null>(null);

  /**
   * Where the readout sits (see `placeTooltip`): at the top of the plot unless that covers
   * a marker it reads. Decided in a browser, from the readout's own size, each time the
   * hovered x changes.
   */
  protected readonly tooltipPlacement = signal<TooltipPlacement>('top');

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

    // Measured after render, in a browser: the drawing's width and the widest x label,
    // which decide how many labels print, and the readout's height, which decides where it
    // sits. Never on the server, which thins the labels against `ASSUMED_WIDTH`.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const destroyRef = inject(DestroyRef);

    afterRenderEffect(() => {
      this.probeText();
      untracked(() => this.measure());
    });

    afterRenderEffect(() => {
      const points = this.hoverPoints();
      const tooltip = this.tooltipEl()?.nativeElement;
      if (points.length === 0 || !tooltip) return;
      untracked(() => this.placeTooltip(points, tooltip));
    });

    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => this.measure());
      observer.observe(this.svg().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /**
   * Every series, resolved: its palette colour, its dash (`chartDash`, so the lines are
   * told apart by shape and not only by hue, the first one solid) and its data with a
   * HOLE at each non-finite point. Hidden ones included, since the legend lists them.
   *
   * A non-finite point becomes a hole at its own index, not a missing element. It
   * cannot stay a number: `Math.min` and `Math.max` over the pooled data are both NaN
   * as soon as one datum is, so every coordinate in EVERY series came out `NaN`, which
   * is invalid path geometry, and the whole chart vanished rather than the one bad
   * point. But filtering it out closed the gap and slid every LATER point one x-slot to
   * the left, so each of them was drawn under, and reported in the tooltip as, the
   * wrong x label. A gap is kept as a gap and the line is broken across it:
   * interpolating would invent a reading the data never took.
   */
  protected readonly resolvedSeries = computed(() =>
    this.series().map((s, i) => ({
      index: i,
      label: s.label,
      dash: chartDash(i),
      data: s.data.map(v => (typeof v === 'number' && Number.isFinite(v) ? v : null)),
      color: s.color ?? chartColor(i),
    }))
  );

  /** The legend's rows: every series, keyed by its own dash. */
  protected readonly legendItems = computed<readonly WrChartLegendItem[]>(() =>
    this.resolvedSeries().map(({ label, color, dash }) => ({ label, color, dash }))
  );

  /** The series drawn, read and fitted to: every one `hiddenSeries` does not name. */
  protected readonly visibleSeries = computed(() => {
    const hidden = new Set(this.hiddenSeries());
    return this.resolvedSeries().filter(s => !hidden.has(s.index));
  });

  /**
   * The series drawn, each with the value it is PLOTTED at for every x. That is its own
   * value, except under `stacked`, where it is the top of its band, and `bases` holds
   * where the band starts: zero, or the top of the last series before it on the same
   * side of zero. Positive values pile up and negative ones pile down, each sign on its
   * own, so two bands never cross at a point. A hole stays a hole and adds nothing.
   */
  protected readonly plottedSeries = computed<readonly PlottedSeries[]>(() => {
    const visible = this.visibleSeries();
    if (!this.stacked()) return visible.map(s => ({ ...s, tops: s.data, bases: null }));

    // Indexed by x, and sparse: an x no series has reached yet starts from zero.
    const up: number[] = [];
    const down: number[] = [];
    return visible.map(s => {
      const tops: (number | null)[] = [];
      const bases: (number | null)[] = [];
      s.data.forEach((v, i) => {
        if (v === null) {
          tops.push(null);
          bases.push(null);
          return;
        }
        const pile = v < 0 ? down : up;
        const base = pile[i] ?? 0;
        pile[i] = base + v;
        bases.push(base);
        tops.push(base + v);
      });
      return { ...s, tops, bases };
    });
  });

  /**
   * The y axis, from `chartAxis`, over what is plotted for the series still shown. It
   * floors at zero and never lifts to zero from below, so an all-negative series keeps
   * an axis that ends just above its peak, and it snaps to a readable step: seven
   * integers between 3 and 35 read 0 / 10 / 20 / 30 / 40, where "the data's max plus
   * 10%, divided into four" read 38.2 / 28.7 / 19.1 / 9.6 / 0. With nothing to fit, it is
   * the empty 0 to 1 frame.
   *
   * With `showArea` or `stacked` it takes zero in on either side instead: zero is the
   * baseline a fill reaches and the floor a stack starts from, so an axis that stopped
   * short of it would cut the fills off and misstate every band.
   */
  protected readonly bounds = computed(() => {
    // A loop rather than `Math.min(...values)`: a spread of every plotted value overflows
    // the stack past about 125k of them, and the chart rendered nothing at all.
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const s of this.plottedSeries()) {
      for (const v of s.tops) {
        if (v === null) continue;
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    if (min > max) return chartAxis(Number.NaN, Number.NaN);
    if (this.showArea() || this.stacked()) return chartAxis(min, max, { includeZero: true });
    return chartAxis(Math.min(0, min), max);
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
    const { min, max, ticks } = this.bounds();
    return ticks.map(value => ({ value, y: ((max - value) / (max - min)) * this.vbH }));
  });

  /**
   * The SVG path for a series' plotted values — one subpath per unbroken run, so a hole
   * in the data leaves a hole in the line rather than a straight segment across it.
   */
  protected pathFor(values: readonly (number | null)[]): string {
    const { min, max } = this.bounds();

    const commands: string[] = [];
    let run = 0;
    let last = '';
    // A subpath of one `M` is not stroked at all, so a point with a gap on both sides —
    // or the only point of a one-point chart — would simply vanish when `showDots` is off.
    // Repeating it gives the round linecap something to paint.
    const closeRun = (): void => {
      if (run === 1) commands.push(`L ${last}`);
      run = 0;
    };

    values.forEach((v, i) => {
      if (v === null) {
        closeRun();
        return;
      }
      const x = this.pointX(i);
      const y = ((max - v) / (max - min)) * this.vbH;
      last = `${x.toFixed(2)} ${y.toFixed(2)}`;
      commands.push(`${run === 0 ? 'M' : 'L'} ${last}`);
      run++;
    });
    closeRun();

    return commands.join(' ');
  }

  /**
   * Every series shown as the template draws it: its line's path, and with `showDots` a
   * dot's path per x, `null` on a hole. Built once per change to the data or the axis, so
   * moving the pointer from x to x, which re-renders the hover layer, rebuilds no path.
   */
  protected readonly drawn = computed(() => {
    const dots = this.showDots();
    return this.plottedSeries().map(s => ({
      index: s.index,
      color: s.color,
      dash: s.dash,
      d: this.pathFor(s.tops),
      dots: dots ? s.tops.map((v, i) => (v === null ? null : this.dotPath(this.pointX(i), this.pointY(v)))) : [],
    }));
  });

  /**
   * The fills under the lines with `showArea`: one per unbroken run of two points or
   * more, from the line down to zero, or down to the top of the band below under
   * `stacked`. A run of one point has no width to fill. Keyed by the series' position
   * and the run's first x, so a run that moves is a new fill.
   */
  protected readonly areas = computed(() => {
    if (!this.showArea() || this.pointCount() <= 1) return [];
    return this.plottedSeries().flatMap(s => {
      const fills: { key: string; color: string; d: string }[] = [];
      let start = -1;
      const close = (end: number): void => {
        if (start >= 0 && end - start >= 2) {
          fills.push({ key: `${s.index}:${start}`, color: s.color, d: this.areaPath(s, start, end) });
        }
        start = -1;
      };
      s.tops.forEach((v, i) => {
        if (v === null) close(i);
        else if (start < 0) start = i;
      });
      close(s.tops.length);
      return fills;
    });
  });

  /** One fill: along the run's plotted values, then back along its base, from `start` up to `end`. */
  private areaPath(series: PlottedSeries, start: number, end: number): string {
    const at = (i: number, value: number): string => `${this.pointX(i).toFixed(2)} ${this.pointY(value).toFixed(2)}`;
    const commands: string[] = [];
    for (let i = start; i < end; i++) commands.push(`${i === start ? 'M' : 'L'} ${at(i, series.tops[i] ?? 0)}`);
    for (let i = end - 1; i >= start; i--) commands.push(`L ${at(i, series.bases?.[i] ?? 0)}`);
    commands.push('Z');
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
   * How far apart two neighbouring printed labels are, as a percentage of the drawing's
   * width — the room each x label has, half on either side of its point: the distance
   * between two points times the step `xAxis` prints at. The stylesheet bounds a label to
   * it, cut back at the ends of the strip, and ellipsises past that. Centring a label on its
   * point says nothing about its WIDTH, and with no bound at all twelve month names printed
   * over each other and the last one hung outside the chart.
   */
  protected readonly xSlot = computed(() => {
    const count = this.pointCount();
    // A single label has no neighbour to collide with and the whole strip to sit in.
    return count <= 1 ? 100 : Math.min(100, (100 * this.xAxis().every) / (count - 1));
  });

  /**
   * Every x label once, a line each: the hidden copy the labels' room is measured against.
   * Laid out as wide as its widest line, so it measures the widest label rather than the
   * one with the most characters — `WWWWW` is wider than `iiiiiii`.
   */
  protected readonly probeText = computed(() =>
    [...new Set(this.xLabels().map(label => label.replace(/\r\n?|\n/g, ' ')))].join('\n')
  );

  /**
   * Which x labels print. Every one while the widest label and a gap fit between two
   * points, as before there was any thinning; otherwise every `every`-th from the first,
   * the smallest step whose labels keep that gap — the first label included, which the
   * strip's start moves inwards when it is wider than the room before its point — and the
   * last one printed is left out if moving it inwards from the strip's end brings it
   * within the gap of the one before. The step is decided in a browser from the widest
   * label as laid out and the drawing's width, and against `ASSUMED_WIDTH` and seven
   * pixels a character before that, so the server thins a long axis too.
   *
   * Only the printed labels render: a label laid out and hidden still costs its share of
   * every resize.
   */
  protected readonly xAxis = computed(() => {
    const labels = this.xLabels();
    const count = this.pointCount();
    const measured = this.measured();
    const width = measured?.width ?? ASSUMED_WIDTH;
    const inset = measured?.inset ?? ASSUMED_INSET;
    const strip = width + 2 * inset;
    const longest = labels.reduce((most, label) => Math.max(most, label.length), 0);
    const label = Math.min(measured && measured.label > 0 ? measured.label : longest * CHAR_WIDTH, strip);
    const step = count <= 1 ? strip : width / (count - 1);
    /** Where a printed label's box starts, in px from the strip's start: centred on its point, moved in at either end. */
    const start = (index: number): number =>
      clamp(inset + this.pointX(index) * (width / this.vbW) - label / 2, 0, strip - label);
    // A hair of slack on every comparison, so the regular spacing never fails on a rounding.
    const crowds = (from: number, previousEnd: number): boolean => from + 1e-6 < previousEnd + LABEL_GAP;

    let every = count <= 1 ? 1 : Math.max(1, Math.ceil((label + LABEL_GAP - 1e-6) / step));
    while (every < labels.length - 1 && crowds(start(every), start(0) + label)) every++;

    const ticks: { readonly index: number; readonly label: string; readonly x: number }[] = [];
    let end = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < labels.length; index += every) {
      const from = start(index);
      if (every > 1 && crowds(from, end)) break;
      ticks.push({ index, label: labels[index], x: this.xPercent(index) });
      end = from + label;
    }
    return { every, ticks };
  });

  /**
   * The hovered x's readings, one per series shown that has one. Each marker sits where
   * the series is drawn, which under `stacked` is the top of its band, while the row
   * reads the series' own value.
   */
  protected readonly hoverPoints = computed(() => {
    const i = this.activeIndex();
    if (i === null) return [];
    return this.plottedSeries().flatMap(s => {
      // Past the end of a short series, or on a hole in a longer one — either way there
      // is no reading at this x, so the series contributes neither a marker nor a row.
      const value = s.data[i];
      const plotted = s.tops[i];
      if (value === undefined || value === null || plotted === undefined || plotted === null) return [];
      const text = this.numbers.value(value);
      return [
        { index: s.index, label: s.label, value, text, color: s.color, x: this.pointX(i), y: this.pointY(plotted) },
      ];
    });
  });

  protected readonly hoverLabel = computed(() => {
    const i = this.activeIndex();
    if (i === null) return '';
    return this.xLabels()[i] ?? this.ordinals.format(i + 1);
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
   * Read the drawing's width, the plot's inline padding and the widest x label off the
   * layout. A hidden chart measures 0 and keeps its last reading rather than thin to
   * nothing; with no label to measure the estimate stays in charge.
   */
  private measure(): void {
    const box = this.svg().nativeElement.getBoundingClientRect();
    if (box.width <= 0) return;
    const inset = box.left - this.plot().nativeElement.getBoundingClientRect().left;
    const label = this.probe()?.nativeElement.getBoundingClientRect().width ?? 0;
    const last = this.measured();
    if (last?.width === box.width && last.inset === inset && last.label === label) return;
    this.measured.set({ width: box.width, inset, label });
  }

  /**
   * Place the readout clear of the markers it reads. Over the crosshair at the top of the
   * plot, as it always sat, while that covers none of them; else at the bottom, while that
   * covers none; else beside the crosshair at the top, on the side with more room, which
   * covers none of them as long as it fits there — every marker is on the crosshair. Where
   * each covers some, the one that covers fewest, in that order on a tie.
   *
   * Every candidate is worked out from the readout's own size and from how far inside the
   * drawing's edge it sits, which is the same at the top and, moved below, at the bottom —
   * so the choice never depends on where it is now, and settles in one pass.
   */
  private placeTooltip(points: readonly { readonly x: number; readonly y: number }[], tooltip: HTMLElement): void {
    const box = this.svg().nativeElement.getBoundingClientRect();
    const plot = this.plot().nativeElement.getBoundingClientRect();
    const rect = tooltip.getBoundingClientRect();
    if (box.height <= 0 || rect.height <= 0 || rect.width <= 0) return;
    const current = this.tooltipPlacement();
    const inset = current === 'below' ? box.bottom - rect.bottom : rect.top - box.top;
    const { width, height } = rect;
    // Every marker of one x is on the crosshair.
    const x = box.left + (points[0].x / this.vbW) * box.width;
    const ys = points.map(p => box.top + (p.y / this.vbH) * box.height);
    /** Held inside the plot, as the stylesheet's clamp holds it. */
    const across = (left: number): number => clamp(left, plot.left, plot.right - width);
    const top = box.top + inset;
    const candidates: readonly { placement: TooltipPlacement; left: number; top: number }[] = [
      { placement: 'top', left: across(x - width / 2), top },
      { placement: 'below', left: across(x - width / 2), top: box.bottom - inset - height },
      x - plot.left > plot.right - x
        ? { placement: 'left', left: across(x - BESIDE - width), top }
        : { placement: 'right', left: across(x + BESIDE), top },
    ];
    const covers = (c: { left: number; top: number }): number =>
      x + HOVER_RADIUS > c.left && x - HOVER_RADIUS < c.left + width
        ? ys.filter(y => y + HOVER_RADIUS > c.top && y - HOVER_RADIUS < c.top + height).length
        : 0;
    let best = candidates[0];
    let fewest = covers(best);
    for (const candidate of candidates.slice(1)) {
      if (fewest === 0) break;
      const count = covers(candidate);
      if (count < fewest) {
        best = candidate;
        fewest = count;
      }
    }
    if (best.placement !== current) this.tooltipPlacement.set(best.placement);
  }

  /**
   * The y-axis labels, top to bottom, in the reader's own language — and decided for
   * the AXIS, not one tick at a time (`useChartNumbers().ticks`).
   *
   * Compact, through `Intl` (`1.2K`, `3.4M`, `4 Mio.`, `5 тыс.`): the abbreviation used
   * to be a `k` from the catalog beside digits from `Intl`, which no locale's own
   * convention matched past the thousands, and `Intl` knows each one's units — German
   * abbreviates no thousands at all, Japanese counts in ten-thousands. Each tick gets
   * exactly the significant digits the STEP needs, and when abbreviating would make the
   * labels LONGER the whole axis is written in full instead, so no axis mixes `-1K`
   * with `-1,025`.
   */
  protected readonly tickLabels = computed<readonly string[]>(() =>
    this.numbers.ticks(
      this.yTicks().map(tick => tick.value),
      this.bounds().step
    )
  );

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

  /**
   * The figures for `dataTable`: the plot's name as the caption, a column per series
   * shown and a row per x, headed as the tooltip heads it. Each cell is the series' own
   * value, stacked or not, written as the tooltip writes it, and empty on a hole. With
   * every series hidden there is nothing to tabulate, and no rows.
   */
  protected readonly tableData = computed<WrChartTableData>(() => {
    const series = this.visibleSeries();
    const labels = this.xLabels();
    const rows =
      series.length === 0
        ? []
        : Array.from({ length: this.pointCount() }, (_, i) => ({
            header: labels[i] ?? this.ordinals.format(i + 1),
            cells: series.map(s => {
              const value = s.data[i];
              return value === undefined || value === null ? '' : this.numbers.value(value);
            }),
          }));
    return { caption: this.resolvedAriaLabel(), columns: series.map(s => s.label), groups: [{ rows }] };
  });
}

export type { WrLineSeries } from './types';
