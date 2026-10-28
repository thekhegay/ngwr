/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import {
  Component,
  type ElementRef,
  LOCALE_ID,
  ViewEncapsulation,
  computed,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';

import { WrChartLegend, type WrChartLegendItem } from 'ngwr/charts/chart-legend';
import {
  type WrChartAxis,
  type WrChartMarkerExtent,
  type WrChartMarkerShape,
  WrChartTable,
  type WrChartTableData,
  chartAxis,
  chartColor,
  chartMarker,
  chartMarkerExtent,
  chartMarkerPath,
  useChartNumbers,
} from 'ngwr/charts/core';
import { useI18nText } from 'ngwr/i18n';
import { type WrChartTooltipRow, useChartTooltip } from 'ngwr/popover';
import { round } from 'ngwr/utils';

import type { WrScatterAxis, WrScatterSeries } from './types';

/** The radius, in px, of a point with no `size`: a marker as large as a 10px circle. */
const POINT_RADIUS = 5;

/** The smallest radius a sized point is drawn at, in px, however small its size: still a mark, still hoverable. */
const MIN_RADIUS = 4;

/** How far from a marker's centre, in px, the pointer still reads that point — or as far as the marker reaches, if farther. */
const HIT_RADIUS = 16;

/** How far outside its marker the hovered point's ring is drawn, in px. */
const HALO_GAP = 3;

/** A percentage to three decimals, so an attribute stays short. */
const percent = (value: number): number => Math.round(value * 1000) / 1000;

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
  /** How far its hover ring reaches from its centre, in px: what the tooltip points at and the pointer reads. */
  readonly halo: WrChartMarkerExtent;
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
 * square, a triangle, a diamond, a cross, a downward triangle — since the palette's
 * colours sit too close in lightness to be read alone. Neither axis is forced to include
 * zero: each is fitted to its data and snapped outward to a readable step, so no point
 * lands exactly on the frame, and a single value sits in the middle with a step either
 * side. A point can still sit a hair inside the frame, so the plot's padding grows to
 * the largest marker drawn, and a bubble at the edge stays inside the chart's own box.
 *
 * The drawing is one named `role="img"` and takes no tab stop; the tooltip is pointer
 * only. `dataTable` renders every value as a table only assistive technology reaches.
 * The legend is a `ul[wr-chart-legend]` (`ngwr/charts/chart-legend`), and with
 * `toggleableLegend` its rows show and hide their series through `hiddenSeries`.
 *
 * Hovering finds the nearest point by measuring every one, so a chart meant for more
 * than a few thousand points is better served by binning them first.
 *
 * @see https://ngwr.dev/charts/scatter-chart
 */
@Component({
  selector: 'wr-scatter-chart',
  templateUrl: './scatter-chart.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-scatter-chart',
    // A bubble chart's markers overlap as a rule, so they are drawn see-through.
    '[class.wr-scatter-chart--bubbles]': 'sized()',
    // How far the largest marker reaches, ring included: the stylesheet grows the plot's
    // padding to it, so a marker on the frame stays inside the plot.
    '[style.--wr-scatter-chart-reach-x]': 'reach().x',
    '[style.--wr-scatter-chart-reach-y]': 'reach().y',
  },
  imports: [WrChartLegend, WrChartTable],
})
export class WrScatterChart {
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
  private readonly ordinals = new Intl.NumberFormat(inject(LOCALE_ID));

  /** The plot's height in px, at least 80. @default 240 */
  readonly height = input(240, { transform: (v: unknown): number => Math.max(80, coerceNumberProperty(v, 240)) });

  /** Show the gridlines and the tick labels of both axes. @default true */
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
      color: s.color ?? chartColor(index),
      marker: chartMarker(index),
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
   * The x axis, from `chartAxis` over the points shown: fitted to the data with no zero
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
        const halo = chartMarkerExtent(s.marker, r + HALO_GAP);
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
          d: chartMarkerPath(s.marker, r),
          halo,
        };
      })
    );
    return drawn.sort((a, b) => b.r - a.r);
  });

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
    return { x: round(x, 3), y: round(Math.min(y, this.height() / 4), 3) };
  });

  /** The y ticks, top to bottom: each value's label and its gridline's distance from the top, in percent. */
  protected readonly yTicks = computed(() => {
    const { min, max, step, ticks } = this.yAxis();
    const labels = this.numbers.ticks(ticks, step, 'y');
    return ticks.map((value, i) => ({ label: labels[i], top: percent(((max - value) / (max - min)) * 100) }));
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
   * moving onto it, the way a sparkline is scrubbed.
   */
  protected readonly tip = useChartTooltip(
    this.tooltip,
    index => {
      const point = this.points()[index];
      const svg = this.svg()?.nativeElement;
      if (!point || !svg) return null;
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

  /** The point the tooltip is reading, ringed in the drawing. */
  protected readonly activePoint = computed(() => {
    const index = this.tip.active();
    return index === null ? null : (this.points()[index] ?? null);
  });

  /** The ring round the hovered point: its own shape, a little larger. */
  protected readonly haloPath = computed(() => {
    const point = this.activePoint();
    return point ? chartMarkerPath(point.marker, point.r + HALO_GAP) : '';
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
   */
  protected onPointerMove(event: MouseEvent): void {
    if (!this.tooltip()) return;
    const index = this.pointAt(event.clientX, event.clientY);
    if (index === null) this.tip.leave(event);
    else this.tip.enter(index);
  }

  /**
   * The point nearest a viewport position: within 16px of its centre, or within the
   * circle its hover ring fits in where that is larger — a triangle's point or a
   * diamond's tips reach past its radius — and the nearest centre where several qualify.
   * A drawing with no box (nothing laid out yet) answers nothing.
   */
  private pointAt(clientX: number, clientY: number): number | null {
    const svg = this.svg()?.nativeElement;
    if (!svg) return null;
    const box = svg.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return null;
    let best: number | null = null;
    let nearest = Number.POSITIVE_INFINITY;
    this.points().forEach((point, index) => {
      const distance = Math.hypot(
        box.left + (point.left / 100) * box.width - clientX,
        box.top + (point.top / 100) * box.height - clientY
      );
      if (distance <= Math.max(HIT_RADIUS, point.halo.radius) && distance < nearest) {
        nearest = distance;
        best = index;
      }
    });
    return best;
  }

  /** One axis over the points shown: `chartAxis` with both ends kept off the data, and one value centred. */
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
    // No point at all leaves both infinite, which `chartAxis` answers with the empty frame;
    // one value, or a column of them, it centres between a step on either side.
    return chartAxis(min, max, { symmetric: true });
  }
}

export type { WrScatterAxis, WrScatterPoint, WrScatterSeries } from './types';
