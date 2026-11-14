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
  ElementRef,
  LOCALE_ID,
  ViewEncapsulation,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  isDevMode,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { WrChartLegend, type WrChartLegendItem, type WrChartLegendPosition } from 'ngwr/charts/chart-legend';
import {
  WrChartState,
  WrChartTable,
  type WrChartMarkerShape,
  type WrChartTableData,
  useChartHover,
  useChartNumbers,
  useChartSize,
  useChartState,
  wrChartAxis,
  wrChartColor,
  wrChartDash,
  wrChartLabelStep,
  wrChartLongest,
  wrChartMarker,
  wrChartMarkerExtent,
  wrChartMarkerPath,
  wrChartNumberFormat,
  wrChartRound,
} from 'ngwr/charts/core';
import { wrReadI18nText, useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { type WrChartTooltipRow, type WrChartTooltipTarget, useChartTooltip } from 'ngwr/popover';
import { wrClamp, wrCheckStyles } from 'ngwr/utils';

import type { WrBarChartDatum, WrBarLine, WrBarOrientation, WrBarSeries } from './types';

/** A share of the value axis for an inline style: four decimals, `-0` folded to `0`. */
const short = (value: number): number => wrChartRound(value, 4);

/** A share as a percentage of a line's box, to two decimals, `-0` folded to `0`. */
const percent = (share: number): number => wrChartRound(share * 100, 2);

/** How many of the longest printed strings a gutter or a room is measured from. */
const PROBES = 3;

/** The least room between two category names under the bars, in px, before they are thinned. */
const LABEL_GAP = 8;

/**
 * How large a line's point is, in px: the radius of the circle every marker shape has
 * the area of. A step up from the line chart's 3px dot, since a point here sits on a bar
 * rather than on the page and keeps a ring of the surface round it.
 */
const POINT_RADIUS = 4;

/** One series' bar in one category, as `series` draws it. */
interface SeriesBar {
  /** The series' position in `series`, which is what the bar is tracked by. */
  readonly series: number;
  readonly color: string;
  /** The series' own dash, `''` for a solid one: the `stroke-dasharray` its key in the legend had before bars were solid. */
  readonly dash: string;
  /**
   * Under `stacked`, how far down its side's paint order the bar sits, as a `z-index`: the
   * bar nearest zero is on top, and each one past it under the one before, since every
   * bar of a pile is drawn from zero to its own end. `null` side by side.
   */
  readonly layer: number | null;
  /** Where the bar starts along the value axis, as a share of it from its minimum. */
  readonly start: number;
  /** How much of the value axis the bar covers. */
  readonly size: number;
  /** The series' name and its own value: the bar's accessible name. */
  readonly name: string;
}

/** A value printed past the end of a bar, or of a pile of them. */
interface EndLabel {
  readonly text: string;
  /** Where the end is along the value axis, as a share of it from its minimum. */
  readonly at: number;
  /** Whether the bar grows towards the axis' minimum, so the value goes past that end. */
  readonly below: boolean;
  /**
   * What the printed value announces: a pile's total, "Total: 20", under `stacked`, where
   * no bar's own name carries it. `null` past a single bar, whose name already does.
   */
  readonly name: string | null;
}

/**
 * One lane of a category: the strip one bar runs along. Grouped, a lane per series
 * shown, side by side; stacked, one lane holding every series' bar.
 */
interface Lane {
  readonly key: number;
  /** The bars that grow up from zero (or along from it), nearest zero first. */
  readonly up: readonly SeriesBar[];
  /** The bars that grow down from zero, nearest zero first. */
  readonly down: readonly SeriesBar[];
  readonly ends: readonly EndLabel[];
}

/** One category drawn from `series`: its name and its lanes. */
interface Category {
  readonly label: string;
  readonly lanes: readonly Lane[];
  /** How far the category's bars reach along the value axis, as shares of it: what its tooltip points at. */
  readonly from: number;
  readonly to: number;
}

/** One tick of the value axis: its place, and the label printed beside it. */
interface Tick {
  readonly value: number;
  /** Where the tick is along the value axis, as a share of it from its minimum. */
  readonly at: number;
  readonly text: string;
}

/** The value axis: its two ends, and the ticks a grid and a scale are drawn at. */
interface Scale {
  readonly lo: number;
  readonly hi: number;
  /** The ticks, from the top down. Empty when neither the grid nor the axis is drawn. */
  readonly ticks: readonly number[];
  readonly step: number;
}

/**
 * Where something of a line sits in the line's own box, as percentages of it: `x` from
 * its left edge, `y` from its top. The box runs from the middle of the first category to
 * the middle of the last, so the categories are evenly spaced along it.
 */
interface LinePosition {
  readonly x: number;
  readonly y: number;
}

/** One point of a line: a category with a value. */
interface LinePoint extends LinePosition {
  /** The category's position, which is what the point is tracked by. */
  readonly category: number;
  /** The category's name and the line's value there: the point's accessible name. */
  readonly name: string;
}

/** One line of `lines`, as the chart draws it. */
interface LineLayer {
  /** The line's position in `lines`, which is what it is tracked by. */
  readonly index: number;
  readonly label: string;
  readonly color: string;
  /** The line's `stroke-dasharray`, `''` for a solid one. */
  readonly dash: string;
  readonly marker: WrChartMarkerShape;
  /** The marker's path, drawn about its point. */
  readonly d: string;
  /** How many categories the line's box spans, which the stylesheet sizes the box from. */
  readonly count: number;
  /**
   * The whole line as one path, in the 0 to 100 box the stylesheet stretches over the
   * line's own: a move to the first point of each run and a line to each one after it.
   * `''` for a line of lone points.
   */
  readonly path: string;
  /** How many straight runs `path` holds: one fewer than its points, less one for each break. */
  readonly segments: number;
  readonly points: readonly LinePoint[];
  /** The line's row in the legend, which is what the hover dims by. */
  readonly key: number;
}

/**
 * Bar chart. Pass `[data]` for one series — each datum becomes a bar — or `[series]`
 * with `[categories]` for several, drawn side by side or, with `stacked`, piled on each
 * other. Vertical by default; `orientation="horizontal"` lays the bars along the inline
 * axis with the category names in a gutter beside them. A grid and a value axis by
 * default (`showGrid`, `showAxis`), and the values printed at the bars on request
 * (`showValues`). No external dependency.
 *
 * @example
 * ```html
 * <wr-bar-chart [data]="[
 *   { label: 'Mon', value: 12 },
 *   { label: 'Tue', value: 18, color: 'var(--wr-color-success)' },
 *   { label: 'Wed', value: 9 }
 * ]" />
 *
 * <wr-bar-chart
 *   [categories]="['Q1', 'Q2', 'Q3', 'Q4']"
 *   [series]="[
 *     { label: 'North', data: [12, 18, 9, 22] },
 *     { label: 'South', data: [8, 11, 14, 10] }
 *   ]"
 *   stacked
 * />
 * ```
 *
 * **Several series.** Every category gets a bar per series shown, in series order —
 * or, with `stacked`, one pile, positive values up from zero and negative ones down
 * from it, each sign on its own, as `wr-line-chart` stacks. A negative value draws
 * below the zero line, which `series` draws wherever zero falls. Each series is a solid
 * fill in the next colour of the chart palette (`--wr-chart-1` to `--wr-chart-8`), whose
 * neighbours alternate between a deep and a mid tone, so two series side by side differ
 * in lightness as well as in hue; the segments of a pile are parted by a 1px line in
 * `--wr-chart-separator`. Hovering a bar or a legend row dims every other series.
 *
 * **Grid, axis and values.** The value axis is snapped to round numbers and drawn as
 * gridlines across the plot (`showGrid`) with a scale beside it (`showAxis`), both on by
 * default; `showValues` prints each value past the end of its bar, and is off by
 * default, since the scale already reads them. With the grid and the axis both off the
 * axis is fitted to the data instead, so the longest bar reaches the end of the plot.
 *
 * **Empty, loading, error.** With nothing to draw the chart keeps its frame and says
 * "No data"; `loading` and `error` put their own message there in place of the bars.
 * Each message has a `*Label` input over the catalog's `chart.*` keys.
 *
 * **`data` is unchanged**: one series, a bar per datum, a negative value drawn as an
 * empty bar with its number still printed — except beside `lines`, whose axis can reach
 * below zero: there a negative value is drawn down from zero, as `series` draws it. With
 * both set, `series` wins, and dev mode says so.
 *
 * **Lines over the bars.** `lines` draws a line per entry through the middle of each
 * category, with a point at every value, on the bars' own value axis: a fitted axis is
 * fitted to the bars and the lines together, so a line above every bar raises the top
 * and one below zero brings the zero line up, `data` bars included — and a negative
 * `data` bar draws down from it. It works with
 * `data` and with `series`, grouped or stacked, and lying down, where the lines run down
 * the rows. A line takes the next palette colour after the bars', its own dash, the
 * first one solid, and its own marker shape, the first a circle; the legend keys each
 * by both, the tooltip gives its value, and the data table a column. A line never
 * stacks, and prints no value at its points: the tooltip and each point's name carry it.
 * The track keeps room at each end of the value axis for the largest marker, so a point
 * at either end is not cut off by the chart's box.
 *
 * **What a screen reader gets.** The plot is a named `role="group"`. With `data`, each
 * bar is a `role="img"` named by its label and its value. With `series`, each category
 * is a `role="group"` named by the category, and each bar in it a `role="img"` named by
 * its series and its own value; under `stacked`, each pile's printed total is a
 * `role="img"` too, "Total: 20", since no bar's name carries it. Each of `lines` is a
 * `role="group"` named by the line, after the bars, and each of its points a
 * `role="img"` named by its category and the line's value there. No part of the chart is
 * a tab stop, unless
 * `toggleableLegend` makes the legend rows buttons. `dataTable` adds the same figures as
 * a table, for a reader who wants to move cell by cell.
 *
 * @see https://ngwr.dev/charts/bar-chart
 */
@Component({
  selector: 'wr-bar-chart',
  templateUrl: './bar-chart.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    // `wr-chart--legend`: the shared rule that keeps the legend's room from the plot.
    class: 'wr-bar-chart wr-chart--legend',
    '[class.wr-chart--legend-side]': 'legendShown() && legendSide()',
    '[class.wr-bar-chart--axis]': 'showAxis()',
    '[class.wr-bar-chart--horizontal]': 'horizontal()',
    '[class.wr-bar-chart--series]': 'seriesMode()',
    '[class.wr-bar-chart--stacked]': 'seriesMode() && stacked()',
    '[class.wr-bar-chart--combo]': 'hasLines()',
    // How far the largest of `lines`' markers reaches along the value axis: the room the
    // stylesheet keeps at each end of the track, so a point there stays in the chart's box.
    '[style.--wr-bar-chart-reach]': 'hasLines() ? lineReach() : null',
    // How many categories share the track: standing up, the gaps between them are held to
    // a share of the track by it, so a long list keeps its bars rather than gaps alone.
    '[style.--wr-bar-chart-categories]': 'categoryTotal() || null',
  },
  imports: [NgTemplateOutlet, WrChartLegend, WrChartState, WrChartTable],
})
export class WrBarChart {
  /**
   * The bars, left to right. One series: a datum with no `color` of its own
   * takes the chart's `color`, so by default every bar comes out the same.
   * A negative value draws an empty bar with its number printed — or, beside `lines`,
   * a bar down from zero. A value that is not a finite number is MISSING: an empty bar
   * with no number printed, named by its label alone, an empty cell in the data table.
   * Ignored while `series` has entries.
   */
  readonly data = input<readonly WrBarChartDatum[]>([]);

