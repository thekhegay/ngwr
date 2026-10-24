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
  viewChildren,
} from '@angular/core';

import { WrChartTable, type WrChartTableData, chartAxis, useChartNumbers } from 'ngwr/charts/core';
import { readI18nText, useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { type WrChartTooltipRow, useChartTooltip } from 'ngwr/popover';

import type { WrWaterfallStep } from './types';

/** What a step is: a change up, a change down, a change of nothing, or a total from zero. */
type Kind = 'increase' | 'decrease' | 'flat' | 'total';

/**
 * U+2212 MINUS SIGN: as wide as the plus, where a hyphen is a short dash that reads as
 * punctuation. Every figure below zero takes it — a change, a running total, a total, a
 * tick — so one chart never prints two different minus signs side by side.
 */
const MINUS = '−';

/**
 * A figure wrapped in U+2068 FIRST STRONG ISOLATE … U+2069 POP DIRECTIONAL ISOLATE, for the
 * tooltip, which renders outside the chart where no stylesheet of its own sets its
 * direction. A `−` in front of digits has no direction of its own, so in an RTL document
 * it would land on the digits' far side — `350−` beside a bar printing `−350`. The isolate
 * takes its direction from the figure's own first strong character, as `unicode-bidi:
 * plaintext` does for the figures on the drawing, so the two agree.
 */
const isolate = (text: string): string => `⁨${text}⁩`;

/** A percentage to three decimals with `-0` folded to `0`, so an inline style stays short. */
const percent = (value: number): number => Math.round(value * 1000) / 1000 || 0;

/**
 * A running total with the float noise of its additions taken off: 0.1 + 0.2 is
 * 0.30000000000000004, which would print as the total it is and still fail to equal the
 * 0.3 a host passes as that total. Fifteen significant digits is every digit a double
 * holds exactly.
 */
const clean = (value: number): number => Number(value.toPrecision(15)) || 0;

/** One step with its arithmetic done: where the running total was, where it is, and where its bar runs. */
interface Resolved {
  readonly label: string;
  readonly kind: Kind;
  /** The step's change, or `null` on a total, which changes nothing. */
  readonly change: number | null;
  /** The running total before the step. */
  readonly start: number;
  /** The running total after it: what a total step shows. */
  readonly end: number;
  /** A total's own finite `value` where the steps above add up to something else, else `null`. */
  readonly mismatch: number | null;
}

/** One step as drawn and announced. */
interface DrawnStep {
  readonly label: string;
  readonly kind: Kind;
  readonly start: number;
  readonly end: number;
  /** The bar's bottom and top, as percentages of the drawing's height from its bottom. */
  readonly lo: number;
  readonly hi: number;
  /** The bar's paint, or `null` on a change of zero, which the stylesheet's neutral hook paints. */
  readonly color: string | null;
  /** The figure printed on the drawing: the signed change, compact from a thousand up, or the total. */
  readonly display: string;
  /** Whether that figure goes under the bar — a change down, a total below zero — rather than over it. */
  readonly below: boolean;
  /** The change in full with its sign, `''` on a total. */
  readonly changeText: string;
  /** The running total after the step, in full. */
  readonly totalText: string;
  /** What the step announces. */
  readonly name: string;
  /** The level of the connector to the next step, as a percentage of the drawing's height, or `null` for none. */
  readonly connector: number | null;
}

/**
 * Waterfall chart: how a figure gets from one value to another, one change at a time — an
 * opening balance, the revenue and costs that move it, the balance it closes on. HTML
 * marks laid out by the stylesheet, no dependency.
 *
 * @example
 * ```html
 * <wr-waterfall-chart
 *   ariaLabel="Profit bridge, Q3"
 *   [steps]="[
 *     { label: 'Opening', value: 4200, total: true },
 *     { label: 'Sales', value: 1800 },
 *     { label: 'Refunds', value: -350 },
 *     { label: 'Payroll', value: -900 },
 *     { label: 'Closing', value: 4750, total: true }
 *   ]"
 * />
 * ```
 *
 * **The arithmetic is the chart's.** A change step floats between the running total
 * before it and after it; a total step is a full bar from zero to the running total. A
 * total's own `value` is checked rather than drawn, so the bars cannot disagree with each
 * other: the closing bar ends exactly where the last change does, and in dev mode a
 * `value` that says otherwise warns — the steps above it do not add up to the figure the
 * host expected. The one total that is not checked is one before every change, where
 * nothing has run yet: its value is where the running total starts. A change that is not
 * a finite number counts as zero.
 *
 * **Colour is not the only channel.** An increase is `increaseColor`, a decrease
 * `decreaseColor` and a total `totalColor` — success, danger and primary unless told
 * otherwise — and each is also told apart without hue: a change runs UP or DOWN from the
 * thin connector that carries the previous running total to it, and its figure is printed
 * on the side it runs to, with its sign (`+1,800`, `−350`); a total stands on the zero
 * line, its figure has no `+` and its label is set in a heavier weight. A change of zero
 * — or of a value that is not a finite number — is neither: a hairline at the running
 * total in the neutral `--wr-waterfall-chart-flat-color`, printed `0` with no sign, and
 * classed `--flat` rather than as an increase.
 *
 * Those cues are the figures and the connectors, so turning BOTH `showValues` and
 * `showConnectors` off leaves colour alone to tell a change up from a change down on
 * screen: a +100 and a following −100 float over the same span. Each step's name and the
 * data table still carry the change; keep one of the two on wherever the chart has to
 * read without hue.
 *
 * Every figure below zero is written with `−` (U+2212 MINUS SIGN) in front of its
 * magnitude — a change, a running total, a total and a tick alike — so a name reads
 * "Eq: −900, running total −600" with one sign, not Intl's hyphen beside the chart's minus.
 *
 * **What a screen reader gets.** The chart is a named `role="group"` of one `role="img"`
 * per step, as the bar chart's columns are, each named with its change and the running
 * total after it — "Refunds: −350, running total 5,650" — or, for a total, "Closing:
 * total 4,750". `dataTable` adds the same figures as a table to walk cell by cell. The
 * tooltip is pointer only, and no part of the chart is a tab stop.
 *
 * The value axis always includes zero, so a total is a bar from the zero line and a
 * running total that goes negative hangs below it. Under RTL the steps run from the
 * right, with the value axis at the inline start, as every part of the layout is logical.
 *
 * @see https://ngwr.dev/charts/waterfall-chart
 */
@Component({
  selector: 'wr-waterfall-chart',
  templateUrl: './waterfall-chart.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-waterfall-chart',
    // Room over and under the drawing for the figure printed past a bar's end.
    '[class.wr-waterfall-chart--values]': 'showValues()',
  },
  imports: [WrChartTable],
})
export class WrWaterfallChart {
  /**
   * The steps, in order. A step without `total` is a change to the running total; a step
   * with it is a bar from zero showing the running total. See {@link WrWaterfallStep} for
   * what a total's `value` does.
   */
  readonly steps = input<readonly WrWaterfallStep[]>([]);

