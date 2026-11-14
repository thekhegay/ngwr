/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import {
  Component,
  ElementRef,
  LOCALE_ID,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  isDevMode,
} from '@angular/core';

import {
  WrChartState,
  WrChartTable,
  type WrChartTableData,
  useChartHover,
  useChartNumbers,
  useChartState,
  wrChartAxis,
  wrChartColor,
  wrChartNumberFormat,
  wrChartRound,
} from 'ngwr/charts/core';
import { wrReadI18nText, useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { type WrChartTooltipRow, useChartTooltip } from 'ngwr/popover';
import { wrCheckStyles } from 'ngwr/utils';

import { boxplotStats, drawnOutliers, sortedFinite } from './internal/stats';
import type { WrBoxplotGroup, WrBoxplotStats } from './types';

/** How many gaps the value axis aims for: `wrChartAxis`'s own default, on a plot tall enough for them. */
const TICK_COUNT = 4;

/** How much plot height, in px, each gap of the value axis asks for: two and a half lines of tick label. */
const TICK_ROOM = 40;

/**
 * How many of a group's outliers its tooltip writes out, the lowest first, a row each;
 * past that one more row counts the rest, so a group with dozens keeps a chip that fits
 * on the screen.
 */
const TOOLTIP_OUTLIERS = 3;

/**
 * How many of a group's outliers its data table cell lists. Past that the cell names the
 * lowest and the highest and counts the rest: a cell of two hundred thousand figures is
 * megabytes of text nobody reads to the end of.
 */
const TABLE_OUTLIERS = 50;

/** A percentage to three decimals, so an inline style stays short. */
const percent = (value: number): number => wrChartRound(value, 3);

/** A group's summary as the chart reads it: every number finite, the outliers ascending. */
type Summary = Required<WrBoxplotStats>;

/** Where one group's marks sit, each as a percentage of the drawing's height from its top. */
interface DrawnBox {
  /** The upper whisker, from its end down to the box. */
  readonly upper: { readonly top: number; readonly bottom: number };
  /** The lower whisker, from the box down to its end. */
  readonly lower: { readonly top: number; readonly bottom: number };
  /** The box, from the third quartile down to the first. */
  readonly box: { readonly top: number; readonly bottom: number };
  readonly max: number;
  readonly median: number;
  readonly min: number;
  /** The outliers drawn: every one of a group with few, a sample of each side past a hundred. */
  readonly outliers: readonly { readonly value: number; readonly top: number }[];
  /** Everything the group draws, outliers included: what the tooltip points at. */
  readonly extent: { readonly top: number; readonly bottom: number };
}

/** One group as the chart draws it: its data, its slot across the drawing and its marks. */
interface DrawnGroup {
  /** Its position in `groups`. */
  readonly index: number;
  readonly label: string;
  readonly color: string;
  /** Its summary, or `null` when it has nothing to draw. */
  readonly stats: Summary | null;
  /** The slot's classes, in one binding: its own, and `--active` or `--empty`, which never meet. */
  readonly classes: string;
  /** Its five numbers, lower whisker first, in one attribute for the harness; `null` with nothing drawn. */
  readonly figures: string | null;
  /**
   * Where its slot starts, as a percentage of the drawing's width from its inline start:
   * the left, or the right under RTL.
   */
  readonly start: number;
  /** How wide its slot is, as a percentage of the drawing's width. */
  readonly slot: number;
  readonly marks: DrawnBox | null;
}

/** A span between two heights, top first whichever order they arrive in. */
const span = (a: number, b: number): { readonly top: number; readonly bottom: number } => ({
  top: Math.min(a, b),
  bottom: Math.max(a, b),
});

/**
 * The summary a group draws: its `stats` as given, when every one of the five numbers is
 * finite, else the summary of its `values`, else nothing.
 */
function summarise(group: WrBoxplotGroup): Summary | null {
  const given = group.stats;
  if (given) {
    const { min, q1, median, q3, max } = given;
    if (![min, q1, median, q3, max].every(value => Number.isFinite(value))) return null;
    return { min, q1, median, q3, max, outliers: given.outliers ? Array.from(sortedFinite(given.outliers)) : [] };
  }
  return group.values ? boxplotStats(group.values) : null;
}

/**
 * Box-and-whisker plots of several groups side by side, on one value axis: a box from the
 * first quartile to the third with a line at the median, a whisker either side, and a dot
 * per outlier. No SVG and no dependency: every mark is an HTML element placed by
 * percentage, so a box keeps its width however tall the plot is.
 *
 * @example
 * ```html
 * <wr-boxplot-chart
 *   ariaLabel="Response time by region"
 *   [groups]="[
 *     { label: 'EU', values: [112, 98, 130, 141, 104, 99, 260] },
 *     { label: 'US', stats: { min: 80, q1: 101, median: 118, q3: 134, max: 170, outliers: [240] } }
 *   ]"
 * />
 * ```
 *
 * From `values`, the chart works out the quartiles by LINEAR INTERPOLATION — type 7 of
 * Hyndman and Fan, the default of R's and NumPy's `quantile()` and what Excel's
 * `QUARTILE.INC` computes — and Tukey's whiskers: each reaches the farthest value within
 * 1.5 interquartile ranges of the box, and every value beyond is an outlier. A summary
 * worked out elsewhere goes in `stats` and is drawn exactly as given.
 *
 * The value axis is fitted to every number drawn, outliers included, with no zero forced
 * in — a box plot has no baseline — and snapped outward to a readable step: gridlines
 * across the plot (`showGrid`) and a scale beside it (`showAxis`), both on by default.
 * With no group to draw the chart keeps that frame and says "No data"; `loading` and
 * `error` put their own message there in place of the boxes. The groups
 * share the drawing's width in equal slots under their names, in reading order: left to
 * right, and right to left under RTL, as the bar chart's columns are, so the first group
 * stands beside the value axis either way.
 *
 * The drawing is one named `role="img"` and takes no tab stop; the tooltip, with the five
 * numbers and the outliers past them, is pointer only. `dataTable` renders every group's
 * numbers as a table only assistive technology reaches.
 *
 * A group of raw `values` is sorted once, in a typed array, and a group with more than a
 * hundred outliers on one side of its box draws a hundred of them there, the farthest
 * and the nearest included: the tooltip still counts every one.
 *
 * @see https://ngwr.dev/charts/boxplot-chart
 */
@Component({
  selector: 'wr-boxplot-chart',
  templateUrl: './boxplot-chart.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-boxplot-chart',
    '[class.wr-boxplot-chart--axis]': 'showAxis()',
  },
  imports: [WrChartState, WrChartTable],
})
export class WrBoxplotChart {
  /**
   * One entry per box, in reading order: each with its raw `values` or a `stats` summary
   * worked out elsewhere. A group with neither, or with nothing finite to summarise,
   * keeps its slot and its name and draws no box.
   */
  readonly groups = input<readonly WrBoxplotGroup[]>([]);

