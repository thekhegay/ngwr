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
  type ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  input,
  isDevMode,
  linkedSignal,
  model,
  viewChild,
} from '@angular/core';

import { WrChartLegend, type WrChartLegendItem, type WrChartLegendPosition } from 'ngwr/charts/chart-legend';
import {
  type WrChartAxis,
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
  wrChartRound,
} from 'ngwr/charts/core';
import { useI18nText } from 'ngwr/i18n';
import { useChartTooltip } from 'ngwr/popover';
import { wrClamp, wrRound, wrCheckStyles } from 'ngwr/utils';

import type { WrRadarSeries, WrRadarVariant } from './types';

/** The drawing's centre, in its 100 × 100 viewBox. */
const CENTRE = 50;

/** The outer ring's radius, in the same units: the drawing's box is the outer ring's. */
const RADIUS = 50;

/**
 * How far past the outer ring the pointer may stray and still read an axis, as a share
 * of the radius: the dots on the outer ring overhang it.
 */
const REACH = 1.1;

/**
 * A ring value's line box in CSS pixels — `--wr-text-xs-leading`, which
 * `--wr-radar-chart-label-line-height` defaults to — until a browser has laid one out to
 * measure.
 */
const LABEL_LINE = 16;

/** The nice-number ladder's mantissas: the steps a fitted scale snaps to, times a power of ten. */
const LADDER = [1, 2, 2.5, 5];

/**
 * The ring step for an outer ring fixed at `max`: of the steps on the nice-number ladder
 * that divide `max` into a whole number of rings from 1 to 10, the one whose count is
 * nearest `rings`, and the fewer rings on a tie. A rating out of 5 gets a ring per point,
 * a score out of 100 a ring per 25. Only a `max` no step on the ladder divides — an outer
 * ring of 37 — is cut into `rings` equal parts.
 */
function fixedStep(max: number, rings: number): number {
  let best = max / rings;
  let distance = Number.POSITIVE_INFINITY;
  const top = Math.floor(Math.log10(max));
  // From the finest step to the coarsest, so a tie lands on the fewer rings. A step from
  // a tenth of `max` up to `max` gives 10 rings down to 1; one either side is room for
  // `log10` landing off by one at a power of ten.
  for (let e = top - 2; e <= top + 1; e++) {
    for (const mantissa of LADDER) {
      // Divided rather than multiplied below one, so 0.1 is the literal and not 1 × 10⁻¹.
      const step = e >= 0 ? mantissa * 10 ** e : mantissa / 10 ** -e;
      const count = Math.round(max / step);
      if (count < 1 || count > 10 || Math.abs(count * step - max) > max * 1e-9) continue;
      const off = Math.abs(count - rings);
      if (off > distance) continue;
      best = step;
      distance = off;
    }
  }
  return best;
}

/** A point in the viewBox. */
interface Point {
  readonly x: number;
  readonly y: number;
}

/** One axis: its name, its angle from three o'clock, clockwise, and the unit vector it runs along. */
interface Axis {
  readonly label: string;
  readonly angle: number;
  readonly cos: number;
  readonly sin: number;
}

/** A coordinate as a path writes it. */
const fixed = (value: number): string => value.toFixed(2);

/** A number for an inline style, to four decimals with `-0` folded to `0`, so the style stays short. */
const short = (value: number): number => wrChartRound(value, 4);

const at = (point: Point): string => `${fixed(point.x)} ${fixed(point.y)}`;

/** A zero-length line at a point, which a round cap paints as a dot of the stroke's width. */
const dot = (point: Point): string => `M ${at(point)} h 0`;

/**
 * A stand-in for the angle the ring values run along while there is no polygon to place
 * them by, fewer than three axes: up and to the right, clear of a spoke at twelve, three,
 * six or nine o'clock.
 */
const FREE_RAY = -Math.PI / 4;

const along = (axis: Axis, r: number): Point => ({ x: CENTRE + r * axis.cos, y: CENTRE + r * axis.sin });

/** The point `r` out from the centre at `angle`, clockwise from three o'clock. */
const toward = (angle: number, r: number): Point => ({
  x: CENTRE + r * Math.cos(angle),
  y: CENTRE + r * Math.sin(angle),
});

/**
 * A polar-area series' outline: the silhouette of its wedges, walked once round. Each
 * wedge is an arc of its own radius across its slice — `half` either side of its axis —
 * and the step from one wedge to the next is a straight run along the edge they share.
 * A wedge with no area (`null` or `0`) is the centre, so the walk dips to it there and
 * draws no arc: a missing value invents nothing, and its neighbours keep their edges.
 *
 * One closed path rather than a closed wedge per value, because two wedges side by side
 * share an edge: stroked twice, at two different dash phases, the dashes fill each
 * other's gaps and the edge reads solid, which is the one channel besides hue that tells
 * two series apart. The fill is the same path, which is every wedge's area at once.
 *
 * With three axes or more a slice spans 120° at most, so every arc is the small one, and
 * it sweeps clockwise as the axes run.
 */