  /**
   * Accessible name of the chart, and the data table's caption. Each step names itself, so
   * say what the chart shows. Falls back to `waterfallChart.label` ("Waterfall chart").
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'waterfallChart.label', 'Waterfall chart');

  /** The colour of a change up. Any CSS colour, `var(--wr-…)` included. @default success */
  readonly increaseColor = input<string>('var(--wr-color-success)');

  /** The colour of a change down. @default danger */
  readonly decreaseColor = input<string>('var(--wr-color-danger)');

  /** The colour of a total. @default primary */
  readonly totalColor = input<string>('var(--wr-color-primary)');

  /** The plot's height in px, at least 80. @default 240 */
  readonly height = input(240, { transform: (v: unknown): number => Math.max(80, coerceNumberProperty(v, 240)) });

  /** Show the gridlines and the value axis' tick labels. @default true */
  readonly showGrid = input(true, { transform: coerceBooleanProperty });

  /**
   * Print each step's figure past the end of its bar: a change with its sign, over the bar
   * when it runs up and under it when it runs down, and a total with no `+`. Compact from
   * a thousand up (`+1.2K`), where a bar is too narrow for the whole figure; the tooltip,
   * the names and the data table carry it in full.
   *
   * The sign is one of the two cues besides colour that tell a change up from a change
   * down; the connectors are the other. Off together with `showConnectors`, colour is the
   * only one left on screen. @default true
   */
  readonly showValues = input(true, { transform: coerceBooleanProperty });

  /**
   * Draw the thin line that carries each running total across the gap to the next bar,
   * which starts from it. None leads into a total that starts a running total of its own
   * — one before every change, at a value the line would not meet.
   *
   * A change up leaves the line at its bottom and a change down at its top, so the line
   * is one of the two cues besides colour that tell them apart; the signed figures are
   * the other. Off together with `showValues`, colour is the only one left on screen.
   * @default true
   */
  readonly showConnectors = input(true, { transform: coerceBooleanProperty });

  /**
   * Show a tooltip with the step's change and the running total after it on hover. Pointer
   * only — each step's accessible name already carries both. @default true
   */
  readonly tooltip = input(true, { transform: coerceBooleanProperty });

