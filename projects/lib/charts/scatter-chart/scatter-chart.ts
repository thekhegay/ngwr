/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  type ElementRef,
  LOCALE_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';

import { WrChartLegend, type WrChartLegendItem, type WrChartLegendPosition } from 'ngwr/charts/chart-legend';
import {
  type WrChartAxis,
  type WrChartMarkerExtent,
  type WrChartMarkerShape,
  WrChartState,
  WrChartTable,
  type WrChartTableData,
  useChartHover,
  useChartNumbers,
  useChartSize,
  useChartState,
  wrChartAxis,
  wrChartColor,
  wrChartMarker,
  wrChartNumberFormat,
  wrChartRound,
} from 'ngwr/charts/core';
import { useI18nText } from 'ngwr/i18n';
import { type WrChartTooltipRow, useChartTooltip } from 'ngwr/popover';
import { wrCheckStyles } from 'ngwr/utils';

import { wrScatterHit, wrScatterIndex } from './internal/hit';
import { wrScatterDensePath, wrScatterMarkerCache } from './internal/markers';
import type { WrScatterAxis, WrScatterSeries } from './types';

/**
 * The radius, in px, of a point with no `size`: a marker as large as a 6px circle, the
 * chart theme's `--wr-chart-marker`. A length in the script rather than the token, since
 * the marker's path, its reach and the pointer's hit test are all worked out from it.
 */
const POINT_RADIUS = 3;

/** The smallest radius a sized point is drawn at, in px, however small its size: still a mark, still hoverable. */
const MIN_RADIUS = 4;

/** How far from a marker's centre, in px, the pointer still reads that point — or as far as the marker reaches, if farther. */
const HIT_RADIUS = 16;

/** How much larger the hovered point is drawn, in px of radius: a plain 6px point reads at 8px. */
const HOVER_GROW = 1;

/**
 * How far past its marker the hovered point reaches, in px: what it grows by, and the
 * 2px ring of the surface round it (`--wr-scatter-chart-halo-width`).
 */
const HALO_GAP = HOVER_GROW + 2;

/**
 * How many points shown the chart draws a node each for. Past it every series is ONE
 * path holding a subpath per marker: ten thousand points were twenty thousand elements,
 * and are as many paths as there are series.
 */
const DENSE_FROM = 2000;

/** The drawing's width in CSS px, assumed until a browser has measured it: what a path of many markers is first written for. */
const ASSUMED_WIDTH = 560;

/** A percentage to three decimals, so an attribute stays short. */
const percent = (value: number): number => wrChartRound(value, 3);

/** One point as the chart draws it: its data, where it sits and how large it is. */
interface DrawnPoint {
  /** Its series' position and its own position in that series' `data`, which no other point shares. */
  readonly key: string;
  /** Its series' position in `series`. */
  readonly series: number;
  readonly seriesLabel: string;
  readonly color: string;
  readonly marker: WrChartMarkerShape;
  /** Its position in its series' `data`, from 1: the row header of a point with no `label`. */
  readonly n: number;
  readonly x: number;
  readonly y: number;
  readonly size: number | null;
  readonly label: string | null;
  /** Its centre, as percentages of the drawing's width from the left and height from the top. */
  readonly left: number;
  readonly top: number;
  /** Its radius in px. */
  readonly r: number;
  /** Its marker's path about the origin. */
  readonly d: string;
  /** The same path in relative commands, for a path of many markers. */
  readonly relative: string;
  /** Its `x`, `y` and radius, and its `size` when it has one, as one attribute: what a test harness reads a point by. */
  readonly values: string;
  /** How far its hover ring reaches from its centre, in px: what the tooltip points at and the pointer reads. */
  readonly halo: WrChartMarkerExtent;
}

/** A stretch of consecutive points of one series, in drawing order: one group in the drawing. */
interface Run {
  readonly key: string;
  readonly series: number;
  readonly color: string;
  readonly marker: WrChartMarkerShape;
  readonly points: readonly DrawnPoint[];
}

