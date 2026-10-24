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
  effect,
  inject,
  input,
  isDevMode,
  viewChildren,
} from '@angular/core';

import { WrChartTable, type WrChartTableData, chartAxis, useChartNumbers } from 'ngwr/charts/core';
import { readI18nText, useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { type WrChartTooltipRow, useChartTooltip } from 'ngwr/popover';

import { boxplotStats } from './internal/stats';
import type { WrBoxplotGroup, WrBoxplotStats } from './types';

/** How many gaps the value axis aims for: `chartAxis`'s own default, on a plot tall enough for them. */
const TICK_COUNT = 4;

/** How much plot height, in px, each gap of the value axis asks for: two and a half lines of tick label. */
const TICK_ROOM = 40;

/**
 * How many of a group's outliers its tooltip writes out, the lowest first, a row each;
 * past that one more row counts the rest, so a group with dozens keeps a chip that fits
 * on the screen.
 */
const TOOLTIP_OUTLIERS = 3;

/** A percentage to three decimals, so an inline style stays short. */
const percent = (value: number): number => Math.round(value * 1000) / 1000;

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
    const outliers = (given.outliers ?? []).filter(value => Number.isFinite(value)).sort((a, b) => a - b);
    return { min, q1, median, q3, max, outliers };
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
 * in — a box plot has no baseline — and snapped outward to a readable step. The groups
 * share the drawing's width in equal slots under their names, in reading order: left to
 * right, and right to left under RTL, as the bar chart's columns are, so the first group
 * stands beside the value axis either way.
 *
 * The drawing is one named `role="img"` and takes no tab stop; the tooltip, with the five
 * numbers and the outliers past them, is pointer only. `dataTable` renders every group's
 * numbers as a table only assistive technology reaches.
 *
 * @see https://ngwr.dev/charts/boxplot-chart
 */
@Component({
  selector: 'wr-boxplot-chart',
  templateUrl: './boxplot-chart.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-boxplot-chart' },
  imports: [WrChartTable],
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

  /** What the values measure, with their unit. Drawn above the value axis only when given. */
  readonly yLabel = input<string | null>(null);

  protected readonly xName = useI18nText(this.xLabel, 'boxplotChart.group', 'Group');

  private readonly upperName = readI18nText('boxplotChart.upperWhisker', 'Upper whisker');
  private readonly q3Name = readI18nText('boxplotChart.q3', 'Q3');
  private readonly medianName = readI18nText('boxplotChart.median', 'Median');
  private readonly q1Name = readI18nText('boxplotChart.q1', 'Q1');
  private readonly lowerName = readI18nText('boxplotChart.lowerWhisker', 'Lower whisker');
  private readonly outliersName = readI18nText('boxplotChart.outliers', 'Outliers');

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
  private readonly counts = new Intl.NumberFormat(this.locale);

  /** The tooltip's tail for the outliers past the first few it writes out. */
  private readonly moreOutliers = useI18nFormatter('boxplotChart.moreOutliers', '+{{count}} more');

  /**
   * A group's outliers in one data table cell, as the locale lists them. A narrow
   * CONJUNCTION list, because a unit list separates them with bare spaces in several
   * locales, and a space is the digit grouping of Russian and French: `9 000 12 000`.
   */
  private readonly list = new Intl.ListFormat(this.locale, { type: 'conjunction', style: 'narrow' });

  /** The colour of every group with no `color` of its own. Any CSS colour. @default 'var(--wr-color-primary)' */
  readonly color = input<string>('var(--wr-color-primary)');

  /**
   * The plot's height in px, at least 80. Under 160 the value axis aims for fewer ticks,
   * so their labels keep clear of one another. @default 240
   */
  readonly height = input(240, { transform: (v: unknown): number => Math.max(80, coerceNumberProperty(v, 240)) });

  /** Show the gridlines and the value axis' tick labels. @default true */
  readonly showGrid = input(true, { transform: coerceBooleanProperty });

  /**
   * Show a tooltip with the hovered group's five numbers — the whiskers' ends, the
   * quartiles and the median — and its outliers' values, the lowest three, then how many
   * more there are. Pointer only. @default true
   */
  readonly tooltip = input(true, { transform: coerceBooleanProperty });

  /**
   * Render every group's numbers as a table only assistive technology reaches, beside the
   * drawing: a row per group, a column for each of the five numbers from the lower
   * whisker up and, when a group has any, one listing its outliers. The drawing is one
   * named image, so without it the numbers are nowhere a screen reader can walk.
   * @default false
   */
  readonly dataTable = input(false, { transform: coerceBooleanProperty });

  private readonly groupEls = viewChildren<ElementRef<HTMLElement>>('group');

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
   * The value axis, from `chartAxis` over every number drawn — whisker ends, quartiles,
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
      for (const value of [stats.min, stats.q1, stats.median, stats.q3, stats.max, ...stats.outliers]) {
        if (value < min) min = value;
        if (value > max) max = value;
      }
    }
    const tickCount = Math.min(TICK_COUNT, Math.max(2, Math.floor(this.height() / TICK_ROOM)));
    return chartAxis(min, max, { symmetric: true, tickCount });
  });

  /** The groups as drawn: an equal slot each across the drawing, and their marks placed on the axis. */
  protected readonly drawnGroups = computed<readonly DrawnGroup[]>(() => {
    const groups = this.resolvedGroups();
    const { min, max } = this.axis();
    const top = (value: number): number => percent(((max - value) / (max - min)) * 100);
    const slot = groups.length > 0 ? 100 / groups.length : 100;
    return groups.map(group => {
      const s = group.stats;
      let marks: DrawnBox | null = null;
      if (s) {
        const outliers = s.outliers.map(value => ({ value, top: top(value) }));
        const all = [s.max, s.q3, s.median, s.q1, s.min, ...s.outliers].map(top);
        marks = {
          upper: span(top(s.max), top(s.q3)),
          lower: span(top(s.q1), top(s.min)),
          box: span(top(s.q3), top(s.q1)),
          max: top(s.max),
          median: top(s.median),
          min: top(s.min),
          outliers,
          extent: { top: Math.min(...all), bottom: Math.max(...all) },
        };
      }
      return { ...group, start: percent(group.index * slot), slot: percent(slot), marks };
    });
  });

  /** The value axis' ticks, top to bottom: each value's label and its gridline's distance from the top, in percent. */
  protected readonly yTicks = computed(() => {
    const { min, max, step, ticks } = this.axis();
    const labels = this.numbers.ticks(ticks, step);
    return ticks.map((value, i) => ({ label: labels[i], top: percent(((max - value) / (max - min)) * 100) }));
  });

  /**
   * One tooltip for the group under the pointer: its name and colour as the heading, then
   * the five numbers top to bottom, the way the box is drawn, and its outliers when it has
   * any — their VALUES, as the data table's column of the same name lists them: the lowest
   * three a row each under the one label, so a long figure never shares a line with
   * another and pushes past the chip, then a row counting the rest. It points at the top
   * of everything the group draws, so the chip covers none of its marks.
   */
  protected readonly tip = useChartTooltip(this.tooltip, index => {
    const group = this.drawnGroups()[index];
    const anchor = this.groupEls()[index]?.nativeElement.querySelector('.wr-boxplot-chart__extent') ?? null;
    if (!group?.stats || !anchor) return null;
    const { stats } = group;
    const rows: WrChartTooltipRow[] = [
      { label: this.upperName(), value: this.numbers.value(stats.max) },
      { label: this.q3Name(), value: this.numbers.value(stats.q3) },
      { label: this.medianName(), value: this.numbers.value(stats.median) },
      { label: this.q1Name(), value: this.numbers.value(stats.q1) },
      { label: this.lowerName(), value: this.numbers.value(stats.min) },
    ];
    if (stats.outliers.length > 0) {
      const shown = stats.outliers.slice(0, TOOLTIP_OUTLIERS).map(value => this.numbers.value(value));
      const rest = stats.outliers.length - shown.length;
      if (rest > 0) shown.push(this.moreOutliers({ count: this.counts.format(rest) }));
      shown.forEach((value, i) => rows.push({ label: i === 0 ? this.outliersName() : '', value }));
    }
    return { datum: { label: group.label, value: '', color: group.color, rows }, anchor };
  });

  /** The group the tooltip is reading, washed in the drawing. Never one with nothing drawn. */
  protected readonly activeGroup = computed(() => {
    const index = this.tip.active();
    return index !== null && this.drawnGroups()[index]?.marks ? index : null;
  });

  /**
   * The figures for `dataTable`: the chart's name as the caption, a row per group headed
   * by its name, and its five numbers ascending, as a five-number summary reads, written
   * as the tooltip writes them. The outliers column appears once any group has an
   * outlier, and lists that group's ascending. A group with nothing to draw has a row of
   * empty cells.
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
            if (withOutliers) cells.push(this.list.format(stats.outliers.map(value)));
            return { header: label, cells };
          }),
        },
      ],
    };
  });

  constructor() {
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

  /**
   * The pointer entered a group's slot. A group with nothing drawn reads as leaving, so a
   * chip open on its neighbour closes after the usual grace rather than at once.
   */
  protected onEnter(index: number, event: MouseEvent): void {
    if (this.drawnGroups()[index]?.marks) this.tip.enter(index);
    else this.tip.leave(event);
  }
}

export type { WrBoxplotGroup, WrBoxplotStats } from './types';
