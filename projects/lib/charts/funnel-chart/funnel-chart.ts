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
  viewChildren,
} from '@angular/core';

import { WrChartTable, type WrChartTableData, useChartNumbers } from 'ngwr/charts/core';
import { readI18nText, useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { type WrChartTooltipRow, useChartTooltip } from 'ngwr/popover';
import { clamp } from 'ngwr/utils';

import type { WrFunnelConversion, WrFunnelStage } from './types';

/** A number for an inline style, to three decimals with `-0` folded to `0`, so the style stays short. */
const short = (value: number): number => Math.round(value * 1000) / 1000 || 0;

/**
 * `value` as a share of `reference`, or `null` where no share means anything: either
 * side missing, a reference of zero or below (there is nothing to be a share of), or a
 * negative value (a share of a count below zero). A value above its reference is a share
 * above one — a stage that grew — and is returned as it is.
 */
function share(value: number | null, reference: number | null): number | null {
  if (value === null || reference === null || reference <= 0 || value < 0) return null;
  return value / reference;
}

/** One stage, resolved: its value with `null` where it is missing, its paint, its width and its conversions. */
interface Stage {
  readonly label: string;
  /** `null` when the stage's value is not a finite number. */
  readonly value: number | null;
  readonly color: string;
  /** The bar's width as a share of the track, from 0 to 1. */
  readonly width: number;
  /** Its share of the stage before it, or `null` (see `share`). Always `null` for the first stage. */
  readonly fromPrevious: number | null;
  /** Its share of the first stage, or `null`. Always `null` for the first stage, which is the reference. */
  readonly fromFirst: number | null;
}

/**
 * Funnel chart: how many reached each stage of a sequence — visited, signed up, paid —
 * and how many of them went on to the next. SVG-free and dependency-free: every part is
 * HTML laid out by the stylesheet.
 *
 * @example
 * ```html
 * <wr-funnel-chart
 *   [stages]="[
 *     { label: 'Visited', value: 12000 },
 *     { label: 'Signed up', value: 4800 },
 *     { label: 'Activated', value: 2900 },
 *     { label: 'Paid', value: 720 }
 *   ]"
 * />
 * ```
 *
 * **The bars are honest about the values.** Each stage is a bar centred on the funnel's
 * axis, its width proportional to its value — the largest stage, or `max`, is the full
 * width. The funnel shape between two bars is a band from one bar's width to the next,
 * so it narrows by exactly the drop and carries no value of its own. That is why this is
 * bars and not a trapezoid per stage: a trapezoid's area depends on its neighbour, so a
 * stage would look larger or smaller for what follows it.
 *
 * **What the data does not promise, the drawing does not assume.** A stage larger than
 * the one before it is drawn WIDER and its conversion is above 100%, rather than clamped
 * into a shape a funnel is expected to have. Zero and a negative value draw a hairline,
 * never a negative width; a negative value is printed as given and gets no conversion. A
 * value that is not a finite number is missing: no bar, no figure, no band to or from it,
 * and no conversion that would need it.
 *
 * **The conversions.** Each stage after the first has two: its share of the stage before
 * it, printed between the two bars, and its share of the first stage, printed under its
 * value (`conversion` chooses which are printed). Both are percentages in `LOCALE_ID`,
 * with one fraction digit and two significant digits below 1%, so a real conversion of
 * 0.04% is not printed as `0%`; `percentFormat` replaces that.
 *
 * **What a screen reader gets.** The chart is a named `role="group"` of one `role="img"`
 * per stage, as the bar chart's columns are, each named with its label, its value and both
 * conversions — "Signed up: 4,800, 40% of previous, 40% of first". The whole sentence is a
 * catalog template, one per shape — `funnelChart.stageName` with no conversion,
 * `stageNameOne` with one and `stageNameBoth` with both — so a locale sets its own
 * punctuation and order round the figures. The bands and the percentages between the bars
 * are `aria-hidden`, since every figure they show is in a name already. `dataTable` adds
 * the same figures as a table a reader can walk cell by cell. No part of the chart is a
 * tab stop.
 *
 * Under RTL the labels and the figures swap sides; the bars and the bands are centred,
 * so they read the same in both directions. A label takes its direction from its own
 * text, so a Latin one is ellipsised at its end on an RTL page, and a figure from its
 * own, so a sign stays in front of its digits.
 *
 * @see https://ngwr.dev/charts/funnel-chart
 */
@Component({
  selector: 'wr-funnel-chart',
  templateUrl: './funnel-chart.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-funnel-chart' },
  imports: [WrChartTable],
})
export class WrFunnelChart {
  /**
   * The stages, from the top of the funnel down. Nothing is sorted: a stage is drawn where
   * it is given, so a stage larger than the one before it shows as one.
   */
  readonly stages = input<readonly WrFunnelStage[]>([]);

