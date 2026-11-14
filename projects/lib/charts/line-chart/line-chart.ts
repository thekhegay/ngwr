/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
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
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import {
  WR_CHART_LEGEND_BLOCK,
  WrChartLegend,
  type WrChartLegendItem,
  type WrChartLegendPosition,
} from 'ngwr/charts/chart-legend';
import {
  WrChartState,
  WrChartTable,
  type WrChartTableData,
  useChartHover,
  useChartNumbers,
  useChartSize,
  useChartState,
  wrChartAxis,
  wrChartColor,
  wrChartDash,
  wrChartLongest,
  wrChartNumberFormat,
} from 'ngwr/charts/core';
import { useI18nText } from 'ngwr/i18n';
import { type WrChartTooltipTarget, useChartTooltip } from 'ngwr/popover';
import { wrClamp, wrCheckStyles } from 'ngwr/utils';

import { WR_LINE_CHART_BREAK, wrLineChartCrowded, wrLineChartKeep } from './internal/decimate';
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

/**
 * How far the hover marker reaches from its point, in CSS px: half the 8px marker and the
 * 2px ring round it, at the stylesheet's defaults. What the tooltip keeps clear of.
 */
const HOVER_RADIUS = 6;

/**
 * How close two points may sit, in CSS px, before their dots are left out: a dot's
 * width, `--wr-chart-marker`'s default. Closer than that the dots touch.
 */
const DOT_SPACING = 6;

/** How many of the longest x labels the hidden measuring copy holds. */
const PROBES = 3;

/** The class the chart's tooltip chip takes beside the shared one, which its own hooks restyle. */
const TOOLTIP_CLASS = 'wr-line-chart__tooltip';

/**
 * What a browser measured, in CSS px: the drawing's width, the plot's padding beside it
 * and above it, and the widest x label.
 */
interface Measured {
  readonly width: number;
  readonly inset: number;
  readonly insetY: number;
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

/** A plotted series with the points of it that are drawn (see `wrLineChartKeep`). */
interface KeptSeries extends PlottedSeries {
  readonly kept: readonly number[];
}

/** One reading under the crosshair: a series' own value, and where its marker is drawn. */
interface HoverPoint {
  readonly index: number;
  readonly label: string;
  readonly value: number;
  readonly text: string;
  readonly color: string;
  readonly x: number;
  readonly y: number;
}

/**
 * Multi-series line chart on the shared chart theme: gridlines, a y scale, a legend and
 * a hover tooltip. SVG-only — no external dependency.
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
 * Each series takes the next colour of the chart palette (`--wr-chart-1` to `-8`) and
 * the next dash. The gridlines (`showGrid`) and the scale beside them (`showAxis`) are
 * each an input; the zero line is drawn stronger. Hovering a line or a legend row dims
 * the other series; the tooltip is the one every chart shares.
 *
 * The legend is a `ul[wr-chart-legend]` (`ngwr/charts/chart-legend`), below the plot
 * unless `legendPosition` says otherwise and left out for a single series; with
 * `toggleableLegend` its rows show and hide their series through `hiddenSeries`.
 *
 * With nothing to draw the chart keeps its frame and says "No data"; `loading` and
 * `error` put their own message there in place of the lines.
 *
 * A series with more than two points a pixel is drawn from the first, lowest, highest
 * and last point of every pixel column (`decimate`), which is the same line on screen at
 * a fraction of the path.
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
    // `wr-chart--legend`: the shared rule that keeps the legend's room from the plot.
    class: 'wr-line-chart wr-chart--legend',
    '[class.wr-chart--legend-side]': 'legendShown() && legendSide()',
    '[class.wr-line-chart--axis]': 'showAxis()',
    '[class.wr-line-chart--area]': 'showArea()',
    '[class.wr-line-chart--stacked]': 'stacked()',
  },
  imports: [NgTemplateOutlet, WrChartLegend, WrChartState, WrChartTable],
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

  /**
   * Draw the gridlines: one across the plot at every tick of the y axis, in
   * `--wr-line-chart-grid-color`, which defaults to the chart theme's `--wr-chart-grid`;
   * the one at zero is drawn in `--wr-line-chart-zero-color`. The scale's numbers are
   * `showAxis`. @default true
   */
  readonly showGrid = input(true, { transform: coerceBooleanProperty });