/**
 * Points on two numeric axes: one series per marker shape, and an optional third value
 * drawn as each point's area, which makes it a bubble chart. SVG-only — no external
 * dependency.
 *
 * @example
 * ```html
 * <wr-scatter-chart
 *   xLabel="Price"
 *   yLabel="Rating"
 *   [series]="[
 *     { label: 'Laptops', data: [{ x: 899, y: 4.1 }, { x: 1299, y: 4.6 }] },
 *     { label: 'Tablets', data: [{ x: 329, y: 3.9 }, { x: 599, y: 4.4 }] }
 *   ]"
 * />
 * ```
 *
 * Each series is told apart by its marker's SHAPE as well as its colour — a circle, a
 * square, a triangle, a diamond, a cross, a downward triangle — so colour is never the
 * only thing that tells two series apart. Each takes the next colour of the chart
 * palette (`--wr-chart-1` to `--wr-chart-8`). Neither axis is forced to include
 * zero: each is fitted to its data and snapped outward to a readable step, so no point
 * lands exactly on the frame, and a single value sits in the middle with a step either
 * side. A point can still sit a hair inside the frame, so the plot's padding grows to
 * the largest marker drawn, and a bubble at the edge stays inside the chart's own box.
 *
 * The drawing is one named `role="img"` and takes no tab stop; the tooltip is pointer
 * only. `dataTable` renders every value as a table only assistive technology reaches.
 * The legend is a `ul[wr-chart-legend]` (`ngwr/charts/chart-legend`), placed by
 * `legendPosition` and left out for a single series; with `toggleableLegend` its rows
 * show and hide their series through `hiddenSeries`. Hovering a marker or a legend row
 * dims every other series.
 *
 * **Grid and axes.** Gridlines run across the plot at every y tick (`showGrid`), the
 * one at zero stronger, and both axes print their scale (`showAxis`). The gridlines up
 * the plot at the x ticks are in the DOM and painted `transparent`:
 * `--wr-scatter-chart-grid-x-color` draws them.
 *
 * **Empty, loading, error.** With no point to draw the chart keeps its frame and says
 * "No data"; `loading` and `error` put their own message there in place of the points.
 *
 * **Many points.** The pointer finds the nearest point through a grid over the drawing,
 * one lookup a move whatever the count. Up to two thousand points shown each is an
 * element of its own, drawn largest first; past that every series is one path holding
 * all its markers, drawn series by series.
 *
 * @see https://ngwr.dev/charts/scatter-chart
 */
@Component({
  selector: 'wr-scatter-chart',
  templateUrl: './scatter-chart.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    // `wr-chart--legend`: the shared rule that keeps the legend's room from the plot.
    class: 'wr-scatter-chart wr-chart--legend',
    '[class.wr-chart--legend-side]': 'legendShown() && legendSide()',
    '[class.wr-scatter-chart--axis]': 'showAxis()',
    // A bubble chart's markers overlap as a rule, so they are drawn see-through.
    '[class.wr-scatter-chart--bubbles]': 'sized()',
    // How far the largest marker reaches, ring included: the stylesheet grows the plot's
    // padding to it, so a marker on the frame stays inside the plot.
    '[style.--wr-scatter-chart-reach-x]': 'reach().x',
    '[style.--wr-scatter-chart-reach-y]': 'reach().y',
  },
  imports: [NgTemplateOutlet, WrChartLegend, WrChartState, WrChartTable],
})
export class WrScatterChart {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('charts/scatter-chart');
    // The shared hover-dim: every run of a series' markers and its legend row carry
    // `data-wr-series`. A point is found by position, not by the element under the
    // pointer, so the section handlers have nothing to do.
    useChartHover({ enter: () => undefined, leave: () => undefined });

    // One native listener pair on the plot: a move runs no change detection unless it
    // lands on another point.
    const destroyRef = inject(DestroyRef);
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
   * One entry per series. A series with no `color` takes the next entry from the chart's
   * palette, and every series takes the next marker shape, so several series are told
   * apart unconfigured.
   */
  readonly series = input<readonly WrScatterSeries[]>([]);