  /**
   * Accessible name of the chart, and the data table's caption. Each stage names itself,
   * so this says what the funnel is about. Falls back to `funnelChart.label`, then
   * `'Funnel chart'`.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'funnelChart.label', 'Funnel chart');

  /**
   * The colour of a stage with no `color` of its own. One colour by default, because the
   * stages are one quantity measured along a sequence, not categories: every stage is
   * named in text beside its bar, so colour tells nothing apart here.
   * @default 'var(--wr-color-primary)'
   */
  readonly color = input<string>('var(--wr-color-primary)');

  /**
   * The value of a full-width bar. `0` makes it the largest stage shown; a value above
   * `0` fixes it, so two funnels side by side share one scale. A stage above a fixed
   * `max` is drawn full width, and its figure, the tooltip and the data table still give
   * its own value. @default 0
   */
  readonly max = input(0, {
    transform: (v: unknown): number => {
      const value = coerceNumberProperty(v, 0);
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    },
  });

  /**
   * Which conversions are printed on the drawing: each stage's share of the stage before
   * it, between the two bars (`previous`), its share of the first stage, under its value
   * (`first`), `both` or `none`. The tooltip, every stage's accessible name and the data
   * table carry both whatever this says. @default 'both'
   */
  readonly conversion = input<WrFunnelConversion>('both');

  /** Print each stage's value beside its bar. @default true */
  readonly showValues = input(true, { transform: coerceBooleanProperty });

  /**
   * What the values count — visitors, orders — as the heading of the data table's value
   * column. Falls back to `funnelChart.value` ("Value").
   */
  readonly valueLabel = input<string | null>(null);

  /**
   * Show a tooltip with the stage's label, value and both conversions on hover. Pointer
   * only — each stage's accessible name already carries the same figures. @default true
   */
  readonly tooltip = input(true, { transform: coerceBooleanProperty });

  /**
   * Writes every value the chart shows: beside the bars, in the tooltip, in the accessible
   * names and in the data table. `null` uses `Intl.NumberFormat` in `LOCALE_ID`.
   */
  readonly valueFormat = input<((value: number) => string) | null>(null);

  /**
   * Writes every conversion the chart shows, given as a RATIO — `0.25` for a quarter, `1.2`
   * for a stage that grew by a fifth — the number `Intl.NumberFormat`'s `percent` style
   * takes, so one of those can be passed as it is. `null` uses that style in `LOCALE_ID`,
   * with up to one fraction digit, and two significant digits below 1% so a small real
   * conversion is not printed as `0%`.
   */
  readonly percentFormat = input<((ratio: number) => string) | null>(null);

  /**
   * Render the chart's figures as a table that only assistive technology reaches: a row
   * per stage, headed by its label, with its value and both conversions, each written as
   * the tooltip writes it. A figure the stage does not have is an empty cell.
   *
   * Each stage's accessible name already carries its figures; the table is for a reader
   * who wants to move through them cell by cell, with the column headings read out. It is
   * rendered beside the stages, clipped to nothing: it takes no room, draws nothing and
   * holds no tab stop. @default false
   */
  readonly dataTable = input(false, { transform: coerceBooleanProperty });

  /** The figures in full, never compact, in `LOCALE_ID` unless `valueFormat` is given. */
  private readonly numbers = useChartNumbers(this.valueFormat);