  /**
   * Print the y axis' scale: a number beside the plot at every tick. Off, the gutter
   * goes and the drawing takes its width. The x labels under the plot are `xLabels`.
   * @default true
   */
  readonly showAxis = input(true, { transform: coerceBooleanProperty });

  /**
   * Show the legend. `'auto'` shows it when there is something to tell apart - two
   * series or more - and leaves it out for a single series, which has nothing to key;
   * `true` shows it for one series too. @default 'auto'
   */
  readonly showLegend = input<boolean | 'auto', unknown>('auto', {
    transform: (value: unknown): boolean | 'auto' => (value === 'auto' ? 'auto' : coerceBooleanProperty(value)),
  });

  /**
   * Where the legend sits: `bottom` or `top` of the chart as a wrapping row, `start` or
   * `end` of it as a column, or `none` for no legend at all - `hiddenSeries` still hides
   * a series from outside. @default 'bottom'
   */
  readonly legendPosition = input<WrChartLegendPosition>('bottom');

  /**
   * A request for the chart's data is in flight: the lines give way to the loading
   * message, over the grid and the axis the chart keeps. @default false
   */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /**
   * The chart's data failed to load: the lines give way to the error message. `loading`
   * wins over it. @default false
   */
  readonly error = input(false, { transform: coerceBooleanProperty });

  /** The message shown with nothing to draw. Falls back to `chart.empty`, then `'No data'`. */
  readonly emptyLabel = input<string | null>(null);

  /** The message shown while `loading`. Falls back to `chart.loading`, then `'Loading…'`. */
  readonly loadingLabel = input<string | null>(null);

  /** The message shown on `error`. Falls back to `chart.error`, then `'Could not load'`. */
  readonly errorLabel = input<string | null>(null);

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

  /**
   * Show dots at each data point. Under `decimate` the dots are left out once the points
   * sit closer than a dot is wide, where they would touch and read as a thicker line.
   * @default true
   */
  readonly showDots = input(true, { transform: coerceBooleanProperty });

  /**
   * Draw a dense series from fewer points. Once a series has more than two points for
   * every pixel of the drawing's width, each pixel column keeps its first, lowest,
   * highest and last point and the rest are not drawn: every stroke inside a column
   * lands on the same pixels, so the line on screen is the same and its path is a
   * fraction of the size. The peaks, the first point and the last always survive, and a
   * hole in the data still breaks the line. The dots thin with the line, and go
   * altogether once the points are closer than a dot is wide. The axis, the tooltip and
   * the data table always read every point. Off draws every point as given.
   * @default true
   */
  readonly decimate = input(true, { transform: coerceBooleanProperty });

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
   * Show the hover readout: the crosshair, the point markers and the tooltip, which is
   * the chip every chart shares, with the x label as its heading and a row per series.
   * Off drops all three, since a crosshair with no values beside it points at nothing.
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

  /** An x with no label of its own, by its position from 1 in the reader's own digits. */
  private readonly ordinals = wrChartNumberFormat(inject(LOCALE_ID));

  /** What a browser measured, once it has: `null` on the server and until the first render. */
  private readonly measured = signal<Measured | null>(null);

  /** The drawing's box, on the observer every chart shares: what a resize re-measures on. */
  private readonly drawingSize = useChartSize(this.svg);

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('charts/line-chart');
    // The shared hover-dim: a line, its dots, its fill and its legend row carry
    // `data-wr-series`. The chart has no section an element stands for - an x is found
    // by position - so the section handlers have nothing to do.
    useChartHover({ enter: () => undefined, leave: () => undefined });

    // Measured after render, in a browser: the drawing's width and the widest x label,
    // which decide how many labels print and whether a series is decimated. Never on the
    // server, which works against `ASSUMED_WIDTH`.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const destroyRef = inject(DestroyRef);

    afterRenderEffect(() => {
      this.probeText();
      this.drawingSize();
      untracked(() => this.measure());
    });