  /**
   * Accessible name of the chart. The numbers are nowhere in text unless `dataTable`
   * puts them there, so say what the chart shows. Falls back to `boxplotChart.label`
   * ("Box plot").
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'boxplotChart.label', 'Box plot');

  /**
   * What the groups are — a region, a release. Drawn under the group names only when
   * given; either way it heads the group column of the data table, which falls back to
   * `boxplotChart.group` ("Group").
   */
  readonly xLabel = input<string | null>(null);

  /** What the values measure, with their unit. Drawn along the value axis, reading upwards, only when given. */
  readonly yLabel = input<string | null>(null);

  protected readonly xName = useI18nText(this.xLabel, 'boxplotChart.group', 'Group');

  private readonly upperName = wrReadI18nText('boxplotChart.upperWhisker', 'Upper whisker');
  private readonly q3Name = wrReadI18nText('boxplotChart.q3', 'Q3');
  private readonly medianName = wrReadI18nText('boxplotChart.median', 'Median');
  private readonly q1Name = wrReadI18nText('boxplotChart.q1', 'Q1');
  private readonly lowerName = wrReadI18nText('boxplotChart.lowerWhisker', 'Lower whisker');
  private readonly outliersName = wrReadI18nText('boxplotChart.outliers', 'Outliers');

  /**
   * Writes every number the chart shows: the axis ticks, the tooltip and the data table.
   * `null` uses `Intl.NumberFormat` in `LOCALE_ID`, with compact ticks (`1.2K`, `3.4M`)
   * unless the full numbers are shorter.
   */
  readonly valueFormat = input<((value: number) => string) | null>(null);

  /** The figures in full and the axis' compact ticks, in `LOCALE_ID` unless `valueFormat` is given. */
  private readonly numbers = useChartNumbers(this.valueFormat);

  private readonly locale = inject(LOCALE_ID);

  /** How many outliers the tooltip leaves unwritten, in the reader's own digits: a count, never a value to format. */
  private readonly counts = wrChartNumberFormat(this.locale);

  /** The tooltip's tail for the outliers past the first few it writes out. */
  private readonly moreOutliers = useI18nFormatter('boxplotChart.moreOutliers', '+{{count}} more');