  /**
   * Several series over the same categories: one bar per series in every category,
   * side by side, or piled up with `stacked`. A series with no `color` takes the next
   * entry from the chart's palette, and each takes the next dash for its outline, the
   * first one solid. Wins over `data` while it has entries.
   */
  readonly series = input<readonly WrBarSeries[]>([]);

  /**
   * The categories' names for `series`, in order: a series takes one value per
   * category. A category past the end of this list, which a longer series reaches, is
   * named by its position, counting from 1, in `LOCALE_ID`'s digits. Not read with
   * `data`, whose datums carry their own labels.
   */
  readonly categories = input<readonly string[]>([]);

  /**
   * Lines drawn over the bars, through the middle of each category, with a point at
   * every value: a target, a rate, a running average beside the figures it describes.
   * Each takes one value per category, on the bars' own value axis, and a fitted axis is
   * fitted to the bars and the lines together. Works with `data` and with `series`,
   * grouped or stacked, standing up or lying down, where the lines run down the rows.
   *
   * A line with no `color` takes the palette's next colour after the bars' — past the
   * last series, or the palette's second beside `data` — and each takes the next dash and
   * the next marker shape, the first solid with a circle, so two lines differ without
   * hue. The legend lists every line after the series, keyed by its dash and its marker;
   * the tooltip gives each line's value in the category; the data table a column per line
   * after the series' columns, or after the bars'. A missing value breaks the line, and a
   * lone value between two missing ones is a point with no line. Lines never stack, and
   * print no value: the tooltip and each point's name carry it.
   *
   * Beside `data`, a negative bar draws down from zero rather than as an empty bar, since
   * the lines' axis can reach below zero and an empty bar there would read as zero. The
   * track keeps room at each end of the value axis for the largest marker, ring included,
   * so a point on either end is not cut off.
   */
  readonly lines = input<readonly WrBarLine[]>([]);