function silhouette(axes: readonly Axis[], half: number, radii: readonly (number | null)[]): string {
  const commands: string[] = [];
  let last = '';
  const to = (point: Point): void => {
    const next = at(point);
    if (next !== last) commands.push(`${commands.length === 0 ? 'M' : 'L'} ${next}`);
    last = next;
  };
  radii.forEach((radius, a) => {
    const r = radius ?? 0;
    to(toward(axes[a].angle - half, r));
    if (r <= 0) return;
    last = at(toward(axes[a].angle + half, r));
    commands.push(`A ${fixed(r)} ${fixed(r)} 0 0 1 ${last}`);
  });
  return `${commands.join(' ')} Z`;
}

/** A ring with no polygon to follow — fewer than three axes — as a circle: two arcs, since one arc back to its start draws nothing. */
const circle = (r: number): string =>
  `M ${fixed(CENTRE - r)} ${CENTRE} A ${fixed(r)} ${fixed(r)} 0 1 0 ${fixed(CENTRE + r)} ${CENTRE} ` +
  `A ${fixed(r)} ${fixed(r)} 0 1 0 ${fixed(CENTRE - r)} ${CENTRE} Z`;

/**
 * A series' outline: closed through every axis when it has a value on each, and open
 * across every missing one otherwise — one subpath per unbroken run, walked once round
 * from the first gap, so a run that wraps past the last axis to the first is one stroke.
 * A run of one point repeats it, since a subpath of a single `M` is not stroked at all and
 * the value would vanish with `showDots` off; the round cap paints it as a dot.
 */
function outline(points: readonly (Point | null)[]): string {
  const gap = points.indexOf(null);
  if (gap === -1) return `M ${points.map(p => at(p!)).join(' L ')} Z`;

  const commands: string[] = [];
  let run: Point[] = [];
  const flush = (): void => {
    if (run.length === 1) commands.push(`M ${at(run[0])} L ${at(run[0])}`);
    else if (run.length > 1) commands.push(`M ${run.map(at).join(' L ')}`);
    run = [];
  };
  for (let k = 1; k <= points.length; k++) {
    const point = points[(gap + k) % points.length];
    if (point === null) flush();
    else run.push(point);
  }
  flush();
  return commands.join(' ');
}

/**
 * Radar chart: several series over the same axes, each a polygon on a polar grid — or,
 * with `variant="polar-area"`, a wedge per axis whose area is the value. For comparing a
 * few profiles — products, players, releases — across the same handful of measures.
 * SVG-only — no external dependency.
 *
 * @example
 * ```html
 * <wr-radar-chart
 *   [axes]="['Speed', 'Power', 'Range', 'Comfort', 'Price']"
 *   [series]="[
 *     { label: 'Model A', data: [80, 65, 70, 90, 55] },
 *     { label: 'Model B', data: [60, 85, 75, 60, 80] }
 *   ]"
 *   [max]="100"
 * />
 * ```
 *
 * **The geometry.** The first axis points to twelve o'clock and the rest follow
 * clockwise, evenly spaced. The scale runs from the centre to the outer ring and
 * includes zero, its rings on readable steps (`max` and `rings`), and every series is a
 * polygon in its colour and its own dash: a dash is what tells two outlines apart
 * without hue, the line chart's remedy. The fills sit under every outline.
 *
 * **The look is the chart theme's.** A series with no `color` takes the next colour of
 * the shared palette (`--wr-chart-1` to `--wr-chart-8`); the web is drawn in
 * `--wr-chart-grid`, the outlines at `--wr-chart-stroke` and the dots at
 * `--wr-chart-marker`, all in pixels at any `size`. Hovering an outline, a dot or a
 * legend row dims every other series.
 *
 * **A missing value is a gap, never a guess.** A `null`, a value that is not a finite
 * number, or one a shorter `data` does not reach, breaks the outline on either side of
 * its axis and the series is drawn OPEN and UNFILLED: closing the polygon across the gap
 * would draw a reading the data never took, and filling an open outline means closing it.
 *
 * **`variant="polar-area"` draws wedges instead of polygons.** Each axis owns an equal
 * slice of the circle, centred on it, and each series draws one wedge per value there,
 * the series overlaid with their fills translucent and their outlines in their own
 * dashes — one outline round each series' wedges, so the edge two wedges share is
 * stroked once and its dash survives. The value is the wedge's AREA: every wedge has the
 * same angle, so its area grows with the square of its radius, and the radius is the
 * square ROOT of the value's share of the scale — twice the value is twice the ink, where
 * a radius proportional to the value would paint four times as much. The rings are
 * circles, labelled with values, and they bunch towards the outside for the same reason,
 * so a ring value that would sit closer than a line to the one outside it is left out
 * and its ring still drawn. The scale starts at zero: a wedge grows from the centre, so
 * a negative value has no area and sits at the centre, and the tooltip and the data
 * table keep its figure. A missing value is a missing wedge, and every other wedge of
 * the series is drawn and filled, since each stands on its own value. The spokes run
 * between the wedges rather than through them.
 *
 * **Labels are HTML beside the drawing**, so they keep their size at any `size`: the axis
 * names sit outside the outer ring, in a gutter round the drawing, each aligned away from
 * the centre and ellipsised past the room it has — the tooltip and the data table carry
 * the whole name. The ring values sit on their rings BETWEEN two spokes, where no dot is
 * drawn and no axis name is near — straight down from the centre when the axes are odd in
 * number, between the first two when they are even, and a quarter of a slice past the
 * first axis in the polar-area variant — and are `aria-hidden`, as an axis' ticks are on
 * every chart here. One closer than a line to the last one kept is left out, and its ring
 * still drawn. The drawing keeps its clockwise order under RTL,
 * as every SVG chart here keeps its own — the HTML layouts (bar, bullet, treemap) are the
 * ones that mirror — and the labels follow the drawing.
 *
 * **What a screen reader gets.** The drawing is one named `role="img"` — on the `<svg>`
 * itself, as on the donut, since WebKit drops the whole subtree of an `img` wrapper and
 * the axis names are real text beside it. The numbers are in text only in the tooltip,
 * which is pointer only, and in the data table `dataTable` renders: say them in
 * `ariaLabel`, or turn the table on. No part of the chart is a tab stop, unless
 * `toggleableLegend` makes the legend rows buttons.
 *
 * With fewer than three axes there is no polygon to draw: the chart draws the grid
 * alone and says so in dev mode.
 *
 * **The legend** is a `ul[wr-chart-legend]` (`ngwr/charts/chart-legend`), placed by
 * `legendPosition` and left out for a single series unless `showLegend` asks for it. With
 * `toggleableLegend` its rows show and hide their series through `hiddenSeries`.
 *
 * **Empty, loading, error.** With no value to draw the chart keeps its web and its axis
 * names and says "No data"; `loading` and `error` put their own message there in place of
 * the series.
 *
 * @see https://ngwr.dev/charts/radar-chart
 */