  /**
   * Accessible name of the chart. The legend carries the series NAMES only — the values
   * are nowhere in text unless `dataTable` puts them there — so say what the chart shows.
   * Falls back to `scatterChart.label` ("Scatter chart").
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'scatterChart.label', 'Scatter chart');

  /**
   * The x axis' name. Drawn under the axis only when given; either way it names the x
   * row of the tooltip and the x column of the data table, which fall back to
   * `scatterChart.x` ("X").
   */
  readonly xLabel = input<string | null>(null);

  /**
   * The y axis' name. Drawn above the axis only when given; either way it names the y
   * row of the tooltip and the y column of the data table, which fall back to
   * `scatterChart.y` ("Y").
   */
  readonly yLabel = input<string | null>(null);

  /**
   * What a point's `size` measures. It names the size row of the tooltip and the size
   * column of the data table, which appear only when a point has a size, and falls back
   * to `scatterChart.size` ("Size").
   */
  readonly sizeLabel = input<string | null>(null);

  protected readonly xName = useI18nText(this.xLabel, 'scatterChart.x', 'X');
  protected readonly yName = useI18nText(this.yLabel, 'scatterChart.y', 'Y');
  protected readonly sizeName = useI18nText(this.sizeLabel, 'scatterChart.size', 'Size');

  /**
   * Writes every number the chart shows — the axis ticks, the tooltip and the data table —
   * and is told which number it is writing: `'x'`, `'y'` or `'size'`, so the two axes can
   * carry different units. A `(value) => string` written for another chart fits too. `null`
   * uses `Intl.NumberFormat` in `LOCALE_ID`, with compact ticks (`1.2K`, `3.4M`) unless the
   * full numbers are shorter.
   */
  readonly valueFormat = input<((value: number, axis: WrScatterAxis) => string) | null>(null);

  /** The exact figures and the axes' compact ticks, in `LOCALE_ID` unless `valueFormat` is given. */
  private readonly numbers = useChartNumbers<[WrScatterAxis]>(this.valueFormat);

  /** The row headers of points with no `label`, which number them in the reader's own digits. */
  private readonly ordinals = wrChartNumberFormat(inject(LOCALE_ID));

  /** The plot's height in px, at least 80. @default 240 */
  readonly height = input(240, { transform: (v: unknown): number => Math.max(80, coerceNumberProperty(v, 240)) });

  /**
   * Draw the gridlines: one across the plot at every tick of the y axis, in
   * `--wr-scatter-chart-grid-color`, which defaults to the chart theme's
   * `--wr-chart-grid`; the one at zero is drawn in `--wr-scatter-chart-zero-color`. The
   * lines up the plot at the x ticks are drawn `transparent` unless
   * `--wr-scatter-chart-grid-x-color` gives them a colour. The scales' numbers are
   * `showAxis`. @default true
   */
  readonly showGrid = input(true, { transform: coerceBooleanProperty });

  /**
   * Print both axes' scales: a number beside the plot at every y tick and under it at
   * every x tick. Off, the gutter and the strip go and the drawing takes their room.
   * The axes' names are `xLabel` and `yLabel`. @default true
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
   * A request for the chart's data is in flight: the points give way to the loading
   * message, over the grid and the axes the chart keeps. @default false
   */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /**
   * The chart's data failed to load: the points give way to the error message. `loading`
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
   * labels, since two series may share a label. A toggleable legend writes it, and a host
   * may bind it with or without one: `[(hiddenSeries)]`.
   *
   * A hidden series is left out of everything that reads its values: it draws no points,
   * the tooltip cannot land on them, the data table drops its rows, and both axes and the
   * bubble scale are fitted to the series still shown, so hiding an outlier lets the rest
   * fill the plot. Its legend row stays, struck through, so it can be shown again. With
   * every series hidden the plot is the empty 0 to 1 frame. A position past the end of
   * `series` is kept and ignored.
   */
  readonly hiddenSeries = model<readonly number[]>([]);