  /**
   * Pile each category's bars on each other, in series order, so the end of the pile
   * reads the total. Positive values pile up from zero and negative ones down from it,
   * each sign on its own, so no bar crosses another. A missing value adds nothing.
   * Each bar's accessible name, the tooltip and the data table keep each series' own
   * value; the value printed past a pile (`showValues`) is the pile's total, one for
   * each sign the category has, and announces itself as "Total: 20" (`barChart.total`).
   * `series` only. @default false
   */
  readonly stacked = input(false, { transform: coerceBooleanProperty });

  /**
   * Which way the bars run. `horizontal` lays them along the inline axis, one row per
   * category, with the names in a gutter at inline start as wide as the longest (up to
   * `--wr-bar-chart-label-max-width`, then ellipsised). Under RTL the gutter is on the
   * right and the bars grow leftwards. Lying down, `height` is the least the plot takes:
   * the rows share it, but each bar's row keeps at least `--wr-bar-chart-row-min-size`
   * (one line of the value's text), so a long list of categories or series grows the
   * chart rather than thinning its bars to nothing. @default 'vertical'
   */
  readonly orientation = input<WrBarOrientation>('vertical');

  /**
   * Accessible name of the chart. Falls back to `barChart.label`, then `'Bar chart'`.
   * Also the data table's caption.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'barChart.label', 'Bar chart');

  /**
   * The word a stacked pile's printed total announces itself by, "Total: 20". From the
   * catalog only, as the legend's "hidden" is: one word an app rewords once there.
   */
  private readonly totalText = wrReadI18nText('barChart.total', 'Total');

  /**
   * The data table's heading for the column of `data`'s bars, which have no series name
   * of their own. From the catalog only, as the total's word is.
   */
  private readonly valueText = wrReadI18nText('barChart.value', 'Value');

  /**
   * How a bar, a point and a pile's total name themselves: a label and a figure, "Mon: 12",
   * from the catalog, so a language that joins the two another way can.
   */
  private readonly datumText = useI18nFormatter('barChart.datum', '{{label}}: {{value}}');

  /** A category with no name of its own, by its position from 1 in the reader's own digits. */
  private readonly ordinals = wrChartNumberFormat(inject(LOCALE_ID));

  /**
   * Default bar colour when a datum has none: the chart palette's first colour, which is
   * the brand colour unless `--wr-chart-1` says otherwise. `data` only.
   * @default 'var(--wr-chart-1)'
   */
  readonly color = input<string>(wrChartColor(0));

  /**
   * Draw the gridlines: one across the plot at every tick of the value axis, level
   * standing up and upright lying down. Their colour is `--wr-bar-chart-grid-color`,
   * which defaults to the chart theme's `--wr-chart-grid`. With the grid or the axis on,
   * the value axis is snapped to round numbers; with both off it is fitted to the data.
   * @default true
   */
  readonly showGrid = input(true, { transform: coerceBooleanProperty });

  /**
   * Print the value axis' scale: a number at every tick, in a gutter at inline start
   * standing up and under the plot lying down, written compact (`1.2K`) or through
   * `valueFormat`. Decoration: the bars' names carry the values. @default true
   */
  readonly showAxis = input(true, { transform: coerceBooleanProperty });

  /**
   * Show value labels at each bar, past its end: above a bar standing up, beyond its end
   * lying down — below (or before) a negative `series` bar, and the pile's total for each
   * sign with `stacked`. A value too wide for a `series` bar standing up is left out
   * rather than cut, since a cut number reads as another one; the tooltip and each bar's
   * name carry it whole. Off by default, since the axis already reads the values.
   * @default false
   */
  readonly showValues = input(false, { transform: coerceBooleanProperty });

  /**
   * Pixel height of the chart area. With `orientation="horizontal"` it is the least the
   * plot takes: each bar's row keeps at least `--wr-bar-chart-row-min-size`, so rows that
   * need more grow the plot past it. @default 200
   */
  readonly height = input(200, { transform: (v: unknown): number => Math.max(40, coerceNumberProperty(v, 200)) });

  /**
   * Explicit max value. `0` = auto. With `series` it fixes the positive end of the axis;
   * the negative end is still fitted to the data. A value past it is drawn to the edge,
   * and its name, the tooltip and the data table still give its own figure. @default 0
   */
  readonly max = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /**
   * Show a tooltip with the bar's label and value on hover — with `series`, the
   * category's name and a row per series shown. Pointer only — the accessible names
   * already carry every value. @default true
   */
  readonly tooltip = input(true, { transform: coerceBooleanProperty });

  /**
   * Show the legend. With `series`, or beside `lines`, which it then lists. `'auto'`
   * shows it when there is something to tell apart - two series or more, or any line -
   * and leaves it out for a single series, which has nothing to key; `true` shows it
   * for one series too. @default 'auto'
   */
  readonly showLegend = input<boolean | 'auto', unknown>('auto', {
    transform: (value: unknown): boolean | 'auto' => (value === 'auto' ? 'auto' : coerceBooleanProperty(value)),
  });

  /**
   * Where the legend sits: `bottom` or `top` of the chart as a wrapping row, `start` or
   * `end` of it as a column, or `none` for no legend at all - `hiddenSeries` and
   * `hiddenLines` still hide a series from outside. @default 'bottom'
   */
  readonly legendPosition = input<WrChartLegendPosition>('bottom');

