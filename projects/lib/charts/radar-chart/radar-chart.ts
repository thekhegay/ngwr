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
  ViewEncapsulation,
  computed,
  effect,
  input,
  isDevMode,
  model,
  viewChild,
} from '@angular/core';

import { WrChartLegend, type WrChartLegendItem } from 'ngwr/charts/chart-legend';
import {
  type WrChartAxis,
  WrChartTable,
  type WrChartTableData,
  chartAxis,
  chartColor,
  chartDash,
  useChartNumbers,
} from 'ngwr/charts/core';
import { useI18nText } from 'ngwr/i18n';
import { useChartTooltip } from 'ngwr/popover';
import { clamp, round } from 'ngwr/utils';

import type { WrRadarSeries } from './types';

/** The drawing's centre, in its 100 × 100 viewBox. */
const CENTRE = 50;

/** The outer ring's radius, in the same units: the drawing's box is the outer ring's. */
const RADIUS = 50;

/**
 * How far past the outer ring the pointer may stray and still read an axis, as a share
 * of the radius: the dots on the outer ring overhang it.
 */
const REACH = 1.1;

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

/** One axis: its name and the unit vector it runs along. */
interface Axis {
  readonly label: string;
  readonly cos: number;
  readonly sin: number;
}

/** A coordinate as a path writes it. */
const fixed = (value: number): string => value.toFixed(2);

/** A number for an inline style, to four decimals with `-0` folded to `0`, so the style stays short. */
const short = (value: number): number => Math.round(value * 1e4) / 1e4 || 0;

const at = (point: Point): string => `${fixed(point.x)} ${fixed(point.y)}`;

const along = (axis: Axis, r: number): Point => ({ x: CENTRE + r * axis.cos, y: CENTRE + r * axis.sin });

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
 * Radar chart: several series over the same axes, each a polygon on a polar grid. For
 * comparing a few profiles — products, players, releases — across the same handful of
 * measures. SVG-only — no external dependency.
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
 * polygon in its colour and its own dash: the default palette's colours sit within
 * about 1.06:1 of each other in luminance, so a dash is what tells two outlines apart
 * without hue, the line chart's remedy. The fills sit under every outline.
 *
 * **A missing value is a gap, never a guess.** A value that is not a finite number, or
 * one a shorter `data` does not reach, breaks the outline on either side of its axis and
 * the series is drawn OPEN and UNFILLED: closing the polygon across the gap would draw a
 * reading the data never took, and filling an open outline means closing it.
 *
 * **Labels are HTML beside the drawing**, so they keep their size at any `size`: the axis
 * names sit outside the outer ring, in a gutter round the drawing, each aligned away from
 * the centre and ellipsised past the room it has — the tooltip and the data table carry
 * the whole name. The ring values sit beside the first axis and are `aria-hidden`, as an
 * axis' ticks are on every chart here. The drawing does not mirror under RTL, as no chart
 * here does, and the labels follow the drawing.
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
 * The legend is a `ul[wr-chart-legend]` (`ngwr/charts/chart-legend`), and with
 * `toggleableLegend` its rows show and hide their series through `hiddenSeries`.
 *
 * @see https://ngwr.dev/charts/radar-chart
 */
@Component({
  selector: 'wr-radar-chart',
  templateUrl: './radar-chart.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-radar-chart' },
  imports: [WrChartLegend, WrChartTable],
})
export class WrRadarChart {
  /**
   * The axes' names, clockwise from twelve o'clock. A series takes one value per axis,
   * in this order. Three at least: with fewer the chart draws the grid and no series.
   */
  readonly axes = input<readonly string[]>([]);

  /**
   * One polygon per series. A series with no `color` takes the next entry from the
   * chart's palette, and each takes the next dash, the first one solid.
   */
  readonly series = input<readonly WrRadarSeries[]>([]);

  /**
   * Accessible name of the drawing. The polygons carry no text and the legend has the
   * series names only, so this is where to say what the chart shows — or turn on
   * `dataTable`. Falls back to `radarChart.label`, which is also the data table's caption.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'radarChart.label', 'Radar chart');

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
      return Number.isFinite(value) ? clamp(value, 1, 10) : 4;
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

  /** Show the legend under the chart. @default true */
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
   * A hidden series is left out of everything that reads its values: it draws no
   * polygon and no dots, it has no row in the tooltip and no column in the data table,
   * and a fitted scale is fitted to the series still shown. The axes do not change, since
   * they belong to the chart rather than to one series. The legend keeps the hidden
   * series' row, struck through, so it can be shown again; the row says "hidden" to a
   * screen reader as well. A position past the end of `series` is kept and ignored.
   */
  readonly hiddenSeries = model<readonly number[]>([]);

  /** Show a dot at every value. @default true */
  readonly showDots = input(true, { transform: coerceBooleanProperty });

  /**
   * Fill each closed polygon with its colour, faintly, under every outline. A series
   * with a missing value is never filled, whatever this says: its outline is open.
   * @default true
   */
  readonly fill = input(true, { transform: coerceBooleanProperty });

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