@Component({
  selector: 'wr-radar-chart',
  templateUrl: './radar-chart.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    // `wr-chart--legend`: the shared rule that keeps the legend's room from the drawing.
    class: 'wr-radar-chart wr-chart--legend',
    '[class.wr-radar-chart--polygon]': '!polar()',
    '[class.wr-radar-chart--polar-area]': 'polar()',
    '[class.wr-chart--legend-side]': 'legendShown() && legendSide()',
  },
  imports: [NgTemplateOutlet, WrChartLegend, WrChartState, WrChartTable],
})
export class WrRadarChart {
  /**
   * The axes' names, clockwise from twelve o'clock. A series takes one value per axis,
   * in this order. Three at least: with fewer the chart draws the grid and no series.
   */
  readonly axes = input<readonly string[]>([]);

  /**
   * One polygon per series. A series with no `color` takes the next colour of the chart
   * palette, `--wr-chart-1` to `--wr-chart-8`, and each takes the next dash, the first
   * one solid.
   */
  readonly series = input<readonly WrRadarSeries[]>([]);

  /**
   * How the series are drawn. `'polygon'` joins each series' values into a polygon, one
   * vertex per axis. `'polar-area'` gives each axis an equal-angle wedge per series whose
   * AREA is the value — the radius grows with the square root of the value, so the ink
   * a wedge paints is proportional to what it stands for — with the series overlaid. The
   * legend, the toggle, the tooltip and the data table are the same in both.
   * @default 'polygon'
   */
  readonly variant = input<WrRadarVariant>('polygon');

  /**
   * Accessible name of the drawing. The shapes carry no text and the legend has the
   * series names only, so this is where to say what the chart shows — or turn on
   * `dataTable`. Falls back to `radarChart.label`, or to `radarChart.polarAreaLabel` in
   * the polar-area variant, which is also the data table's caption.
   */
  readonly ariaLabel = input<string | null>(null);

  private readonly polygonAriaLabel = useI18nText(this.ariaLabel, 'radarChart.label', 'Radar chart');

  private readonly polarAreaAriaLabel = useI18nText(this.ariaLabel, 'radarChart.polarAreaLabel', 'Polar area chart');

  protected readonly resolvedAriaLabel = computed(() =>
    this.polar() ? this.polarAreaAriaLabel() : this.polygonAriaLabel()
  );