  /**
   * A request for the chart's data is in flight: the bars give way to the loading
   * message, over the grid and the axis the chart had. @default false
   */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /**
   * The chart's data failed to load: the bars give way to the error message. `loading`
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
   * `hiddenSeries` — or its line, through `hiddenLines`. A row is a
   * `<button aria-pressed>`, pressed while its series is shown, so the legend becomes one
   * tab stop per row. With `series`, or beside `lines`. @default false
   */
  readonly toggleableLegend = input(false, { transform: coerceBooleanProperty });

  /**
   * The positions in `series` of the series that are hidden. Positions rather than
   * labels, since two series may share a label. A toggleable legend writes it, and a
   * host may bind it with or without one: `[(hiddenSeries)]`.
   *
   * A hidden series is left out of everything that reads its values: it draws no bars
   * and leaves its lane, so the others widen; it leaves the stack, the tooltip and the
   * data table; and a fitted axis is fitted to the series still shown. The categories do
   * not change, since they belong to the chart rather than to one series. The legend
   * keeps the hidden series' row, struck through, so it can be shown again. A position
   * past the end of `series` is kept and ignored.
   */
  readonly hiddenSeries = model<readonly number[]>([]);

  /**
   * The positions in `lines` of the lines that are hidden, as `hiddenSeries` holds the
   * series': a toggleable legend writes it, and a host may bind it with or without one,
   * `[(hiddenLines)]`. A hidden line draws nothing and leaves the tooltip and the data
   * table, and a fitted axis is fitted to what is still shown. The legend keeps its row,
   * struck through. A position past the end of `lines` is kept and ignored.
   */
  readonly hiddenLines = model<readonly number[]>([]);

  /**
   * Render the chart's figures as a table that only assistive technology reaches: a row
   * per category, headed by its name, and a column per series shown — or, with `data`,
   * one column for the bars, headed "Value" (`barChart.value`) — then one per line shown,
   * every value written the way the tooltip writes it. A missing value is an empty cell,
   * and a stacked chart's table keeps each series' own values.
   *
   * Each bar's accessible name already carries its value; the table is for a reader
   * who wants to move cell by cell. It is rendered beside the plot, clipped to nothing:
   * it takes no room, draws nothing and holds no tab stop. A hidden series or line leaves
   * it. @default false
   */
  readonly dataTable = input(false, { transform: coerceBooleanProperty });

  /**
   * Writes every number the chart shows: the labels at the bars, the tooltip and
   * each bar's accessible name. `null` uses `Intl.NumberFormat` in `LOCALE_ID`, with
   * compact labels from a thousand up (`1.2K`, `3.4M`).
   */
  readonly valueFormat = input<((value: number) => string) | null>(null);

  /**
   * The chart's number writers: `value` for the tooltip and each bar's accessible
   * name, the whole figure; `label` above the bar, compact from a thousand up, where a
   * column is too narrow for `1,234,567`, and exactly as `value` writes it below —
   * compact rounding would print 12.5 as `13`, and below a thousand there is nothing to
   * abbreviate.
   */
  private readonly numbers = useChartNumbers(this.valueFormat);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** The track every bar, the grid and each line is drawn in: the box of the value axis. */
  private readonly trackEl = viewChild<ElementRef<HTMLElement>>('trackEl');

  /** The row of category names under the bars, standing up: what the names are thinned against. */
  private readonly labelsEl = viewChild<ElementRef<HTMLElement>>('labelsEl');

  /** How wide the row of category names is, in px: 0 until it is laid out, and lying down. */
  private readonly labelsSize = useChartSize(this.labelsEl);