  /**
   * A group's outliers in one data table cell, as the locale lists them. A narrow
   * CONJUNCTION list, because a unit list separates them with bare spaces in several
   * locales, and a space is the digit grouping of Russian and French: `9 000 12 000`.
   */
  private readonly list = new Intl.ListFormat(this.locale, { type: 'conjunction', style: 'narrow' });

  /**
   * The colour of every group with no `color` of its own. Any CSS colour. Defaults to the
   * first colour of the chart palette, `--wr-chart-1`. @default 'var(--wr-chart-1)'
   */
  readonly color = input<string>(wrChartColor(0));

  /**
   * The plot's height in px, at least 80. Under 160 the value axis aims for fewer ticks,
   * so their labels keep clear of one another. @default 240
   */
  readonly height = input(240, { transform: (v: unknown): number => Math.max(80, coerceNumberProperty(v, 240)) });

  /**
   * Draw the gridlines: one across the plot at every tick of the value axis. Their colour
   * is `--wr-boxplot-chart-grid-color`, which defaults to the chart theme's
   * `--wr-chart-grid`; the one at zero, when the axis reaches it, is the stronger
   * `--wr-boxplot-chart-zero-color`. @default true
   */
  readonly showGrid = input(true, { transform: coerceBooleanProperty });

  /**
   * Draw the value axis' scale: a number at every tick, beside the plot. Decoration, as
   * the tooltip and the data table carry every figure. @default true
   */
  readonly showAxis = input(true, { transform: coerceBooleanProperty });

  /**
   * A request for the chart's data is in flight: the boxes give way to the loading
   * message, over the grid and the axis the chart keeps. @default false
   */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /**
   * The chart's data failed to load: the boxes give way to the error message. `loading`
   * comes first when both are set. @default false
   */
  readonly error = input(false, { transform: coerceBooleanProperty });

  /** The message shown when no group has anything to draw. Falls back to `chart.empty`, then `'No data'`. */
  readonly emptyLabel = input<string | null>(null);

  /** The message shown while `loading`. Falls back to `chart.loading`, then `'Loading…'`. */
  readonly loadingLabel = input<string | null>(null);

  /** The message shown on `error`. Falls back to `chart.error`, then `'Could not load'`. */
  readonly errorLabel = input<string | null>(null);

  /**
   * Show a tooltip with the hovered group's five numbers — the whiskers' ends, the
   * quartiles and the median — and its outliers' values, the lowest three, then how many
   * more there are: every outlier is counted, drawn or not. Pointer only. @default true
   */
  readonly tooltip = input(true, { transform: coerceBooleanProperty });

  /**
   * Render every group's numbers as a table only assistive technology reaches, beside the
   * drawing: a row per group, a column for each of the five numbers from the lower
   * whisker up and, when a group has any, one listing its outliers - all of them up to
   * fifty, and past that the lowest, the highest and how many more. The drawing is one
   * named image, so without it the numbers are nowhere a screen reader can walk.
   * @default false
   */
  readonly dataTable = input(false, { transform: coerceBooleanProperty });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Every group with its colour and its summary, in order. */
  private readonly resolvedGroups = computed(() =>
    this.groups().map((group, index) => ({
      index,
      label: group.label,
      color: group.color ?? this.color(),
      stats: summarise(group),
    }))
  );