  private readonly locale = inject(LOCALE_ID);
  private readonly percents = new Intl.NumberFormat(this.locale, { style: 'percent', maximumFractionDigits: 1 });
  /** Below 1%, by significant digits, which keep 0.0004 from printing as `0%`. */
  private readonly smallPercents = new Intl.NumberFormat(this.locale, {
    style: 'percent',
    maximumSignificantDigits: 2,
  });

  private readonly stageName = readI18nText('funnelChart.stage', 'Stage');
  private readonly valueName = useI18nText(this.valueLabel, 'funnelChart.value', 'Value');
  private readonly fromPreviousName = readI18nText('funnelChart.fromPrevious', 'From previous');
  private readonly fromFirstName = readI18nText('funnelChart.fromFirst', 'From first');
  private readonly ofPrevious = useI18nFormatter('funnelChart.ofPrevious', '{{percent}} of previous');
  private readonly ofFirst = useI18nFormatter('funnelChart.ofFirst', '{{percent}} of first');
  /**
   * A stage's accessible name, one sentence per shape, so a locale places the colon, the
   * commas and the order itself: with no conversion (the first stage, or none that means
   * anything), with one, and with both. Each conversion arrives already worded — "40% of
   * previous" — from the two templates above.
   */
  private readonly stageNameText = useI18nFormatter('funnelChart.stageName', '{{label}}: {{value}}');
  private readonly stageNameOneText = useI18nFormatter(
    'funnelChart.stageNameOne',
    '{{label}}: {{value}}, {{conversion}}'
  );
  private readonly stageNameBothText = useI18nFormatter(
    'funnelChart.stageNameBoth',
    '{{label}}: {{value}}, {{previous}}, {{first}}'
  );

  private readonly stageEls = viewChildren<ElementRef<HTMLElement>>('stageEl');

  /** Whether the shares of the previous stage are printed between the bars. */
  protected readonly showPrevious = computed(() => {
    const conversion = this.conversion();
    return conversion === 'both' || conversion === 'previous';
  });

  /** Whether the shares of the first stage are printed under the values. */
  protected readonly showFirst = computed(() => {
    const conversion = this.conversion();
    return conversion === 'both' || conversion === 'first';
  });

  /**
   * Every stage, resolved. The full width is a fixed `max`, else the largest value given,
   * else 1 — so a funnel of zeros draws hairlines rather than dividing by nothing.
   */
  private readonly resolved = computed<readonly Stage[]>(() => {
    const stages = this.stages();
    const values = stages.map(stage => (Number.isFinite(stage.value) ? stage.value : null));
    const explicit = this.max();
    const largest = Math.max(0, ...values.filter((v): v is number => v !== null));
    const full = explicit > 0 ? explicit : largest > 0 ? largest : 1;
    const first = values[0] ?? null;
    return stages.map((stage, i) => {
      const value = values[i];
      return {
        label: stage.label,
        value,
        color: stage.color ?? this.color(),
        width: value === null ? 0 : clamp(value / full, 0, 1),
        fromPrevious: i === 0 ? null : share(value, values[i - 1]),
        fromFirst: i === 0 ? null : share(value, first),
      };
    });
  });