  /** How wide the longest category name is, in px: 0 until it is measured. */
  private readonly labelWidth = signal(0);

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('charts/bar-chart');
    // One listener pair for the whole chart: a section is whatever carries `data-wr-index`.
    useChartHover({ enter: index => this.tip.enter(index), leave: event => this.tip.leave(event) });
    // The longest names, from the hidden copies the label row keeps: read after each
    // render that may have changed them, and written only when the width moved.
    afterRenderEffect(() => {
      const row = this.labelsEl()?.nativeElement;
      this.labelProbes();
      this.labelsSize();
      if (!row) return;
      let width = 0;
      for (const probe of row.querySelectorAll('.wr-bar-chart__label-probe')) {
        width = Math.max(width, probe.getBoundingClientRect().width);
      }
      if (width !== untracked(this.labelWidth)) this.labelWidth.set(width);
    });
    // Two inputs that each describe the whole chart: drawing one and silently dropping
    // the other looks like data that failed to load.
    if (isDevMode()) {
      let warned = false;
      effect(() => {
        if (warned || this.data().length === 0 || this.series().length === 0) return;
        warned = true;
        // eslint-disable-next-line no-console -- dev-mode validation
        console.warn(
          '[NGWR] <wr-bar-chart>: both `data` and `series` are set. The chart draws `series` and ignores `data`; ' +
            'pass one of them.'
        );
      });
    }
  }

  /** Whether the chart draws `series` rather than `data`. */
  protected readonly seriesMode = computed(() => this.series().length > 0);

  protected readonly horizontal = computed(() => this.orientation() === 'horizontal');

  /**
   * Whether the chart has `lines` to draw, shown or hidden. Beside `data` it moves the
   * bars into the layout `series` uses, whose track the lines are drawn over; hiding
   * every line keeps that layout, so a legend toggle never reflows the bars.
   */
  protected readonly hasLines = computed(() => this.lines().length > 0);

  /**
   * A datum's value, with anything non-finite read as `0` for the geometry.
   *
   * One `NaN` used to take out the whole chart rather than its own bar:
   * `Math.max(...values)` is `NaN` as soon as one value is, so the scale fell
   * back to `1` and every OTHER bar was asked for a height of `value * 100`%.
   * The bad bar also printed the literal text `NaN` above itself. It is not a zero
   * either, so nothing a reader meets prints one for it (see `bars`).
   */
  private static value(raw: number): number {
    return Number.isFinite(raw) ? raw : 0;
  }

  /** A label and a figure, as a name: "Mon: 12". */
  private name(label: string, value: number): string {
    return this.datumText({ label, value: this.numbers.value(value) });
  }

  /** How many categories the chart draws, whichever input it draws. */
  protected readonly categoryTotal = computed(() => (this.seriesMode() ? this.categoryCount() : this.data().length));

  /**
   * The value axis for `data`, from `lo` to `hi`: from zero to the tallest bar, or to
   * `max` when one is given. Beside `lines` it is stretched to every line value shown and
   * to every bar below zero — which then draws down from zero, as a `series` bar does,
   * rather than as an empty bar that would read as zero on an axis reaching below it — so
   * either lifts the zero line the bars stand on. With nothing to scale it runs from 0
   * to 1.
   */
  private readonly dataScale = computed(() => {
    const data = this.data();
    // Whether `lines` are set, shown or not: hiding every line keeps the layout, and with
    // it a negative bar's place below zero.
    const combo = this.hasLines();
    let lo = 0;
    let hi = 0;
    for (const d of data) {
      const value = WrBarChart.value(d.value);
      hi = Math.max(hi, value);
      if (combo) lo = Math.min(lo, value);
    }
    for (const line of this.visibleLines()) {
      for (let c = 0; c < data.length; c++) {
        const v = line.data[c];
        if (v === null || v === undefined) continue;
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
    const explicit = this.max();
    if (explicit > 0) hi = explicit;
    if (hi - lo <= 0) hi = 1;
    return { lo, hi };
  });

  protected readonly bars = computed(() => {
    const { lo, hi } = this.scale();
    // Zero is the axis minimum until a line or, beside lines, a bar goes below it; the bars
    // stand on it, and a bar's share is of the whole axis, so it can reach no further than
    // the top. Beside `lines` a negative bar hangs from zero down to its value; without
    // them it is an empty bar on zero.
    const combo = this.hasLines();
    const floor = this.at(0);
    const zero = this.zero();
    return this.data().map(d => {
      const value = WrBarChart.value(d.value);
      // A missing value is drawn as the empty bar a zero is, and printed as nothing.
      const missing = !Number.isFinite(d.value);
      const text = missing ? '' : this.numbers.value(value);
      const below = combo && value < 0;
      const share = below ? Math.min(floor, -value / (hi - lo)) : Math.min(1 - floor, Math.max(0, value) / (hi - lo));
      return {
        label: d.label,
        value,
        /** Whether the datum's value is not a finite number: no figure is printed, named or tabled for it. */
        missing,
        /** The label printed above the bar. */
        display: missing ? '' : this.numbers.label(value),
        /** The whole figure, for the tooltip. */
        text,
        color: d.color ?? this.color(),
        /**
         * How much of the value axis the bar covers, from 0 to 1. The stylesheet draws
         * the bar from it and from `start`, as a transform.
         */
        share: short(share),
        /** Whether the bar hangs below zero, beside `lines`: its value is printed past its lower end. */
        below,
        /**
         * Where the bar starts along the value axis, from its minimum: zero, or the bar's
         * own end for one below it.
         */
        start: below ? short(zero - share) : zero,
        /** Where the bar ends along the value axis, from its minimum: what the value printed past it is placed by. */
        at: below ? short(zero - share) : short(zero + share),
        /**
         * The bar's accessible name. The label and the value sit in separate
         * rows, so a screen reader read every number and then every label with
         * nothing tying the two together — and with `showValues` off the
         * numbers were not in the accessible tree at all. A missing value is the
         * label alone.
         */
        name: missing ? d.label : this.name(d.label, value),
      };
    });
  });

  /**
   * Every series, resolved: its palette colour, its dash, and its data with `null` at
   * every missing value. Hidden ones included, since the legend lists them.
   */
  private readonly resolvedSeries = computed(() =>
    this.series().map((s, index) => ({
      index,
      label: s.label,
      color: s.color ?? wrChartColor(index),
      dash: wrChartDash(index),
      data: s.data.map(v => (typeof v === 'number' && Number.isFinite(v) ? v : null)),
    }))
  );

  /** The series drawn, read and fitted to: every one `hiddenSeries` does not name. */
  private readonly visibleSeries = computed(() => {
    const hidden = new Set(this.hiddenSeries());
    return this.resolvedSeries().filter(s => !hidden.has(s.index));
  });

  /**
   * Every line, resolved: its colour — the palette's next after the bars' — its dash, its
   * marker, and its data with `null` at every missing value. Hidden ones included, since
   * the legend lists them.
   */
  private readonly resolvedLines = computed(() => {
    // Past the series' colours, or past the one `data` paints its bars in by default.
    const offset = this.seriesMode() ? this.series().length : 1;
    return this.lines().map((line, index) => ({
      index,
      label: line.label,
      color: line.color ?? wrChartColor(offset + index),
      dash: wrChartDash(index),
      marker: wrChartMarker(index),
      data: line.data.map(v => (typeof v === 'number' && Number.isFinite(v) ? v : null)),
    }));
  });

  /** The lines drawn, read and fitted to: every one `hiddenLines` does not name. */
  private readonly visibleLines = computed(() => {
    const hidden = new Set(this.hiddenLines());
    return this.resolvedLines().filter(line => !hidden.has(line.index));
  });

  /** How many categories `series` has: as many as are named, or as the longest series reaches. */
  private readonly categoryCount = computed(() =>
    this.resolvedSeries().reduce((count, s) => Math.max(count, s.data.length), this.categories().length)
  );

  /**
   * The value axis for `series`, from `lo` (zero or below) to `hi` (above zero): the
   * extremes of the series shown, or of their piles under `stacked`, and of the lines
   * shown, so the longest bar or the farthest point reaches the end of the plot, as it
   * does with `data`. A positive `max` fixes `hi`. With nothing to scale it runs from 0
   * to 1.
   */
  private readonly seriesScale = computed(() => {
    const series = this.visibleSeries();
    const lines = this.visibleLines();
    const stacked = this.stacked();
    let lo = 0;
    let hi = 0;
    for (let c = 0; c < this.categoryCount(); c++) {
      let up = 0;
      let down = 0;
      for (const s of series) {
        const v = s.data[c];
        if (v === null || v === undefined) continue;
        if (!stacked) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        } else if (v < 0) down += v;
        else up += v;
      }
      lo = Math.min(lo, down);
      hi = Math.max(hi, up);
      // A line shares the axis, and never stacks.
      for (const line of lines) {
        const v = line.data[c];
        if (v === null || v === undefined) continue;
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
    const explicit = this.max();
    if (explicit > 0) hi = explicit;
    if (hi - lo <= 0) hi = 1;
    return { lo, hi };
  });

  /**
   * The value axis the chart draws on: `series`' or `data`'s, and the ticks its grid and
   * its scale are drawn at.
   *
   * With the grid or the axis shown, the ends are snapped outward to a round step (1, 2,
   * 2.5 or 5 times a power of ten), so every gridline is a number a reader can do
   * arithmetic against. The top stops at the data's peak when that is already a tick: a
   * bar ending on the top gridline is not cut off, the way a line ending on the frame
   * reads. An explicit `max` is the top as given, with the ticks that fit under it. With
   * neither shown there is nothing to snap for, and the axis is the data's own extent,
   * so the longest bar reaches the end of the plot.
   */
  private readonly scale = computed<Scale>(() => {
    const { lo, hi } = this.seriesMode() ? this.seriesScale() : this.dataScale();
    if (!this.showGrid() && !this.showAxis()) return { lo, hi, ticks: [], step: hi - lo };
    const axis = wrChartAxis(lo, hi, { includeZero: true });
    const fixed = this.max() > 0;
    // A tick is a whole multiple of the step, so a sliver of one is tolerance enough for
    // "the peak is on this tick" and for "this tick is under the top".
    const slack = axis.step * 1e-6;
    const top = fixed ? hi : (axis.ticks.find(tick => Math.abs(tick - hi) <= slack) ?? axis.max);
    return {
      lo: axis.min,
      hi: top,
      ticks: axis.ticks.filter(tick => tick <= top + slack),
      step: axis.step,
    };
  });

  /** The ticks of the value axis, from the top down: where each is, and the label beside it. */
  protected readonly ticks = computed<readonly Tick[]>(() => {
    const { ticks, step } = this.scale();
    const labels = this.showAxis() ? this.numbers.ticks(ticks, step) : [];
    return ticks.map((value, index) => ({ value, at: short(this.at(value)), text: labels[index] ?? '' }));
  });

  /** The longest tick labels, as hidden copies the axis gutter takes its width from. */
  protected readonly tickProbes = computed(() =>
    wrChartLongest(
      this.ticks().map(tick => tick.text),
      PROBES
    )
  );

  /** A value's place along the value axis, as a share of it from its minimum, held to the axis. */
  private at(value: number): number {
    const { lo, hi } = this.scale();
    return wrClamp((value - lo) / (hi - lo), 0, 1);
  }

  /**
   * Every category `series` draws, with its lanes: grouped, a lane per series shown, a
   * missing value leaving its lane empty so the bars beside it keep their places;
   * stacked, one lane holding each series' bar on the pile of the ones before it on the
   * same side of zero. With `showValues`, a lane also carries the values printed past
   * its ends: each bar's own, or each pile's total.
   */
  protected readonly seriesCategories = computed<readonly Category[]>(() => {
    if (!this.seriesMode()) return [];
    const series = this.visibleSeries();
    const labels = this.categories();
    const values = this.showValues();
    const stacked = this.stacked();
    const zero = this.at(0);
    const name = (label: string, value: number): string => this.name(label, value);

    return Array.from({ length: this.categoryCount() }, (_, c): Category => {
      const label = labels[c] ?? this.ordinals.format(c + 1);
      let from = zero;
      let to = zero;
      const reach = (start: number, size: number): void => {
        from = Math.min(from, start);
        to = Math.max(to, start + size);
      };
      if (!stacked) {
        const lanes = series.map((s): Lane => {
          const v = s.data[c];
          if (v === null || v === undefined) return { key: s.index, up: [], down: [], ends: [] };
          const end = this.at(v);
          const bar: SeriesBar = {
            series: s.index,
            color: s.color,
            dash: s.dash,
            layer: null,
            start: short(Math.min(zero, end)),
            size: short(Math.abs(end - zero)),
            name: name(s.label, v),
          };
          reach(bar.start, bar.size);
          return {
            key: s.index,
            up: v < 0 ? [] : [bar],
            down: v < 0 ? [bar] : [],
            ends: values ? [{ text: this.numbers.label(v), at: short(end), below: v < 0, name: null }] : [],
          };
        });
        return { label, lanes, from: short(from), to: short(to) };
      }

      let rise = 0;
      let fall = 0;
      const up: SeriesBar[] = [];
      const down: SeriesBar[] = [];
      for (const s of series) {
        const v = s.data[c];
        if (v === null || v === undefined) continue;
        const side = v < 0 ? down : up;
        const base = v < 0 ? fall : rise;
        const top = base + v;
        if (v < 0) fall = top;
        else rise = top;
        const start = this.at(base);
        const end = this.at(top);
        const bar: SeriesBar = {
          series: s.index,
          color: s.color,
          dash: s.dash,
          // Every bar of a pile is drawn from zero to its own end, so the one nearest zero
          // lies over the ones past it.
          layer: -side.length,
          start: short(Math.min(start, end)),
          size: short(Math.abs(end - start)),
          name: name(s.label, v),
        };
        reach(bar.start, bar.size);
        side.push(bar);
      }
      // A pile's total is printed, and no bar's own name carries it, so the printed value
      // announces itself — with the whole figure, as a bar's name does.
      const total = (value: number, below: boolean): EndLabel => ({
        text: this.numbers.label(value),
        at: short(this.at(value)),
        below,
        name: name(this.totalText(), value),
      });
      const ends: EndLabel[] = [];
      if (values && up.length > 0) ends.push(total(rise, false));
      if (values && down.length > 0) ends.push(total(fall, true));
      return { label, lanes: [{ key: 0, up, down, ends }], from: short(from), to: short(to) };
    });
  });

  /** The category names, in order, whichever input the chart draws. */
  protected readonly categoryLabels = computed(() =>
    this.seriesMode() ? this.seriesCategories().map(c => c.label) : this.data().map(d => d.label)
  );

  /**
   * Where zero is along the value axis, as a share of it: the baseline. `data` goes below
   * zero only where one of `lines` does.
   */
  protected readonly zero = computed(() => short(this.at(0)));

  /**
   * The longest values printed past each end of the axis: the room the plot keeps beyond
   * that end is a hidden copy of these, so it is as large as the largest, in the value's
   * own font. The few longest by length, not every value: ten thousand bars used to
   * keep ten thousand hidden copies to learn the width of one.
   */
  protected readonly rooms = computed(() => {
    if (!this.showValues()) return { max: [], min: [] };
    const ends = this.seriesMode()
      ? this.seriesCategories().flatMap(c => c.lanes.flatMap(lane => lane.ends))
      : this.bars()
          .filter(bar => !bar.missing)
          .map(bar => ({ text: bar.display, below: bar.below }));
    return {
      max: wrChartLongest(
        ends.filter(end => !end.below).map(end => end.text),
        PROBES
      ),
      min: wrChartLongest(
        ends.filter(end => end.below).map(end => end.text),
        PROBES
      ),
    };
  });

  /** The longest category names, as hidden copies the label row is thinned against. */
  protected readonly labelProbes = computed(() =>
    this.horizontal() ? [] : wrChartLongest(this.categoryLabels(), PROBES)
  );

  /**
   * How many categories each printed name stands for, standing up: 1 while the longest
   * name fits its own band, 2 to print every second one, and so on, so a long list
   * keeps whole names rather than a row of ellipses. 1 until the row is measured.
   */
  protected readonly labelStep = computed(() =>
    wrChartLabelStep(this.categoryTotal(), this.labelsSize().width, this.labelWidth(), LABEL_GAP)
  );

  /**
   * Every line shown, as the chart draws it: its segments and its points, placed in the
   * line's own box. The box runs from the middle of the first category to the middle of
   * the last (the stylesheet sizes it from `count`), so category `c` of `n` is `c / (n − 1)`
   * of the way along it — or its middle, with one category. Across the box is the value
   * axis: up from the bottom standing up, along from inline start lying down, where the
   * stylesheet mirrors the box under RTL as the bars mirror.
   */
  protected readonly lineLayers = computed<readonly LineLayer[]>(() => {
    const count = this.seriesMode() ? this.categoryCount() : this.data().length;
    if (count === 0) return [];
    const labels = this.categoryLabels();
    const horizontal = this.horizontal();
    const along = (c: number): number => (count === 1 ? 50 : percent(c / (count - 1)));
    const place = (c: number, value: number): LinePosition => {
      const at = this.at(value);
      return horizontal ? { x: percent(at), y: along(c) } : { x: along(c), y: percent(1 - at) };
    };

    const offset = this.resolvedSeries().length;
    return this.visibleLines().map((line): LineLayer => {
      const points: LinePoint[] = [];
      let path = '';
      let segments = 0;
      let drawing = false;
      for (let c = 0; c < count; c++) {
        const value = line.data[c];
        if (value === null || value === undefined) {
          // A missing value breaks the line: the next point starts a new run.
          drawing = false;
          continue;
        }
        const position = place(c, value);
        path += `${drawing ? 'L' : 'M'}${position.x} ${position.y}`;
        if (drawing) segments++;
        points.push({ ...position, category: c, name: this.name(labels[c] ?? this.ordinals.format(c + 1), value) });
        drawing = true;
      }
      return {
        index: line.index,
        label: line.label,
        color: line.color,
        dash: line.dash,
        marker: line.marker,
        d: wrChartMarkerPath(line.marker, POINT_RADIUS),
        count,
        // A run of one point draws nothing, so a line of lone points has no path at all.
        path: segments > 0 ? path : '',
        segments,
        points,
        key: offset + line.index,
      };
    });
  });

  /**
   * How far the largest of `lines`' markers reaches past its point along the value axis,
   * in px, before its ring: up or down standing up, sideways lying down. By SHAPE, not
   * radius — a triangle's point stands 1.56 times its radius off its centre. Every line
   * counts, hidden ones included, so a legend toggle never reflows the bars. The
   * stylesheet adds the ring and keeps that much room at each end of the track.
   */
  protected readonly lineReach = computed(() => {
    const horizontal = this.horizontal();
    let reach = 0;
    for (const line of this.resolvedLines()) {
      const extent = wrChartMarkerExtent(line.marker, POINT_RADIUS);
      reach = Math.max(reach, horizontal ? extent.side : Math.max(extent.top, extent.bottom));
    }
    return wrChartRound(reach, 3);
  });

  /**
   * The legend's rows: every series, keyed by a dot in its colour, then every line, keyed
   * by its dash and its marker - hidden ones included.
   */
  protected readonly legendItems = computed<readonly WrChartLegendItem[]>(() => [
    ...this.resolvedSeries().map(({ label, color }) => ({ label, color })),
    ...this.resolvedLines().map(({ label, color, dash, marker }) => ({ label, color, dash, marker })),
  ]);

  /**
   * Whether the chart draws its legend: with `series` or beside `lines`, unless
   * `legendPosition` is `none` or `showLegend` is off. Under `showLegend="auto"` a single
   * series with no line has nothing to tell apart, and draws none.
   */
  protected readonly legendShown = computed(() => {
    const show = this.showLegend();
    const rows = this.legendItems().length;
    if (show === false || rows === 0 || this.legendPosition() === 'none') return false;
    if (!this.seriesMode() && !this.hasLines()) return false;
    return show === true || rows > 1 || this.hasLines();
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

  /** Whether the chart has nothing to draw: no datum, or no category. */
  private readonly empty = computed(() => this.categoryTotal() === 0);

  /** What the chart shows in place of its bars, or `null` while it draws them. */
  protected readonly state = useChartState({
    loading: this.loading,
    error: this.error,
    empty: this.empty,
    emptyLabel: this.emptyLabel,
    loadingLabel: this.loadingLabel,
    errorLabel: this.errorLabel,
  });

  /**
   * The legend's hidden rows. Its rows are the series and then the lines, so a hidden
   * line is its position in `lines` past the series' count. A position `hiddenSeries`
   * keeps past the end of `series` is not handed over beside lines, where it would name
   * a line; without lines `hiddenSeries` goes through as it is.
   */
  protected readonly legendHidden = computed<readonly number[]>(() => {
    const hiddenSeries = this.hiddenSeries();
    if (!this.hasLines()) return hiddenSeries;
    const offset = this.resolvedSeries().length;
    return [...hiddenSeries.filter(i => i < offset), ...this.hiddenLines().map(i => offset + i)];
  });

  /** A toggle on the legend, split back into `hiddenSeries` and `hiddenLines`. Writes only the one that moved. */
  protected onLegendHidden(next: readonly number[]): void {
    if (!this.hasLines()) {
      this.hiddenSeries.set(next);
      return;
    }
    const offset = this.resolvedSeries().length;
    const ascending = (a: number, b: number): number => a - b;
    const series = [...next.filter(i => i < offset), ...this.hiddenSeries().filter(i => i >= offset)].sort(ascending);
    const lines = next.filter(i => i >= offset).map(i => i - offset);
    const same = (a: readonly number[], b: readonly number[]): boolean =>
      a.length === b.length && a.every((value, i) => value === b[i]);
    if (!same(series, this.hiddenSeries())) this.hiddenSeries.set(series);
    if (!same(lines, this.hiddenLines())) this.hiddenLines.set(lines);
  }

  /**
   * The figures for `dataTable`: the chart's name as the caption, a column per series
   * shown — or, with `data`, one for the bars, headed by `barChart.value` — then per line
   * shown, and a row per category. Each cell is the series' own value, stacked or not,
   * written as the tooltip writes it, and empty where it is missing; a bar's is the figure
   * its name gives. With every series and line hidden there is nothing to tabulate, and
   * no rows.
   */
  protected readonly tableData = computed<WrChartTableData>(() => {
    const bars = this.seriesMode()
      ? this.visibleSeries()
      : [{ label: this.valueText(), data: this.data().map(d => (Number.isFinite(d.value) ? d.value : null)) }];
    const columns = [...bars, ...this.visibleLines()];
    const labels = this.categoryLabels();
    const rows =
      columns.length === 0
        ? []
        : labels.map((header, c) => ({
            header,
            cells: columns.map(column => {
              const value = column.data[c];
              return value === null || value === undefined ? '' : this.numbers.value(value);
            }),
          }));
    return { caption: this.resolvedAriaLabel(), columns: columns.map(column => column.label), groups: [{ rows }] };
  });

  /**
   * One tooltip for the whole chart, with the whole figure — the label above the bar
   * may be compact, and the tooltip is where a reader goes for the exact one.
   *
   * With `data` it points at the END of the bar - above it standing up, below it when
   * there is no room - rather than at the column, which is the full height of the plot
   * and would put the chip above every bar alike. A bar with nothing to draw (zero, or a
   * negative value without `lines`) points at the zero line; a missing value opens none,
   * unless a line has a value in its category.
   *
   * With `series` it is one chip per category: the category's name and a row per series
   * shown with a value there, pointing at the end of the longest of its bars. A category
   * no series shown has a value in opens none.
   *
   * Each line shown with a value in the category adds a row after the bars', and the box
   * the chip points at takes in the line's point too, so the chip covers neither. Beside
   * `data`, the chip keeps the bar's label and value as its heading, over the lines' rows.
   *
   * The box is worked out from the shares the chart wrote and the track's own box, not
   * read off the bars: a bar is moved by a transform, and its box mid-transition is not
   * where it is going. Two measurements per hover, however many bars the category has.
   */
  protected readonly tip = useChartTooltip(this.tooltip, index =>
    this.seriesMode() ? this.categoryTip(index) : this.barTip(index)
  );

  private barTip(index: number): WrChartTooltipTarget | null {
    const bar = this.bars()[index];
    if (!bar || this.state()) return null;
    const rows = this.lineRows(index);
    // A missing value has nothing to say but its label, which is already under the bar.
    if (rows.length === 0 && bar.missing) return null;
    const anchor = this.sectionBox(index, bar.start, bar.start + bar.share);
    if (!anchor) return null;
    return rows.length === 0
      ? { datum: { label: bar.label, value: bar.text, color: bar.color }, anchor }
      : { datum: { label: bar.label, value: bar.text, color: bar.color, rows }, anchor };
  }

  /** A row per line shown with a value in category `index`, after the bars' rows. */
  private lineRows(index: number): WrChartTooltipRow[] {
    return this.visibleLines().flatMap(line => {
      const value = line.data[index];
      return value === null || value === undefined
        ? []
        : [{ label: line.label, value: this.numbers.value(value), color: line.color }];
    });
  }

  /**
   * The box round a stretch of the value axis in category `index`, in viewport px, as a
   * tooltip anchor: across, the category's own box; along the value axis, from share
   * `from` to share `to` of the track, widened to every line's point in the category and
   * by how far a marker reaches past its point. `null` while the category is not drawn.
   */
  private sectionBox(
    index: number,
    from: number,
    to: number
  ): { x: number; y: number; width: number; height: number } | null {
    const track = this.trackEl()?.nativeElement;
    const section = this.host.querySelector(`[data-wr-index="${index}"]`);
    if (!track || !section) return null;
    let reach = 0;
    for (const line of this.visibleLines()) {
      const value = line.data[index];
      if (value === null || value === undefined) continue;
      const at = this.at(value);
      from = Math.min(from, at);
      to = Math.max(to, at);
      // The marker's own reach, and the ring round it.
      reach = this.lineReach() + 1;
    }
    const axis = track.getBoundingClientRect();
    const across = section.getBoundingClientRect();
    if (!this.horizontal()) {
      const top = axis.bottom - to * axis.height - reach;
      const bottom = axis.bottom - from * axis.height + reach;
      return { x: across.left, y: top, width: across.width, height: bottom - top };
    }
    // Lying down the bars grow along the inline axis: leftwards under RTL.
    const rtl = getComputedStyle(track).direction === 'rtl';
    const left = rtl ? axis.right - to * axis.width - reach : axis.left + from * axis.width - reach;
    const right = rtl ? axis.right - from * axis.width + reach : axis.left + to * axis.width + reach;
    return { x: left, y: across.top, width: right - left, height: across.height };
  }

  private categoryTip(index: number): WrChartTooltipTarget | null {
    const category = this.seriesCategories()[index];
    if (!category || this.state()) return null;
    const rows = [
      ...this.visibleSeries().flatMap(s => {
        const value = s.data[index];
        return value === null || value === undefined
          ? []
          : [{ label: s.label, value: this.numbers.value(value), color: s.color }];
      }),
      ...this.lineRows(index),
    ];
    if (rows.length === 0) return null;
    // The box round the bars the category draws and its lines' points, so the chip points
    // at the end of the longest of them rather than at the top of the plot.
    const anchor = this.sectionBox(index, category.from, category.to);
    if (!anchor) return null;
    return { datum: { label: category.label, value: '', rows }, anchor };
  }
}

export type { WrBarChartDatum, WrBarLine, WrBarOrientation, WrBarSeries } from './types';