    // The pointer, heard natively on the plot: a template listener would run a change
    // detection pass over the chart for every pixel the pointer crosses.
    afterNextRender(() => {
      const plot = this.plot().nativeElement;
      const move = (event: MouseEvent): void => this.onPointerMove(event);
      const leave = (event: MouseEvent): void => this.tip.leave(event);
      plot.addEventListener('mousemove', move);
      plot.addEventListener('mouseleave', leave);
      destroyRef.onDestroy(() => {
        plot.removeEventListener('mousemove', move);
        plot.removeEventListener('mouseleave', leave);
      });
    });
  }

  /**
   * Every series, resolved: its colour from the chart palette, its dash (`wrChartDash`, so the lines are
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
      dash: wrChartDash(i),
      data: s.data.map(v => (typeof v === 'number' && Number.isFinite(v) ? v : null)),
      color: s.color ?? wrChartColor(i),
    }))
  );

  /** The legend's rows: every series, keyed by its own dash. */
  protected readonly legendItems = computed<readonly WrChartLegendItem[]>(() =>
    this.resolvedSeries().map(({ label, color, dash }) => ({ label, color, dash }))
  );

  /**
   * Whether the chart draws its legend: unless `legendPosition` is `none` or `showLegend`
   * is off. Under `showLegend="auto"` a single series has nothing to tell apart, and
   * draws none.
   */
  protected readonly legendShown = computed(() => {
    const show = this.showLegend();
    const rows = this.legendItems().length;
    if (show === false || rows === 0 || this.legendPosition() === 'none') return false;
    return show === true || rows > 1;
  });

  /** Whether the legend comes before the plot, in the DOM as on screen: above it, or at inline start. */
  protected readonly legendFirst = computed(() => {
    const position = this.legendPosition();
    return position === 'top' || position === 'start';
  });

  /** Whether the legend sits beside the plot rather than above or below it. */
  protected readonly legendSide = computed(() => {
    const position = this.legendPosition();
    return position === 'start' || position === 'end';
  });

  /** Whether the chart has nothing to draw: no series, or none with a point. Hidden ones count as data. */
  private readonly empty = computed(() => this.resolvedSeries().every(s => s.data.length === 0));

  /** What the chart shows in place of its lines, or `null` while it draws them. */
  protected readonly state = useChartState({
    loading: this.loading,
    error: this.error,
    empty: this.empty,
    emptyLabel: this.emptyLabel,
    loadingLabel: this.loadingLabel,
    errorLabel: this.errorLabel,
  });

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
   * The y axis, from `wrChartAxis`, over what is plotted for the series still shown. It
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
    if (min > max) return wrChartAxis(Number.NaN, Number.NaN);
    if (this.showArea() || this.stacked()) return wrChartAxis(min, max, { includeZero: true });
    return wrChartAxis(Math.min(0, min), max);
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
    return ticks.map(value => ({ value, zero: value === 0, y: ((max - value) / (max - min)) * this.vbH }));
  });

  /**
   * How many pixel columns a series is decimated to, or 0 while none is: with `decimate`
   * off, and while the longest series has two points a pixel or fewer, which is every
   * chart of ordinary size. From the drawing's measured width, and `ASSUMED_WIDTH` before
   * a browser has measured it. A number rather than the width itself, so a resize that
   * changes nothing here rebuilds no path.
   */
  private readonly columns = computed(() => {
    if (!this.decimate()) return 0;
    const width = Math.round(this.measured()?.width ?? ASSUMED_WIDTH);
    return this.pointCount() > width * 2 ? width : 0;
  });

  /** Whether the dots are drawn: `showDots`, unless `decimate` finds the points closer than a dot is wide. */
  private readonly dotsShown = computed(() => {
    if (!this.showDots()) return false;
    if (!this.decimate()) return true;
    return !wrLineChartCrowded(this.pointCount(), this.measured()?.width ?? ASSUMED_WIDTH, DOT_SPACING);
  });

  /** The series drawn, each with the points of it that are: every one, or four a pixel column (`decimate`). */
  private readonly keptSeries = computed<readonly KeptSeries[]>(() => {
    const columns = this.columns();
    return this.plottedSeries().map(s => ({ ...s, kept: wrLineChartKeep(s.tops, columns) }));
  });

  /**
   * The SVG path through the kept points of a series — one subpath per unbroken run, so
   * a hole in the data leaves a hole in the line rather than a straight segment across it.
   */
  private linePath(values: readonly (number | null)[], kept: readonly number[]): string {
    let d = '';
    let run = 0;
    let last = '';
    // A subpath of one `M` is not stroked at all, so a point with a gap on both sides —
    // or the only point of a one-point chart — would simply vanish when `showDots` is off.
    // Repeating it gives the round linecap something to paint.
    const closeRun = (): void => {
      if (run === 1) d += ` L ${last}`;
      run = 0;
    };
    for (const i of kept) {
      if (i === WR_LINE_CHART_BREAK) {
        closeRun();
        continue;
      }
      last = `${this.pointX(i).toFixed(2)} ${this.pointY(values[i] ?? 0).toFixed(2)}`;
      d += `${d ? ' ' : ''}${run === 0 ? 'M' : 'L'} ${last}`;
      run++;
    }
    closeRun();
    return d;
  }

  /**
   * Every series shown as the template draws it: its line's path, and with `showDots` one
   * path holding a subpath per dot, empty when there is none to draw. Built once per change
   * to the data or the axis, so moving the pointer from x to x, which re-renders the hover
   * layer, rebuilds no path.
   */
  protected readonly drawn = computed(() => {
    const dots = this.dotsShown();
    return this.keptSeries().map(s => ({
      index: s.index,
      color: s.color,
      dash: s.dash,
      d: this.linePath(s.tops, s.kept),
      dots: dots ? this.dotsFor(s.tops, s.kept) : '',
    }));
  });

  /** A series' dots as one path, a subpath for each kept point. A hole in the data gets none. */
  private dotsFor(values: readonly (number | null)[], kept: readonly number[]): string {
    let d = '';
    for (const i of kept) {
      if (i === WR_LINE_CHART_BREAK) continue;
      d += `${d ? ' ' : ''}${this.dotPath(this.pointX(i), this.pointY(values[i] ?? 0))}`;
    }
    return d;
  }

  /**
   * The fills under the lines with `showArea`: one per unbroken run of two points or
   * more, from the line down to zero, or down to the top of the band below under
   * `stacked`. A run of one point has no width to fill. Keyed by the series' position
   * and the run's first x, so a run that moves is a new fill. Each follows the points
   * its line is drawn through.
   */
  protected readonly areas = computed(() => {
    if (!this.showArea() || this.pointCount() <= 1) return [];
    return this.keptSeries().flatMap(s => {
      const fills: { key: string; series: number; color: string; d: string }[] = [];
      let run: number[] = [];
      const close = (): void => {
        if (run.length >= 2) {
          fills.push({ key: `${s.index}:${run[0]}`, series: s.index, color: s.color, d: this.areaPath(s, run) });
        }
        run = [];
      };
      for (const i of s.kept) {
        if (i === WR_LINE_CHART_BREAK) close();
        else run.push(i);
      }
      close();
      return fills;
    });
  });

  /** One fill: along the run's plotted values, then back along its base. */
  private areaPath(series: PlottedSeries, run: readonly number[]): string {
    const at = (i: number, value: number): string => `${this.pointX(i).toFixed(2)} ${this.pointY(value).toFixed(2)}`;
    const commands: string[] = [];
    for (let k = 0; k < run.length; k++)
      commands.push(`${k === 0 ? 'M' : 'L'} ${at(run[k], series.tops[run[k]] ?? 0)}`);
    for (let k = run.length - 1; k >= 0; k--) commands.push(`L ${at(run[k], series.bases?.[run[k]] ?? 0)}`);
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
   * x labels are placed with it, in a box as wide as the plot: the stylesheet adds the
   * plot's inline padding, so they land on the point at any size.
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
   * The longest few x labels, a line each: the hidden copy the labels' room is measured
   * against. Laid out as wide as its widest line, so among those few it measures the
   * widest rather than the one with the most characters — `WWWWW` is wider than
   * `iiiiiii`. A few and not every label: ten thousand labels were ten thousand lines to
   * shape on every change, to learn the width of one.
   */
  protected readonly probeText = computed(() =>
    wrChartLongest(
      this.xLabels().map(label => label.replace(/\r\n?|\n/g, ' ')),
      PROBES
    ).join('\n')
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
      wrClamp(inset + this.pointX(index) * (width / this.vbW) - label / 2, 0, strip - label);
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
   * The readings at x `i`, one per series shown that has one. Each marker sits where the
   * series is drawn, which under `stacked` is the top of its band, while the row reads
   * the series' own value.
   */
  private pointsAt(i: number): HoverPoint[] {
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
  }

  /**
   * The chart's tooltip: the chip every chart shares, with the hovered x's label as its
   * heading and a row per series shown with a reading there, in the series' colour. It
   * points at the box round that x's markers - the crosshair, from the highest marker to
   * the lowest, widened by a marker's reach - from above, and flips for room, so it
   * covers none of the markers it reads. It takes `wr-line-chart__tooltip` beside the
   * shared class, which is what this chart's own `--wr-line-chart-tooltip-*` hooks style.
   *
   * An x is found by POSITION, anywhere over the plot, so the chip is scrubbed the way a
   * sparkline's is: while it is up it follows the pointer by itself, over the plot and
   * over the chip.
   */
  protected readonly tip = useChartTooltip(
    this.tooltip,
    index => this.readout(index),
    (x, y) => this.indexAt(x, y)
  );

  /** The hovered x while the chart draws its lines: a state has nothing to read out. */
  protected readonly activeIndex = computed(() => (this.state() ? null : this.tip.active()));

  /** The hovered x's readings: what the crosshair and the markers are drawn from. */
  protected readonly hoverPoints = computed(() => {
    const i = this.activeIndex();
    return i === null ? [] : this.pointsAt(i);
  });

  private readout(index: number): WrChartTooltipTarget | null {
    if (this.state()) return null;
    const points = this.pointsAt(index);
    if (points.length === 0) return null;
    const box = this.svg().nativeElement.getBoundingClientRect();
    // Every marker of one x is on the crosshair.
    const x = box.left + (points[0].x / this.vbW) * box.width;
    let top = Number.POSITIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    for (const point of points) {
      const y = box.top + (point.y / this.vbH) * box.height;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
    return {
      datum: {
        label: this.xLabels()[index] ?? this.ordinals.format(index + 1),
        value: '',
        rows: points.map(({ label, text, color }) => ({ label, value: text, color })),
        className: TOOLTIP_CLASS,
      },
      anchor: {
        x: x - HOVER_RADIUS,
        y: top - HOVER_RADIUS,
        width: 2 * HOVER_RADIUS,
        height: bottom - top + 2 * HOVER_RADIUS,
      },
    };
  }

  /**
   * The pointer over the plot, while no chip is up: an open chip follows the pointer by
   * itself, through `indexAt`, so each move is measured once. A MOUSE event, as the
   * sparkline's is: a tap fires `pointerdown`, `pointerup` and `pointerleave` and no
   * `pointermove`, then the compatibility `mousemove`, so a `pointermove` listener never
   * opened the readout on a phone and the `pointerleave` closed whatever it had.
   */
  private onPointerMove(event: MouseEvent): void {
    if (!this.tooltip() || this.tip.active() !== null) return;
    const index = this.indexAt(event.clientX, event.clientY);
    if (index === null) this.tip.leave(event);
    else this.tip.enter(index);
  }

  /**
   * The x nearest a viewport position over the plot, or `null` off it. Measured against
   * the drawing inside the plot: the drawing runs edge to edge, so the first and last
   * dots overhang it into the plot's padding, and over the padding the nearest point is
   * the end one, so the index is clamped. One layout read: the plot's own box is the
   * drawing's, widened by the padding last measured.
   */
  private indexAt(clientX: number, clientY: number): number | null {
    const count = this.pointCount();
    if (count === 0 || this.state()) return null;
    const box = this.svg().nativeElement.getBoundingClientRect();
    if (box.width <= 0) return null;
    const measured = this.measured();
    if (measured && box.height > 0) {
      const { inset, insetY } = measured;
      if (
        clientX < box.left - inset ||
        clientX > box.right + inset ||
        clientY < box.top - insetY ||
        clientY > box.bottom + insetY
      ) {
        return null;
      }
    }
    const ratio = (clientX - box.left) / box.width;
    return count === 1 ? 0 : wrClamp(Math.round(ratio * (count - 1)), 0, count - 1);
  }

  /** A zero-length line at a point, which a round cap paints as a dot. */
  protected dotPath(x: number, y: number): string {
    return `M ${x.toFixed(2)} ${y.toFixed(2)} h 0`;
  }

  /**
   * Read the drawing's width, the plot's padding and the widest x label off the layout.
   * A hidden chart measures 0 and keeps its last reading rather than thin to nothing;
   * with no label to measure the estimate stays in charge.
   */
  private measure(): void {
    const box = this.svg().nativeElement.getBoundingClientRect();
    if (box.width <= 0) return;
    const plot = this.plot().nativeElement.getBoundingClientRect();
    const inset = box.left - plot.left;
    const insetY = Math.max(0, box.top - plot.top);
    const label = this.probe()?.nativeElement.getBoundingClientRect().width ?? 0;
    const last = this.measured();
    if (last?.width === box.width && last.inset === inset && last.insetY === insetY && last.label === label) return;
    this.measured.set({ width: box.width, inset, insetY, label });
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