  /** Show a tooltip with the series, x, y and size of the point under the pointer. Pointer only. @default true */
  readonly tooltip = input(true, { transform: coerceBooleanProperty });

  /**
   * Render every point's values as a table only assistive technology reaches, beside the
   * drawing: one group of rows per series shown, headed by the series' name, a row per
   * point, and a column for x, for y and, when a point has one, for size. The drawing is
   * one named image, so without it the values are nowhere a screen reader can walk.
   * @default false
   */
  readonly dataTable = input(false, { transform: coerceBooleanProperty });

  /**
   * The radius, in px, the largest `size` shown is drawn at. Every other sized point is
   * scaled by AREA against it — a point of half the size has half the area, not half the
   * radius — and none is drawn under 4px. At least 4. @default 20
   */
  readonly maxRadius = input(20, {
    transform: (v: unknown): number => Math.max(MIN_RADIUS, coerceNumberProperty(v, 20)),
  });

  private readonly svg = viewChild<ElementRef<SVGSVGElement>>('svg');

  private readonly plot = viewChild.required<ElementRef<HTMLElement>>('plot');

  /** The drawing's box, on the observer every chart shares: what a path of many markers is written for. */
  private readonly drawingSize = useChartSize(this.svg);

  /** Each marker's path and reach, built once per shape and radius. */
  private readonly markerOf = wrScatterMarkerCache();

  /**
   * Every series, resolved: its palette colour, its marker shape, and its points with
   * every one dropped whose `x` or `y` is not a finite number. Hidden ones included, since
   * the legend lists them.
   *
   * A point that cannot be placed is left out rather than kept: one NaN in the pooled
   * minimum makes every coordinate in every series NaN, and the whole chart vanishes
   * instead of one point. A point keeps its position in its series' `data` all the same,
   * so the data table numbers the rest as the consumer numbered them.
   */
  protected readonly resolvedSeries = computed(() =>
    this.series().map((s, index) => ({
      index,
      label: s.label,
      color: s.color ?? wrChartColor(index),
      marker: wrChartMarker(index),
      points: s.data.flatMap((p, i) =>
        Number.isFinite(p.x) && Number.isFinite(p.y)
          ? [
              {
                n: i + 1,
                x: p.x,
                y: p.y,
                size: typeof p.size === 'number' && Number.isFinite(p.size) && p.size >= 0 ? p.size : null,
                label: p.label ?? null,
              },
            ]
          : []
      ),
    }))
  );

  /** The legend's rows: every series, keyed by its own marker. */
  protected readonly legendItems = computed<readonly WrChartLegendItem[]>(() =>
    this.resolvedSeries().map(({ label, color, marker }) => ({ label, color, marker }))
  );

  /**
   * Whether the chart draws its legend: with a series to list, unless `legendPosition`
   * is `none` or `showLegend` is off. Under `showLegend="auto"` a single series has
   * nothing to tell apart, and draws none.
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

  /** Whether the chart has nothing to draw: no series, or none with a point it can place. Hidden ones count as data. */
  private readonly empty = computed(() => this.resolvedSeries().every(s => s.points.length === 0));

  /** What the chart shows in place of its points, or `null` while it draws them. */
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

  /** The largest `size` among the points shown, or `null` when none has one — a plain scatter. */
  private readonly maxSize = computed(() => {
    let max: number | null = null;
    for (const s of this.visibleSeries())
      for (const p of s.points) if (p.size !== null) max = Math.max(max ?? 0, p.size);
    return max;
  });

  /** Whether any point shown has a size, which adds the size row and column. */
  protected readonly sized = computed(() => this.maxSize() !== null);

  /**
   * The x axis, from `wrChartAxis` over the points shown: fitted to the data with no zero
   * forced in, since a scatter has no baseline, snapped outward at both ends and lifted a
   * step at EITHER end a point would sit on (`symmetric`), so no point lands exactly on
   * the frame. A single value — one point, or a column of them — is centred with a step
   * either side. With nothing to fit, the 0 to 1 frame.
   */
  protected readonly xAxis = computed(() => this.fit(p => p.x));