  /**
   * The value of the outer ring. `0` fits the scale to the series shown, on a readable
   * step and including zero; a value above `0` fixes it, from zero at the centre — a score
   * out of 100, a rating out of 5 — with its rings on a readable step that divides it (see
   * `rings`). A value outside a fixed scale is drawn on its edge, and the tooltip and the
   * data table still give its own figure. @default 0
   */
  readonly max = input(0, {
    transform: (v: unknown): number => {
      const value = coerceNumberProperty(v, 0);
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    },
  });

  /**
   * About how many rings the grid draws between the centre and the outer ring, each on a
   * readable step — 1, 2, 2.5 or 5 times a power of ten. A fitted scale aims for this many
   * and rounds its step up onto that ladder. A fixed `max` takes the step that divides it into the count
   * nearest this one, the fewer on a tie, so a rating out of 5 gets a ring per point and a
   * score out of 100 a ring per 25; only a `max` that no such step divides, such as 37,
   * is cut into exactly this many equal rings. Whole numbers from 1 to 10. @default 4
   */
  readonly rings = input(4, {
    transform: (v: unknown): number => {
      const value = Math.round(coerceNumberProperty(v, 4));
      return Number.isFinite(value) ? wrClamp(value, 1, 10) : 4;
    },
  });

  /**
   * The drawing's diameter in CSS pixels, at least 120. The axis names sit in a gutter
   * round it, so the chart is wider than this by the gutter on either side; in a narrower
   * container the drawing shrinks to fit. @default 280
   */
  readonly size = input(280, {
    transform: (v: unknown): number => {
      const value = coerceNumberProperty(v, 280);
      return Number.isFinite(value) ? Math.max(120, value) : 280;
    },
  });

  /** Show the rings, the spokes and the ring values. The axis names stay. @default true */
  readonly showGrid = input(true, { transform: coerceBooleanProperty });

  /**
   * Show the legend. `'auto'` shows it when there is something to tell apart - two
   * series or more - and leaves it out for a single one; `true` shows it for one series
   * too. @default 'auto'
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
   * A request for the chart's data is in flight: the series give way to the loading
   * message, over the web and the axis names the chart had. @default false
   */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /**
   * The chart's data failed to load: the series give way to the error message. `loading`
   * wins while both are set. @default false
   */
  readonly error = input(false, { transform: coerceBooleanProperty });

  /** The message shown when there is nothing to draw. Falls back to `chart.empty`, then `'No data'`. */
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
   * A hidden series is left out of everything that reads its values: it draws no
   * polygon and no dots, it has no row in the tooltip and no column in the data table,
   * and a fitted scale is fitted to the series still shown. The axes do not change, since
   * they belong to the chart rather than to one series. The legend keeps the hidden
   * series' row, struck through, so it can be shown again; the row says "hidden" to a
   * screen reader as well. A position past the end of `series` is kept and ignored.
   */
  readonly hiddenSeries = model<readonly number[]>([]);

  /**
   * Show a dot at every value: on the polygon's vertex, or in the polar-area variant on
   * the middle of the wedge's arc, where the value reads against the rings. @default true
   */
  readonly showDots = input(true, { transform: coerceBooleanProperty });

  /**
   * Fill each closed polygon with its colour, faintly (`--wr-radar-chart-area-opacity`),
   * under every outline — the name the line chart and the sparkline give the same fill. A
   * series with a missing value is never filled, whatever this says: its outline is open.
   * In the polar-area variant every wedge is filled, since the outline round them always
   * closes, and a missing value is a missing wedge. @default true
   */
  readonly showArea = input(true, { transform: coerceBooleanProperty });

  /**
   * Show a tooltip for the axis nearest the pointer: its name, and every series' value
   * on it; an axis no series shown has a value on opens none. Pointer only — the data
   * table is where the same numbers are for a keyboard or a screen reader. @default true
   */
  readonly tooltip = input(true, { transform: coerceBooleanProperty });

  /**
   * Writes every number the chart shows: the ring values, the tooltip and the data
   * table. `null` uses `Intl.NumberFormat` in `LOCALE_ID`, with compact ring values
   * (`1.2K`) unless the full numbers are shorter.
   */
  readonly valueFormat = input<((value: number) => string) | null>(null);

  /**
   * Render the chart's figures as a table that only assistive technology reaches: a row
   * per axis, headed by its name, and a column per series shown, every value written the
   * way the tooltip writes it. A missing value is an empty cell.
   *
   * The drawing is one named `role="img"`, which hides everything inside it, so without
   * the table the numbers are nowhere a screen reader can walk. It is rendered beside the
   * drawing, clipped to nothing: it takes no room, draws nothing and holds no tab stop.
   * A hidden series leaves it. @default false
   */
  readonly dataTable = input(false, { transform: coerceBooleanProperty });

  /** The ring values' compact ticks and the exact figures, in `LOCALE_ID` unless `valueFormat` is given. */
  private readonly numbers = useChartNumbers(this.valueFormat);