  constructor() {
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
      return { label, cos: Math.cos(angle), sin: Math.sin(angle) };
    });
  });

  /** Whether there are axes enough for a polygon: three make the smallest one. */
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
      color: s.color ?? chartColor(index),
      dash: chartDash(index),
      values: Array.from({ length: count }, (_, a): number | null => {
        const value = s.data[a];
        return Number.isFinite(value) ? value : null;
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
   * on the readable step that divides it (`fixedStep`). Otherwise it is `chartAxis` over
   * the series shown, including zero: the centre is zero unless a value is negative, and
   * then the scale's own minimum, which a radar shows as a smaller polygon rather than as
   * anything below a baseline — readable, and worth a fixed `max` where negative values
   * are the norm.
   * With nothing to fit it is the empty 0 to 1 frame.
   */
  private readonly scale = computed<WrChartAxis>(() => {
    const explicit = this.max();
    const rings = this.rings();
    if (explicit > 0) {
      const step = fixedStep(explicit, rings);
      const count = Math.round(explicit / step);
      const ticks = Array.from({ length: count + 1 }, (_, i) => round(explicit - i * step, 6));
      return { min: 0, max: explicit, step, ticks };
    }
    const values = this.visibleSeries().flatMap(s => s.values.filter((v): v is number => v !== null));
    if (values.length === 0) return chartAxis(Number.NaN, Number.NaN);
    return chartAxis(Math.min(...values), Math.max(...values), { includeZero: true, tickCount: rings });
  });

  /** How far from the centre a value sits, in the viewBox, held to the scale. */
  private radius(value: number): number {
    const { min, max } = this.scale();
    return RADIUS * clamp((value - min) / (max - min), 0, 1);
  }

  /**
   * The polygons, one per series shown that has at least one value: its outline, whether
   * that outline is closed, and the point at each axis (`null` where the value is missing).
   * Nothing at all with fewer than three axes.
   */
  protected readonly shapes = computed(() => {
    if (!this.drawable()) return [];
    const axes = this.axisGeometry();
    return this.visibleSeries().flatMap(s => {
      const points = s.values.map((v, a) => (v === null ? null : along(axes[a], this.radius(v))));
      if (points.every(p => p === null)) return [];
      return [
        {
          index: s.index,
          color: s.color,
          dash: s.dash,
          points,
          closed: points.every(p => p !== null),
          d: outline(points),
        },
      ];
    });
  });

  /**
   * The rings, from the outer one in: a polygon through every axis, or a circle while
   * there are fewer than three axes to follow. The centre is the scale's minimum and gets
   * no ring.
   */
  protected readonly ringPaths = computed(() => {
    const { min, ticks } = this.scale();
    const axes = this.axisGeometry();
    return ticks
      .filter(tick => tick > min)
      .map(tick => {
        const r = this.radius(tick);
        return axes.length >= 3 ? `M ${axes.map(axis => at(along(axis, r))).join(' L ')} Z` : circle(r);
      });
  });

  /** A spoke per axis, from the centre to the outer ring. */
  protected readonly spokes = computed(() => this.axisGeometry().map(axis => along(axis, RADIUS)));

  /**
   * The ring values, from the outer ring in, each with the height of its ring as a
   * percentage of the drawing, where the first axis crosses it. Decided for the whole
   * scale, as an axis' ticks are (`useChartNumbers().ticks`).
   */
  protected readonly ringLabels = computed(() => {
    const { min, ticks, step } = this.scale();
    const texts = this.numbers.ticks(ticks, step);
    return ticks.flatMap((tick, i) => (tick > min ? [{ text: texts[i], y: short(CENTRE - this.radius(tick)) }] : []));
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
   * The axis is chosen by POSITION, anywhere over the web: by angle, the nearest spoke to
   * the pointer. So the helper is told which axis any spot reads, and a pointer moving
   * round the chart scrubs from axis to axis.
   */
  protected readonly tip = useChartTooltip(
    this.tooltip,
    index => {
      const axis = this.axisGeometry()[index];
      const svg = this.svg()?.nativeElement;
      if (!this.drawable() || !axis || !svg) return null;
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
   * What the open tooltip marks on the drawing: its axis' spoke, and a ring round every
   * series' value on it.
   */
  protected readonly hover = computed(() => {
    const index = this.tip.active();
    const axis = index === null ? undefined : this.axisGeometry()[index];
    if (index === null || !axis || !this.drawable()) return null;
    const points = this.shapes().flatMap(s => {
      const point = s.points[index];
      return point ? [{ index: s.index, color: s.color, d: this.dotPath(point) }] : [];
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

  /** A zero-length line at a point, which a round cap paints as a dot of the stroke's width. */
  protected dotPath(point: Point): string {
    return `M ${at(point)} h 0`;
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
    if (!this.drawable() || !svg) return null;
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

export type { WrRadarSeries } from './types';