  /** The y axis, fitted the way {@link xAxis} is. */
  protected readonly yAxis = computed(() => this.fit(p => p.y));

  /**
   * The points as drawn: placed by percentage on both axes, sized, and ordered LARGEST
   * FIRST so a small bubble is never buried under a large one. Points of equal size keep
   * the series' order, so a plain scatter draws series by series.
   */
  protected readonly points = computed<readonly DrawnPoint[]>(() => {
    const x = this.xAxis();
    const y = this.yAxis();
    const maxSize = this.maxSize();
    const maxRadius = this.maxRadius();
    const drawn = this.visibleSeries().flatMap(s =>
      s.points.map(p => {
        const r =
          p.size === null || maxSize === null
            ? POINT_RADIUS
            : Math.max(MIN_RADIUS, maxRadius * Math.sqrt(maxSize > 0 ? p.size / maxSize : 0));
        const marker = this.markerOf(s.marker, r);
        return {
          key: `${s.index}:${p.n}`,
          series: s.index,
          seriesLabel: s.label,
          color: s.color,
          marker: s.marker,
          n: p.n,
          x: p.x,
          y: p.y,
          size: p.size,
          label: p.label,
          left: percent(((p.x - x.min) / (x.max - x.min)) * 100),
          top: percent(((y.max - p.y) / (y.max - y.min)) * 100),
          r,
          d: marker.d,
          relative: marker.relative,
          values: p.size === null ? `${p.x} ${p.y} ${r}` : `${p.x} ${p.y} ${r} ${p.size}`,
          halo: this.markerOf(s.marker, r + HALO_GAP).extent,
        };
      })
    );
    return drawn.sort((a, b) => b.r - a.r);
  });

  /** Whether there are too many points shown for a node each: every series is then one path. */
  protected readonly dense = computed(() => this.points().length > DENSE_FROM);

  /**
   * The points as groups: each stretch of consecutive points of one series, in drawing
   * order. A plain scatter is a group per series; a bubble chart, whose points are drawn
   * largest first across series so no small bubble is buried, breaks a series into as
   * many groups as its sizes interleave with the others'. The group carries what its
   * points share - the colour, the shape and the legend row the hover dims by - so a
   * point carries only its own place and path. None once the chart is {@link dense}.
   */
  protected readonly runs = computed<readonly Run[]>(() => {
    if (this.dense()) return [];
    const runs: { key: string; series: number; color: string; marker: WrChartMarkerShape; points: DrawnPoint[] }[] = [];
    for (const point of this.points()) {
      const last = runs[runs.length - 1];
      if (last?.series === point.series) last.points.push(point);
      else {
        runs.push({
          key: point.key,
          series: point.series,
          color: point.color,
          marker: point.marker,
          points: [point],
        });
      }
    }
    return runs;
  });

  /** The box a path of many markers is written for, in px: the drawing's, once a browser has measured it. */
  private readonly denseSize = computed(() => {
    const { width, height } = this.drawingSize();
    return width > 0 && height > 0 ? { width, height } : { width: ASSUMED_WIDTH, height: this.height() };
  });

  /** The `viewBox` of the paths of many markers: the size they were written for, so nothing stretches once measured. */
  protected readonly denseBox = computed(() => `0 0 ${this.denseSize().width} ${this.denseSize().height}`);

  /**
   * Past {@link DENSE_FROM} points shown, every series as ONE path, a subpath per marker,
   * largest first within the series. A path takes no percentage, so it is written in px
   * for the drawing's measured size and again when that changes; until a browser has
   * measured it, for an assumed one the `viewBox` stretches to fit. Series are drawn in
   * order, so across series a large bubble can cover a smaller one of an earlier series -
   * the price of one element a series, and bubbles are see-through.
   */
  protected readonly densePaths = computed(() => {
    if (!this.dense()) return [];
    const { width, height } = this.denseSize();
    const bySeries = new Map<number, DrawnPoint[]>();
    for (const point of this.points()) {
      const list = bySeries.get(point.series);
      if (list) list.push(point);
      else bySeries.set(point.series, [point]);
    }
    return [...bySeries.entries()]
      .sort(([a], [b]) => a - b)
      .map(([series, points]) => ({
        series,
        color: points[0].color,
        marker: points[0].marker,
        count: points.length,
        d: wrScatterDensePath(points, width, height),
      }));
  });