  /**
   * The stages as drawn and announced: every figure written once, here, so the drawing,
   * the names, the tooltip and the table cannot disagree.
   *
   * `band` is the shape between a stage and the one above it: a `clip-path` polygon on
   * the track's width, from the upper bar's width at its top edge to this bar's at its
   * bottom, both centred. There is none next to a missing stage, since joining across one
   * would draw a drop the data never gave.
   */
  protected readonly rows = computed(() => {
    const stages = this.resolved();
    return stages.map((stage, i) => {
      const valueText = stage.value === null ? '' : this.numbers.value(stage.value);
      const previousText = stage.fromPrevious === null ? '' : this.percent(stage.fromPrevious);
      const firstText = stage.fromFirst === null ? '' : this.percent(stage.fromFirst);
      const ofPreviousText = previousText ? this.ofPrevious({ percent: previousText }) : '';
      const ofFirstText = firstText ? this.ofFirst({ percent: firstText }) : '';

      const above = stages[Math.max(0, i - 1)];
      let band: string | null = null;
      if (i > 0 && above.value !== null && stage.value !== null) {
        const top = above.width * 50;
        const bottom = stage.width * 50;
        band =
          `polygon(${short(50 - top)}% 0%, ${short(50 + top)}% 0%, ` +
          `${short(50 + bottom)}% 100%, ${short(50 - bottom)}% 100%)`;
      }

      return {
        label: stage.label,
        value: stage.value,
        color: stage.color,
        /** The bar's inline width, a percentage of the track. */
        width: `${short(stage.width * 100)}%`,
        valueText,
        previousText,
        firstText,
        /** The share of the first stage as it is printed under the value: "40% of first". */
        ofFirstText,
        /** What the stage announces: its label, its value and both conversions. */
        name: stage.value === null ? stage.label : this.nameOf(stage.label, valueText, ofPreviousText, ofFirstText),
        band,
        /** The paint of the stage above, where the band starts. */
        bandFrom: above.color,
      };
    });
  });

  /**
   * The figures for `dataTable`: the chart's name as the caption, a row per stage, and its
   * value and both conversions as the columns, each cell written as the tooltip writes it.
   */
  protected readonly tableData = computed<WrChartTableData>(() => ({
    caption: this.resolvedAriaLabel(),
    corner: this.stageName(),
    columns: [this.valueName(), this.fromPreviousName(), this.fromFirstName()],
    groups: [
      {
        rows: this.rows().map(row => ({
          header: row.label,
          cells: [row.valueText, row.previousText, row.firstText],
        })),
      },
    ],
  }));

  /**
   * One tooltip for the whole chart, for the stage under the pointer: its label and value
   * as the heading, and a row for each conversion it has. It points at the top edge of the
   * BAR, so the chip sits over the band and the percentage it repeats; a stage of zero
   * keeps its hairline to point at. A missing stage opens none — it has no figure to show.
   */
  protected readonly tip = useChartTooltip(this.tooltip, index => {
    const row = this.rows().at(index);
    if (!row) return null;
    const anchor = this.stageEls()[index]?.nativeElement.querySelector('.wr-funnel-chart__bar');
    if (row.value === null || !anchor) return null;
    const rows: WrChartTooltipRow[] = [];
    if (row.previousText) rows.push({ label: this.fromPreviousName(), value: row.previousText });
    if (row.firstText) rows.push({ label: this.fromFirstName(), value: row.firstText });
    return { datum: { label: row.label, value: row.valueText, color: row.color, rows }, anchor };
  });

  /**
   * The stage the open tooltip is about, which the active row's wash marks: the hovered
   * stage, unless it is missing. A missing stage opens no tooltip, and `tip.active()` is
   * the hovered index whatever the resolver returned, so without this the wash would mark
   * a row with nothing to show.
   */
  protected readonly activeStage = computed(() => {
    const index = this.tip.active();
    const row = index === null ? undefined : this.rows().at(index);
    return row && row.value !== null ? index : null;
  });

  /**
   * The accessible name of a stage with a value: the sentence for the conversions it has,
   * each already worded. A missing stage is named by its label alone.
   */
  private nameOf(label: string, value: string, ofPrevious: string, ofFirst: string): string {
    if (ofPrevious && ofFirst) return this.stageNameBothText({ label, value, previous: ofPrevious, first: ofFirst });
    if (ofPrevious || ofFirst) return this.stageNameOneText({ label, value, conversion: ofPrevious || ofFirst });
    return this.stageNameText({ label, value });
  }

  /** A conversion as the chart prints it: through `percentFormat`, or as a percentage in `LOCALE_ID`. */
  private percent(ratio: number): string {
    const custom = this.percentFormat();
    if (custom) return custom(ratio);
    return (ratio !== 0 && Math.abs(ratio) < 0.01 ? this.smallPercents : this.percents).format(ratio);
  }
}

export type { WrFunnelConversion, WrFunnelStage } from './types';