  private readonly svg = viewChild<ElementRef<SVGSVGElement>>('svg');

  /** The first ring value laid out, whose box is one line of them. */
  private readonly ringLabel = viewChild<ElementRef<HTMLElement>>('ringLabel');

  /** The drawing's box and one ring value's, on the one observer every chart shares. Both 0 until laid out. */
  private readonly drawingSize = useChartSize(this.svg);
  private readonly ringLabelSize = useChartSize(this.ringLabel);

  /**
   * The drawing's laid-out width and a ring value's line box, both in CSS pixels, once a
   * browser has measured them: the drawing shrinks below `size` in a narrow container, and
   * how close two ring values may sit is a question of pixels, not of the viewBox. `null`
   * on the server and until the first measurement, which assume `size` and a 16px line.
   *
   * A hidden chart measures nothing, and keeps the last reading rather than thin to it;
   * no value laid out — `showGrid` off — measures no line, and keeps the line already known.
   */
  private readonly measured = linkedSignal<
    { readonly width: number; readonly height: number },
    { readonly width: number; readonly line: number } | null
  >({
    source: () => ({ width: this.drawingSize().width, height: this.ringLabelSize().height }),
    computation: ({ width, height }, previous) => {
      const last = previous?.value ?? null;
      if (width <= 0) return last;
      const line = height > 0 ? height : (last?.line ?? LABEL_LINE);
      return last?.width === width && last.line === line ? last : { width, line };
    },
  });

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('charts/radar-chart');
    // The shared hover-dim: every series' marks and its legend row carry `data-wr-series`.
    // The tooltip is not driven from here: it reads the axis nearest the pointer by
    // position, anywhere over the web, so no mark is a section.
    useChartHover({ enter: () => undefined, leave: () => undefined });