  /** The points bucketed over the drawing, for the pointer: built once per change to the points. */
  private readonly index = computed(() =>
    wrScatterIndex(
      this.points().map(({ left, top, halo }) => ({ left, top, reach: Math.max(HIT_RADIUS, halo.radius) }))
    )
  );

  /**
   * How far the largest marker drawn reaches past its centre, in px, sideways and up or
   * down — its hover ring included, so hovering moves nothing. The axes keep a point
   * off the frame only when it lands exactly on it, and one a fraction of a step inside
   * sits a few px from it; the stylesheet takes the larger of this and the plot's inset
   * tokens as the plot's padding, so the marker stays inside the plot rather than over
   * the tick labels or past the chart's own box. By SHAPE, not radius: a triangle's
   * point reaches 1.56 times its radius up. The ring's stroke is the stylesheet's.
   *
   * Up or down it is held to a quarter of `height`, so a short plot with a large
   * `maxRadius` keeps half its height for the drawing and lets the marker overhang.
   */
  protected readonly reach = computed(() => {
    let x = 0;
    let y = 0;
    for (const { halo } of this.points()) {
      x = Math.max(x, halo.side);
      y = Math.max(y, halo.top, halo.bottom);
    }
    return { x: wrChartRound(x, 3), y: wrChartRound(Math.min(y, this.height() / 4), 3) };
  });

  /**
   * The y ticks, top to bottom: each value's label, its gridline's distance from the top
   * in percent, and whether it is the line at zero, which is drawn stronger.
   */
  protected readonly yTicks = computed(() => {
    const { min, max, step, ticks } = this.yAxis();
    const labels = this.numbers.ticks(ticks, step, 'y');
    return ticks.map((value, i) => ({
      label: labels[i],
      top: percent(((max - value) / (max - min)) * 100),
      zero: value === 0,
    }));
  });

  /** The x ticks, left to right: each value's label and its gridline's distance from the left, in percent. */
  protected readonly xTicks = computed(() => {
    const { min, max, step, ticks } = this.xAxis();
    const values = [...ticks].reverse();
    const labels = this.numbers.ticks(values, step, 'x');
    return values.map((value, i) => ({ label: labels[i], left: percent(((value - min) / (max - min)) * 100) }));
  });

  /**
   * How far apart two neighbouring x ticks are, as a percentage of the drawing's width —
   * the room each tick label has, half on either side of its gridline, which the
   * stylesheet bounds it to and ellipsises past.
   */
  protected readonly xSlot = computed(() => {
    const count = this.xTicks().length;
    return count <= 1 ? 100 : percent(100 / (count - 1));
  });

  /**
   * One tooltip for the point under the pointer: the series' swatch and name with the
   * point's own label as its heading, then a row each for x, y and size. It points at
   * the box of the marker's hover ring from above, so the chip clears a large bubble and
   * a triangle's point rather than sitting on its centre.
   *
   * Points are found by POSITION — the nearest within 16px of the pointer, or anywhere a
   * larger marker reaches — so a point under the open chip can still be reached by
   * moving onto it, the way a sparkline is scrubbed. The point is the one the pointer's
   * own lookup found: this reads it by its position in `points`, and measures the drawing
   * once to say where it is.
   */
  protected readonly tip = useChartTooltip(
    this.tooltip,
    index => {
      const point = this.points()[index];
      const svg = this.svg()?.nativeElement;
      if (!point || !svg || this.state()) return null;
      const box = svg.getBoundingClientRect();
      const x = box.left + (point.left / 100) * box.width;
      const y = box.top + (point.top / 100) * box.height;
      const rows: WrChartTooltipRow[] = [
        { label: this.xName(), value: this.numbers.value(point.x, 'x') },
        { label: this.yName(), value: this.numbers.value(point.y, 'y') },
      ];
      if (point.size !== null) rows.push({ label: this.sizeName(), value: this.numbers.value(point.size, 'size') });
      return {
        datum: { label: point.seriesLabel, value: point.label ?? '', color: point.color, rows },
        anchor: {
          x: x - point.halo.side,
          y: y - point.halo.top,
          width: point.halo.side * 2,
          height: point.halo.top + point.halo.bottom,
        },
      };
    },
    (x, y) => this.pointAt(x, y)
  );