  /**
   * Render the chart's figures as a table only assistive technology reaches, beside the
   * drawing: a row per step, headed by its label, with its change (empty on a total) and
   * the running total after it, each written as the tooltip writes it.
   *
   * Each step's accessible name already carries both figures; the table is for a reader
   * who wants to move through them cell by cell, with the column headings read out. It is
   * clipped to nothing: it takes no room, draws nothing and holds no tab stop.
   * @default false
   */
  readonly dataTable = input(false, { transform: coerceBooleanProperty });

  /**
   * Writes every number the chart shows: the figures on the drawing, the axis ticks, the
   * tooltip, the accessible names and the data table. Every figure is handed over as its
   * MAGNITUDE, never below zero, and the chart writes the sign in front: `+` or `−`
   * (U+2212 MINUS SIGN) on a change, `−` on a running total, a total or a tick below zero.
   * So one formatter writes every figure, and one minus sign appears throughout. `null`
   * uses `Intl.NumberFormat` in `LOCALE_ID`, with compact ticks (`1.2K`, `3.4M`) unless
   * the full numbers are shorter.
   */
  readonly valueFormat = input<((value: number) => string) | null>(null);

  /** The figures, the compact labels and the ticks, in `LOCALE_ID` unless `valueFormat` is given. */
  private readonly numbers = useChartNumbers(this.valueFormat);

  private readonly stepName = readI18nText('waterfallChart.step', 'Step');
  private readonly changeName = readI18nText('waterfallChart.change', 'Change');
  private readonly runningTotalName = readI18nText('waterfallChart.runningTotal', 'Running total');
  private readonly changeStepName = useI18nFormatter(
    'waterfallChart.changeStep',
    '{{label}}: {{change}}, running total {{total}}'
  );
  private readonly totalStepName = useI18nFormatter('waterfallChart.totalStep', '{{label}}: total {{total}}');

  private readonly barEls = viewChildren<ElementRef<HTMLElement>>('barEl');

  constructor() {
    // A total whose figure the steps above do not add up to is drawn at what they DO add
    // up to, which on screen is a chart that looks right about data that is not.
    if (isDevMode()) {
      const warned = new Set<string>();
      effect(() => {
        this.resolved().forEach((step, index) => {
          if (step.mismatch === null) return;
          const key = `${index}:${step.mismatch}:${step.end}`;
          if (warned.has(key)) return;
          warned.add(key);
          // eslint-disable-next-line no-console -- dev-mode validation
          console.warn(
            `[NGWR] <wr-waterfall-chart>: the total "${step.label}" (step ${index + 1}) is given as ${step.mismatch}, ` +
              `and the steps above it add up to ${step.end}. The bar shows ${step.end}.`
          );
        });
      });
    }
  }

  /**
   * Every step with its arithmetic done. The running total starts at zero, and a total
   * before every change sets it to its own value; a change moves it; a later total shows
   * it and only checks its own value against it.
   */
  private readonly resolved = computed<readonly Resolved[]>(() => {
    let running = 0;
    let moved = false;
    return this.steps().map((step): Resolved => {
      const value = Number.isFinite(step.value) ? step.value : null;
      const start = running;
      if (step.total) {
        let mismatch: number | null = null;
        if (!moved) {
          if (value !== null) running = clean(value);
        } else if (value !== null && clean(value) !== running) {
          mismatch = value;
        }
        return { label: step.label, kind: 'total', change: null, start, end: running, mismatch };
      }
      const change = value ?? 0;
      running = clean(running + change);
      moved = true;
      return {
        label: step.label,
        // Zero is neither way: a missing figure counted as nothing must not read as growth.
        kind: change < 0 ? 'decrease' : change > 0 ? 'increase' : 'flat',
        change,
        start,
        end: running,
        mismatch: null,
      };
    });
  });

  /**
   * The value axis, from `chartAxis` over every bar's two ends with zero always inside —
   * a total stands on it — snapped outward to a readable step and lifted a step where the
   * highest bar would end on the frame. With no step, the empty 0 to 1 frame.
   */
  protected readonly axis = computed(() => {
    const steps = this.resolved();
    if (steps.length === 0) return chartAxis(Number.NaN, Number.NaN);
    let min = 0;
    let max = 0;
    for (const { start, end, kind } of steps) {
      const from = kind === 'total' ? 0 : start;
      min = Math.min(min, from, end);
      max = Math.max(max, from, end);
    }
    return chartAxis(min, max, { includeZero: true });
  });

  /** Where zero is, as a percentage of the drawing's height from its bottom: the line every total stands on. */
  protected readonly zero = computed(() => this.level(0));