    // A radar of two axes is a line and one of one a point, so neither can hold a
    // polygon; the chart draws the grid and nothing else, which on screen looks like
    // data that failed to load rather than a refusal.
    if (isDevMode()) {
      let warned: number | null = null;
      effect(() => {
        const count = this.axes().length;
        if (count >= 3 || this.series().length === 0 || warned === count) return;
        warned = count;
        // eslint-disable-next-line no-console -- dev-mode validation
        console.warn(
          `[NGWR] <wr-radar-chart>: a radar needs at least three axes to draw a series, and it was given ${count}. ` +
            'It draws the grid alone.'
        );
      });
    }
  }

  /** Every axis, clockwise from twelve o'clock: the drawing's y runs downwards, so a growing angle turns clockwise. */
  private readonly axisGeometry = computed<readonly Axis[]>(() => {
    const axes = this.axes();
    return axes.map((label, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
      return { label, angle, cos: Math.cos(angle), sin: Math.sin(angle) };
    });
  });

  /** Whether the series are wedges rather than polygons. Anything but `'polar-area'` is the polygon. */
  protected readonly polar = computed(() => this.variant() === 'polar-area');

  /**
   * Whether there are axes enough for a polygon: three make the smallest one. The
   * polar-area variant keeps the same floor, so the two draw the same data.
   */
  private readonly drawable = computed(() => this.axes().length >= 3);

  /**
   * Every series, resolved: its palette colour, its dash, and one value per axis with
   * `null` where it is missing. Hidden ones included, since the legend lists them.
   */
  private readonly resolvedSeries = computed(() => {
    const count = this.axes().length;
    return this.series().map((s, index) => ({
      index,
      label: s.label,
      color: s.color ?? wrChartColor(index),
      dash: wrChartDash(index),
      values: Array.from({ length: count }, (_, a): number | null => {
        const value = s.data[a];
        return typeof value === 'number' && Number.isFinite(value) ? value : null;
      }),
    }));
  });

  /** The series drawn, read and fitted to: every one `hiddenSeries` does not name. */
  private readonly visibleSeries = computed(() => {
    const hidden = new Set(this.hiddenSeries());
    return this.resolvedSeries().filter(s => !hidden.has(s.index));
  });

  /**
   * The scale from the centre to the outer ring. A fixed `max` runs from zero, its rings
   * on the readable step that divides it (`fixedStep`). Otherwise it is `wrChartAxis` over
   * the series shown, including zero: the centre is zero unless a value is negative, and
   * then the scale's own minimum, which a radar shows as a smaller polygon rather than as
   * anything below a baseline — readable, and worth a fixed `max` where negative values
   * are the norm. The polar-area variant always starts at zero, since a wedge grows from
   * the centre: it is fitted to the largest value alone, and a negative value has no area.
   * With nothing to fit — or, for wedges, nothing above zero — it is the empty 0 to 1 frame.
   */
  private readonly scale = computed<WrChartAxis>(() => {
    const explicit = this.max();
    const rings = this.rings();
    if (explicit > 0) {
      const step = fixedStep(explicit, rings);
      const count = Math.round(explicit / step);
      const ticks = Array.from({ length: count + 1 }, (_, i) => wrRound(explicit - i * step, 6));
      return { min: 0, max: explicit, step, ticks };
    }
    // A loop rather than `Math.max(...values)`: a spread passes every value as an argument.
    let low = Number.POSITIVE_INFINITY;
    let peak = Number.NEGATIVE_INFINITY;
    for (const s of this.visibleSeries()) {
      for (const value of s.values) {
        if (value === null) continue;
        if (value < low) low = value;
        if (value > peak) peak = value;
      }
    }
    if (low > peak) return wrChartAxis(Number.NaN, Number.NaN);
    if (this.polar()) {
      return peak > 0
        ? wrChartAxis(0, peak, { includeZero: true, tickCount: rings })
        : wrChartAxis(Number.NaN, Number.NaN);
    }
    return wrChartAxis(low, peak, { includeZero: true, tickCount: rings });
  });

  /**
   * How far from the centre a value sits, in the viewBox, held to the scale: in proportion
   * to the value's share of the scale for a polygon, and to its square root for a wedge, so
   * a wedge's area — which grows with the square of its radius — is in proportion to the
   * value. The rings go through here too, so a ring labelled 25 out of 100 sits at half
   * the radius in the polar-area variant and a wedge reaching it has a quarter of the
   * outer ring's area.
   */
  private radius(value: number): number {
    const { min, max } = this.scale();
    const share = wrClamp((value - min) / (max - min), 0, 1);
    return RADIUS * (this.polar() ? Math.sqrt(share) : share);
  }

  /**
   * The shapes, one per series shown that has at least one value: its outline, whether
   * that outline is closed, the point at each axis (`null` where the value is missing),
   * and every dot of the series as ONE path, a subpath each - a path per dot was a
   * series' worth of elements for each series, and its `d` a string rebuilt for every
   * dot on every hover. Nothing at all with fewer than three axes.
   *
   * A polygon is closed only with a value on every axis. In the polar-area variant the
   * outline is the silhouette of the series' wedges, which always closes, and the point
   * at an axis is the middle of that wedge's arc — where its dot goes and its value reads
   * against the rings.
   */
  protected readonly shapes = computed(() => {
    if (!this.drawable()) return [];
    const axes = this.axisGeometry();
    const polar = this.polar();
    const half = Math.PI / axes.length;
    return this.visibleSeries().flatMap(s => {
      const radii = s.values.map(v => (v === null ? null : this.radius(v)));
      const points = radii.map((r, a) => (r === null ? null : along(axes[a], r)));
      if (points.every(p => p === null)) return [];
      return [
        {
          index: s.index,
          color: s.color,
          dash: s.dash,
          points,
          closed: polar || points.every(p => p !== null),
          d: polar ? silhouette(axes, half, radii) : outline(points),
          dots: points.flatMap(p => (p ? [dot(p)] : [])).join(' '),
        },
      ];
    });
  });

  /**
   * The rings, from the outer one in: a polygon through every axis, or a circle while
   * there are fewer than three axes to follow — and always a circle in the polar-area
   * variant, whose wedges end in arcs. The centre is the scale's minimum and gets no ring.
   */
  protected readonly ringPaths = computed(() => {
    const { min, ticks } = this.scale();
    const axes = this.axisGeometry();
    const polygon = axes.length >= 3 && !this.polar();
    return ticks
      .filter(tick => tick > min)
      .map(tick => {
        const r = this.radius(tick);
        return polygon ? `M ${axes.map(axis => at(along(axis, r))).join(' L ')} Z` : circle(r);
      });
  });

  /**
   * A spoke per axis, from the centre to the outer ring: along the axis for a polygon,
   * and on the edge between two wedges in the polar-area variant, where a spoke through
   * the middle of a wedge would cut its area in two.
   */
  protected readonly spokes = computed(() => {
    const axes = this.axisGeometry();
    if (!this.polar()) return axes.map(axis => along(axis, RADIUS));
    const half = Math.PI / axes.length;
    return axes.map(axis => toward(axis.angle - half, RADIUS));
  });

  /**
   * The ray the ring values are laid out along: its angle, and how far along it a ring
   * of radius 1 is crossed. Always BETWEEN two spokes, so no value sits on a spoke, on a
   * dot or under an axis name, which is where they sat while they ran up the first axis.
   *
   * - A polygon's rings are polygons too, and the middle of an edge is the point of a
   *   ring farthest from its spokes: `cos(π / n)` of the radius out, on the bisector of
   *   two axes. Of the bisectors the steepest is taken, so the values stack rather than
   *   run sideways into each other: straight down for an odd count of axes, where the
   *   bottom edge is level, and between the first two axes for an even one, where straight
   *   down is a spoke.
   * - The polar-area rings are circles, and the spokes run between the wedges, so the
   *   bisector is taken: the ray is a quarter of a slice past the first axis, half way
   *   between the dot on the wedge's arc and the spoke at its edge.
   * - With fewer than three axes there is no polygon: the rings are circles, and the ray
   *   is `FREE_RAY`.
   */
  private readonly labelRay = computed(() => {
    const count = this.axes().length;
    if (count < 3) return { angle: FREE_RAY, reach: 1 };
    const half = Math.PI / count;
    if (this.polar()) return { angle: -Math.PI / 2 + half / 2, reach: 1 };
    return { angle: count % 2 === 1 ? Math.PI / 2 : -Math.PI / 2 + half, reach: Math.cos(half) };
  });

  /**
   * The ring values, from the outer ring in, each with the point of its ring it sits on
   * as percentages of the drawing (`x`, `y`), along `labelRay`. Decided for the whole
   * scale, as an axis' ticks are (`useChartNumbers().ticks`).
   *
   * A value closer than one line to the last one kept is left out, walking inwards from
   * the outer ring — whose value always stays — while its ring is still drawn: the
   * polar-area rings sit at square-root radii, which bunch towards the outer ring, and a
   * polygon's values are closer together along an edge's bisector than its rings are
   * along a spoke. The distance is in pixels of the drawing as laid out (`measured`), or
   * of `size` until a browser has measured it.
   */
  protected readonly ringLabels = computed(() => {
    const { min, ticks, step } = this.scale();
    const texts = this.numbers.ticks(ticks, step);
    const { angle, reach } = this.labelRay();
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const labels = ticks.flatMap((tick, i) => {
      if (tick <= min) return [];
      // How far along the ray the ring is crossed, in the viewBox's units.
      const r = this.radius(tick) * reach;
      return [{ text: texts[i], r, x: short(CENTRE + r * cos), y: short(CENTRE + r * sin) }];
    });
    const { width, line } = this.measured() ?? { width: this.size(), line: LABEL_LINE };
    // One line, in the viewBox's units: the drawing is 100 of them wide.
    const room = (line / width) * 100;
    let kept = Number.POSITIVE_INFINITY;
    return labels.filter(label => {
      // A hair under a line still counts as one, so rounding never drops a value that fits.
      if (kept - label.r < room - 1e-6) return false;
      kept = label.r;
      return true;
    });
  });

  /**
   * Each axis name with the end of its spoke as percentages of the drawing (`x`, `y`) and
   * the direction it points (`cos`, `sin`): the stylesheet moves the label out from the
   * end along that direction and aligns it away from the centre — a name at three o'clock
   * starts at the spoke, one at twelve is centred over it.
   */
  protected readonly axisLabels = computed(() =>
    this.axisGeometry().map(axis => ({
      label: axis.label,
      x: short(CENTRE + RADIUS * axis.cos),
      y: short(CENTRE + RADIUS * axis.sin),
      cos: short(axis.cos),
      sin: short(axis.sin),
    }))
  );

  /** The legend's rows: every series, hidden ones included, keyed by its own dash. */
  protected readonly legendItems = computed<readonly WrChartLegendItem[]>(() =>
    this.resolvedSeries().map(({ label, color, dash }) => ({ label, color, dash }))
  );

  /**
   * Whether the chart draws its legend: unless `legendPosition` is `none` or `showLegend`
   * is off, and under `showLegend="auto"` only with two series or more, since a single
   * series has nothing to tell apart.
   */
  protected readonly legendShown = computed(() => {
    const show = this.showLegend();
    const rows = this.legendItems().length;
    if (show === false || rows === 0 || this.legendPosition() === 'none') return false;
    return show === true || rows > 1;
  });

  /** Whether the legend comes before the drawing, in the DOM as on screen: above it, or at inline start. */
  protected readonly legendFirst = computed(() => {
    const position = this.legendPosition();
    return position === 'top' || position === 'start';
  });

  /** Whether the legend sits beside the drawing rather than above or below it. */
  protected readonly legendSide = computed(() => {
    const position = this.legendPosition();
    return position === 'start' || position === 'end';
  });

  /**
   * Whether the chart has nothing to draw: no series, or none with a value on any axis.
   * A series hidden from the legend still counts, so hiding every series is not "No data".
   */
  private readonly empty = computed(() => this.resolvedSeries().every(s => s.values.every(v => v === null)));

  /** What the chart shows in place of its series, or `null` while it draws them. */
  protected readonly state = useChartState({
    loading: this.loading,
    error: this.error,
    empty: this.empty,
    emptyLabel: this.emptyLabel,
    loadingLabel: this.loadingLabel,
    errorLabel: this.errorLabel,
  });

  /**
   * The figures for `dataTable`: the drawing's name as the caption, a column per series
   * shown and a row per axis. Each cell is the series' own value, even where a fixed scale
   * draws it on the edge, written as the tooltip writes it, and empty where it is missing.
   * With every series hidden there is nothing to tabulate, and no rows.
   */
  protected readonly tableData = computed<WrChartTableData>(() => {
    const series = this.visibleSeries();
    const rows =
      series.length === 0
        ? []
        : this.axes().map((axis, a) => ({
            header: axis,
            cells: series.map(s => {
              const value = s.values[a];
              return value === null ? '' : this.numbers.value(value);
            }),
          }));
    return { caption: this.resolvedAriaLabel(), columns: series.map(s => s.label), groups: [{ rows }] };
  });

  /**
   * One tooltip for the whole chart, for the axis nearest the pointer: the axis' name as
   * its heading and a row per series shown with a value there. It points at the end of
   * the axis, on the side the axis faces — above for one in the top quarter, beside it
   * for the two at three and nine o'clock — so the chip sits outside the web, over the
   * axis' own name, which it repeats in full.
   *
   * The axis is chosen by POSITION, anywhere over the web: by angle, the nearest axis to
   * the pointer — in the polar-area variant, the axis whose wedges the pointer is over. So
   * the helper is told which axis any spot reads, and a pointer moving round the chart
   * scrubs from axis to axis.
   */
  protected readonly tip = useChartTooltip(
    this.tooltip,
    index => {
      const axis = this.axisGeometry()[index];
      const svg = this.svg()?.nativeElement;
      // No series is drawn under a state, so a chip open on an axis lets go.
      if (!this.drawable() || !axis || !svg || this.state()) return null;
      const box = svg.getBoundingClientRect();
      const { cos, sin } = axis;
      // The drawing's y runs downwards, so a positive sine is the lower half.
      const side = Math.abs(cos) > Math.abs(sin) ? (cos > 0 ? 'right' : 'left') : sin > 0 ? 'bottom' : 'top';
      const rows = this.visibleSeries().flatMap(s => {
        const value = s.values[index];
        return value === null ? [] : [{ label: s.label, value: this.numbers.value(value), color: s.color }];
      });
      // An axis no series shown has a value on — every series hidden, or every one missing
      // there — has nothing to say but its own name, which is already on screen.
      if (rows.length === 0) return null;
      return {
        datum: { label: axis.label, value: '', rows },
        anchor: {
          x: box.left + ((CENTRE + RADIUS * cos) / 100) * box.width,
          y: box.top + ((CENTRE + RADIUS * sin) / 100) * box.height,
        },
        side,
      };
    },
    (x, y) => this.axisAt(x, y)
  );

  /**
   * What the open tooltip marks on the drawing: its axis' spoke, and a ringed dot on every
   * series' value on it. Worked out when the hovered axis changes, never per render.
   */
  protected readonly hover = computed(() => {
    const index = this.tip.active();
    const axis = index === null ? undefined : this.axisGeometry()[index];
    if (index === null || !axis || !this.drawable() || this.state()) return null;
    const points = this.shapes().flatMap(s => {
      const point = s.points[index];
      return point ? [{ index: s.index, color: s.color, d: dot(point) }] : [];
    });
    // No crosshair without a value on it to mark, as there is no chip.
    if (points.length === 0) return null;
    return { end: along(axis, RADIUS), points };
  });

  /**
   * The axis under the pointer, heard on the drawing. A MOUSE event, as every chart's is:
   * a tap fires the compatibility `mousemove` and no `pointermove`. Off the web — the
   * drawing's corners, outside the outer ring and its dots — the tooltip lets go.
   */
  protected onPointerMove(event: MouseEvent): void {
    const index = this.axisAt(event.clientX, event.clientY);
    if (index === null) this.tip.leave(event);
    else this.tip.enter(index);
  }

  /**
   * The axis nearest a viewport point by angle, measured from the drawing's centre, or
   * `null` past the outer ring (with room for its dots), with nothing drawn, with no box
   * laid out to measure, or on an axis no series shown has a value on — so the tooltip
   * lets go there as it does off the web.
   */
  private axisAt(clientX: number, clientY: number): number | null {
    const count = this.axes().length;
    const svg = this.svg()?.nativeElement;
    if (!this.drawable() || !svg || this.state()) return null;
    const box = svg.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return null;
    const dx = clientX - (box.left + box.width / 2);
    const dy = clientY - (box.top + box.height / 2);
    if (Math.hypot(dx, dy) > (Math.min(box.width, box.height) / 2) * REACH) return null;
    // Clockwise from twelve o'clock, in [0, 2π).
    const turn = (Math.atan2(dy, dx) + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
    const index = Math.round(turn / ((2 * Math.PI) / count)) % count;
    return this.visibleSeries().some(s => s.values[index] !== null) ? index : null;
  }
}

export type { WrRadarSeries, WrRadarVariant } from './types';