  /** The point the tooltip is reading, drawn again over the rest. None under a state, which has no point to read. */
  protected readonly activePoint = computed(() => {
    const index = this.tip.active();
    return index === null || this.state() ? null : (this.points()[index] ?? null);
  });

  /**
   * The hovered point's marker: its own shape a little larger, which the stylesheet rings
   * in the surface, so the reading stands clear of the points it overlaps.
   */
  protected readonly haloPath = computed(() => {
    const point = this.activePoint();
    return point ? this.markerOf(point.marker, point.r + HOVER_GROW).d : '';
  });

  /**
   * The figures for `dataTable`: the chart's name as the caption, one group per series
   * shown and headed by its name, and a row per point headed by the point's `label` or
   * its position in the series. Every value is written as the tooltip writes it; a point
   * with no size has an empty size cell in a chart where others have one.
   */
  protected readonly tableData = computed<WrChartTableData>(() => {
    const sized = this.sized();
    const value = (v: number, axis: WrScatterAxis): string => this.numbers.value(v, axis);
    return {
      caption: this.resolvedAriaLabel(),
      columns: sized ? [this.xName(), this.yName(), this.sizeName()] : [this.xName(), this.yName()],
      groups: this.visibleSeries().map(s => ({
        header: s.label,
        rows: s.points.map(p => {
          const cells = [value(p.x, 'x'), value(p.y, 'y')];
          if (sized) cells.push(p.size === null ? '' : value(p.size, 'size'));
          return { header: p.label ?? this.ordinals.format(p.n), cells };
        }),
      })),
    };
  });

  /**
   * The point under the pointer. A MOUSE event, as every chart's is: a tap fires the
   * compatibility `mousemove` and no `pointermove`. Off every point, the open tooltip
   * starts its grace period.
   *
   * Only while no chip is up: an open chip follows the pointer by itself, through
   * `pointAt`, so each move is looked up once.
   */
  private onPointerMove(event: MouseEvent): void {
    if (!this.tooltip() || this.tip.active() !== null) return;
    const index = this.pointAt(event.clientX, event.clientY);
    if (index === null) this.tip.leave(event);
    else this.tip.enter(index);
  }

  /**
   * The point nearest a viewport position: within 16px of its centre, or within the
   * circle its hover ring fits in where that is larger — a triangle's point or a
   * diamond's tips reach past its radius — and the nearest centre where several qualify.
   * A drawing with no box (nothing laid out yet) answers nothing. One layout read, and a
   * look in the few cells of the index the pointer can reach rather than at every point.
   */
  private pointAt(clientX: number, clientY: number): number | null {
    const svg = this.svg()?.nativeElement;
    if (!svg || this.state()) return null;
    const box = svg.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return null;
    return wrScatterHit(
      this.index(),
      ((clientX - box.left) / box.width) * 100,
      ((clientY - box.top) / box.height) * 100,
      box.width,
      box.height
    );
  }

  /** One axis over the points shown: `wrChartAxis` with both ends kept off the data, and one value centred. */
  private fit(read: (point: { readonly x: number; readonly y: number }) => number): WrChartAxis {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const s of this.visibleSeries()) {
      for (const p of s.points) {
        const v = read(p);
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    // No point at all leaves both infinite, which `wrChartAxis` answers with the empty frame;
    // one value, or a column of them, it centres between a step on either side.
    return wrChartAxis(min, max, { symmetric: true });
  }
}

export type { WrScatterAxis, WrScatterPoint, WrScatterSeries } from './types';