  /**
   * The ticks, top to bottom: each value's label, and its gridline's distance from the
   * drawing's top (for the label) and from its bottom (for the line).
   */
  protected readonly ticks = computed(() => {
    const { step, ticks } = this.axis();
    // Magnitudes, with the chart's own minus in front, as every other figure here.
    const labels = this.numbers.ticks(
      ticks.map(value => Math.abs(value)),
      step
    );
    return ticks.map((value, i) => {
      const bottom = this.level(value);
      return { label: value < 0 ? `${MINUS}${labels[i]}` : labels[i], bottom, top: percent(100 - bottom) };
    });
  });

  /**
   * The steps as drawn and announced: every figure written once, here, so the drawing, the
   * names, the tooltip and the table cannot disagree.
   */
  protected readonly drawn = computed<readonly DrawnStep[]>(() => {
    const steps = this.resolved();
    const colors: Record<Kind, string | null> = {
      increase: this.increaseColor(),
      decrease: this.decreaseColor(),
      flat: null,
      total: this.totalColor(),
    };
    return steps.map((step, i): DrawnStep => {
      const from = step.kind === 'total' ? 0 : step.start;
      const totalText = this.written(step.end, v => this.numbers.value(v));
      const changeText = step.change === null ? '' : this.signed(step.change, v => this.numbers.value(v));
      const next = steps[i + 1];
      // A change starts from the running total, and so does a total that shows it; a total
      // before every change starts one of its own, and a line into it would lead nowhere.
      const connected = next !== undefined && (next.kind !== 'total' || next.end === step.end);
      return {
        label: step.label,
        kind: step.kind,
        start: step.start,
        end: step.end,
        lo: this.level(Math.min(from, step.end)),
        hi: this.level(Math.max(from, step.end)),
        color: colors[step.kind],
        display:
          step.change === null
            ? this.written(step.end, v => this.numbers.label(v))
            : this.signed(step.change, v => this.numbers.label(v)),
        below: step.kind === 'decrease' || (step.kind === 'total' && step.end < 0),
        changeText,
        totalText,
        name:
          step.change === null
            ? this.totalStepName({ label: step.label, total: totalText })
            : this.changeStepName({ label: step.label, change: changeText, total: totalText }),
        connector: connected ? this.level(step.end) : null,
      };
    });
  });

  /**
   * The figures for `dataTable`: the chart's name as the caption, a row per step headed by
   * its label, and its change and the running total after it as the columns. A total has
   * no change, so that cell is empty.
   */
  protected readonly tableData = computed<WrChartTableData>(() => ({
    caption: this.resolvedAriaLabel(),
    corner: this.stepName(),
    columns: [this.changeName(), this.runningTotalName()],
    groups: [{ rows: this.drawn().map(step => ({ header: step.label, cells: [step.changeText, step.totalText] })) }],
  }));

  /**
   * One tooltip for the whole chart, for the step under the pointer: its swatch and label
   * as the heading, then its change — a total has none — and the running total after it.
   * It points at the top edge of the BAR rather than at the column, which is the full
   * height of the plot; a change of zero keeps its hairline to point at, and no swatch,
   * since its neutral paint says nothing. Each figure is isolated (see `isolate`), so a
   * sign stays in front of its digits in an RTL document.
   */
  protected readonly tip = useChartTooltip(this.tooltip, index => {
    const step = this.drawn()[index];
    const anchor = this.barEls()[index]?.nativeElement;
    if (!step || !anchor) return null;
    const rows: WrChartTooltipRow[] = [];
    if (step.kind !== 'total') rows.push({ label: this.changeName(), value: isolate(step.changeText) });
    rows.push({ label: this.runningTotalName(), value: isolate(step.totalText) });
    const label = step.label;
    return {
      datum: step.color === null ? { label, value: '', rows } : { label, value: '', color: step.color, rows },
      anchor,
    };
  });

  /** Where `value` sits on the axis, as a percentage of the drawing's height from its bottom. */
  private level(value: number): number {
    const { min, max } = this.axis();
    return percent(((value - min) / (max - min)) * 100);
  }

  /** A change with its sign in front of its magnitude: `+` up, `−` down, and none for a change of zero. */
  private signed(change: number, write: (magnitude: number) => string): string {
    return change > 0 ? `+${write(change)}` : this.written(change, write);
  }

  /** A figure with `−` in front of its magnitude below zero and no sign otherwise: a running total, a total. */
  private written(value: number, write: (magnitude: number) => string): string {
    return value < 0 ? `${MINUS}${write(-value)}` : write(Math.abs(value));
  }
}

export type { WrWaterfallStep } from './types';