  /**
   * The value axis, from `wrChartAxis` over every number drawn — whisker ends, quartiles,
   * medians and outliers alike, so a summary given out of order still lands inside it —
   * with no zero forced in and both ends kept off the data (`symmetric`). A single value
   * is centred with a step either side; with nothing to draw, the 0 to 1 frame.
   *
   * It aims for four gaps, and for fewer on a short plot: a gap per 40px of `height`, so
   * the tick labels, a line of text each, never stand on one another — at the 80px
   * floor, four gaps put five labels in 64px of drawing.
   */
  protected readonly axis = computed(() => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const { stats } of this.resolvedGroups()) {
      if (!stats) continue;
      // The outliers are ascending, so their two ends stand for all of them: a spread of
      // every one overflowed the stack past about 120k.
      const ends = stats.outliers.length > 0 ? [stats.outliers[0], stats.outliers[stats.outliers.length - 1]] : [];
      for (const value of [stats.min, stats.q1, stats.median, stats.q3, stats.max, ...ends]) {
        if (value < min) min = value;
        if (value > max) max = value;
      }
    }
    const tickCount = Math.min(TICK_COUNT, Math.max(2, Math.floor(this.height() / TICK_ROOM)));
    return wrChartAxis(min, max, { symmetric: true, tickCount });
  });

  /**
   * The groups as placed: an equal slot each across the drawing, and their marks on the
   * axis. Hovering rebuilds none of it: the hovered slot's class is added in
   * {@link drawnGroups}.
   */
  private readonly placedGroups = computed(() => {
    const groups = this.resolvedGroups();
    const { min, max } = this.axis();
    const top = (value: number): number => percent(((max - value) / (max - min)) * 100);
    const slot = groups.length > 0 ? 100 / groups.length : 100;
    return groups.map(group => {
      const s = group.stats;
      let marks: DrawnBox | null = null;
      if (s) {
        const outliers = drawnOutliers(s.outliers, s.median).map(value => ({ value, top: top(value) }));
        // The five numbers and the two farthest outliers, which the drawn ones always include.
        let highest = Math.min(top(s.max), top(s.q3), top(s.median), top(s.q1), top(s.min));
        let lowest = Math.max(top(s.max), top(s.q3), top(s.median), top(s.q1), top(s.min));
        if (outliers.length > 0) {
          highest = Math.min(highest, outliers[0].top, outliers[outliers.length - 1].top);
          lowest = Math.max(lowest, outliers[0].top, outliers[outliers.length - 1].top);
        }
        marks = {
          upper: span(top(s.max), top(s.q3)),
          lower: span(top(s.q1), top(s.min)),
          box: span(top(s.q3), top(s.q1)),
          max: top(s.max),
          median: top(s.median),
          min: top(s.min),
          outliers,
          extent: { top: highest, bottom: lowest },
        };
      }
      const figures = s ? `${s.min} ${s.q1} ${s.median} ${s.q3} ${s.max}` : null;
      return { ...group, start: percent(group.index * slot), slot: percent(slot), marks, figures };
    });
  });

  /** The groups as drawn: placed, each with its slot's classes, the hovered one's among them. */
  protected readonly drawnGroups = computed<readonly DrawnGroup[]>(() => {
    const active = this.activeGroup();
    return this.placedGroups().map(group => ({
      ...group,
      classes: `wr-boxplot-chart__group${
        !group.marks
          ? ' wr-boxplot-chart__group--empty'
          : active === group.index
            ? ' wr-boxplot-chart__group--active'
            : ''
      }`,
    }));
  });

  /** The value axis' ticks, top to bottom: each value's label and its gridline's distance from the top, in percent. */
  protected readonly yTicks = computed(() => {
    const { min, max, step, ticks } = this.axis();
    const labels = this.numbers.ticks(ticks, step);
    return ticks.map((value, i) => ({
      label: labels[i],
      top: percent(((max - value) / (max - min)) * 100),
      zero: value === 0,
    }));
  });

  /** Whether the chart has nothing to draw: no group, or none with a summary. */
  private readonly empty = computed(() => this.resolvedGroups().every(group => !group.stats));

  /** What the chart shows in place of its boxes, or `null` while it draws them. */
  protected readonly state = useChartState({
    loading: this.loading,
    error: this.error,
    empty: this.empty,
    emptyLabel: this.emptyLabel,
    loadingLabel: this.loadingLabel,
    errorLabel: this.errorLabel,
  });

  /**
   * Whether the slots are drawn: always, but under `loading` and `error`. With nothing to
   * draw each group still keeps its slot and its name, under the "No data" message.
   */
  protected readonly slotsShown = computed(() => {
    const kind = this.state()?.kind;
    return kind !== 'loading' && kind !== 'error';
  });

  /**
   * One tooltip for the group under the pointer: its name and colour as the heading, then
   * the five numbers top to bottom, the way the box is drawn, and its outliers when it has
   * any — their VALUES, as the data table's column of the same name lists them: the lowest
   * three a row each under the one label, so a long figure never shares a line with
   * another and pushes past the chip, then a row counting the rest - every outlier of the
   * summary, the ones a crowded group does not draw included. It points at the top of
   * everything the group draws, so the chip covers none of its marks.
   */
  protected readonly tip = useChartTooltip(this.tooltip, index => {
    const group = this.placedGroups()[index];
    if (!group?.stats || !this.slotsShown()) return null;
    const anchor = this.host.querySelector(`[data-wr-index="${index}"] .wr-boxplot-chart__extent`);
    if (!anchor) return null;
    const { stats } = group;
    const rows: WrChartTooltipRow[] = [
      { label: this.upperName(), value: this.numbers.value(stats.max) },
      { label: this.q3Name(), value: this.numbers.value(stats.q3) },
      { label: this.medianName(), value: this.numbers.value(stats.median) },
      { label: this.q1Name(), value: this.numbers.value(stats.q1) },
      { label: this.lowerName(), value: this.numbers.value(stats.min) },
    ];
    if (stats.outliers.length > 0) {
      // The lowest few, read off the front of the list rather than a copy of all of it.
      const shown: string[] = [];
      for (let i = 0; i < Math.min(TOOLTIP_OUTLIERS, stats.outliers.length); i++) {
        shown.push(this.numbers.value(stats.outliers[i]));
      }
      const rest = stats.outliers.length - shown.length;
      if (rest > 0) shown.push(this.moreOutliers({ count: this.counts.format(rest) }));
      shown.forEach((value, i) => rows.push({ label: i === 0 ? this.outliersName() : '', value }));
    }
    return { datum: { label: group.label, value: '', color: group.color, rows }, anchor };
  });

  /** The group the tooltip is reading, washed in the drawing. Never one with nothing drawn. */
  protected readonly activeGroup = computed(() => {
    const index = this.tip.active();
    return index !== null && this.placedGroups()[index]?.marks ? index : null;
  });

  /**
   * The figures for `dataTable`: the chart's name as the caption, a row per group headed
   * by its name, and its five numbers ascending, as a five-number summary reads, written
   * as the tooltip writes them. The outliers column appears once any group has an
   * outlier, and lists that group's ascending: all of them up to fifty, and past that
   * the lowest, the highest and a count of the rest. A group with nothing to draw has a
   * row of empty cells.
   */
  protected readonly tableData = computed<WrChartTableData>(() => {
    const groups = this.resolvedGroups();
    const withOutliers = groups.some(({ stats }) => (stats?.outliers.length ?? 0) > 0);
    const columns = [this.lowerName(), this.q1Name(), this.medianName(), this.q3Name(), this.upperName()];
    if (withOutliers) columns.push(this.outliersName());
    const value = (v: number): string => this.numbers.value(v);
    return {
      caption: this.resolvedAriaLabel(),
      corner: this.xName(),
      columns,
      groups: [
        {
          rows: groups.map(({ label, stats }) => {
            if (!stats) return { header: label, cells: columns.map(() => '') };
            const cells = [stats.min, stats.q1, stats.median, stats.q3, stats.max].map(value);
            if (withOutliers) cells.push(this.outlierList(stats.outliers));
            return { header: label, cells };
          }),
        },
      ],
    };
  });

  /** A group's outliers in one data table cell: every one of a few, the two ends and a count of many. */
  private outlierList(outliers: readonly number[]): string {
    if (outliers.length <= TABLE_OUTLIERS) return this.list.format(outliers.map(v => this.numbers.value(v)));
    return this.list.format([
      this.numbers.value(outliers[0]),
      this.numbers.value(outliers[outliers.length - 1]),
      this.moreOutliers({ count: this.counts.format(outliers.length - 2) }),
    ]);
  }

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('charts/boxplot-chart');
    // One listener pair for the whole chart: a slot is whatever carries `data-wr-index`.
    // A group with nothing drawn reads as leaving, so a chip open on its neighbour closes
    // after the usual grace rather than at once.
    useChartHover({
      enter: index => {
        if (this.placedGroups()[index]?.marks) this.tip.enter(index);
        else this.tip.leave();
      },
      leave: event => this.tip.leave(event),
    });
    // A summary is drawn as given, so one whose numbers are out of order draws a whisker
    // inside its box, and one with a number that is not finite draws nothing at all —
    // both of which read on screen as data, not as a mistake.
    if (isDevMode()) {
      const warned = new Set<string>();
      effect(() => {
        for (const group of this.groups()) {
          const stats = group.stats;
          if (!stats) continue;
          const five = [stats.min, stats.q1, stats.median, stats.q3, stats.max];
          const problem = !five.every(v => Number.isFinite(v))
            ? 'has a number that is not finite, so it draws nothing'
            : five.some((v, i) => i > 0 && v < five[i - 1])
              ? 'is not in order (min ≤ q1 ≤ median ≤ q3 ≤ max), and is drawn as given'
              : null;
          const message = problem && `the stats of "${group.label}" ${problem}.`;
          if (!message || warned.has(message)) continue;
          warned.add(message);
          // eslint-disable-next-line no-console -- dev-mode validation
          console.warn(`[NGWR] <wr-boxplot-chart>: ${message}`);
        }
      });
    }
  }
}

export type { WrBoxplotGroup, WrBoxplotStats } from './types';
