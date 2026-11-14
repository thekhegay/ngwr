/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  type ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';

import {
  WrChartState,
  WrChartTable,
  type WrChartTableData,
  useChartNumbers,
  useChartSize,
  useChartState,
  wrChartAxis,
  wrChartLongest,
  wrChartRound,
} from 'ngwr/charts/core';
import { wrReadI18nText, useI18nText } from 'ngwr/i18n';
import { useChartTooltip } from 'ngwr/popover';
import { wrClamp, wrCheckStyles } from 'ngwr/utils';

import { wrCandlestickDigits, wrCandlestickMerge, wrCandlestickPer } from './internal/merge';
import type { WrCandlestickDatum } from './types';

/**
 * The drawing's width, in px, before a browser has measured it: what the server and the
 * first paint decide the body width and the x labels against. A phone's plot is about
 * 300px and a desktop column's about 700px.
 */
const ASSUMED_WIDTH = 560;

/** How much of its slot a body takes: the stylesheet's own share, which this mirrors. */
const BODY_SHARE = 0.7;

/** The widest a body is drawn, in px: `--wr-candlestick-chart-body-max-width`'s default, which this mirrors. */
const BODY_MAX = 24;

/**
 * Below this width, in px, a hollow body has no inside to show: two 1px edges and at
 * most a pixel between them read as one bar. The chart is drawn `--dense` then, which
 * under `hollow` dots a rising body instead.
 */
const DENSE_BELOW = 4;

/** A label's width per character, in px, before a browser has measured the widest one. */
const CHAR_WIDTH = 7;

/** The least room, in px, between two neighbouring x labels. */
const LABEL_GAP = 12;

/** How many of the longest period labels the room for the x labels is measured from. */
const PROBES = 3;

/** A percentage to three decimals, so an attribute stays short. */
const percent = (value: number): number => wrChartRound(value, 3);

/** A candle's classes, by its direction: one binding for its own class and the modifier. */
const INCREASE = 'wr-candlestick-chart__candle wr-candlestick-chart__candle--increase';
const DECREASE = 'wr-candlestick-chart__candle wr-candlestick-chart__candle--decrease';

/**
 * The most fraction digits a price is written with by default: past it a decimal is
 * float noise — 0.1 + 0.2 is 0.30000000000000004 — rather than precision, and every
 * instrument quotes fewer. Crypto's eight places fit.
 */
const MAX_PRICE_DIGITS = 10;

/**
 * What a browser measured, in px: the drawing's width, the widest x label's, one body's,
 * and the plot's padding above the drawing, which the pointer is read against.
 */
interface Measured {
  readonly width: number;
  readonly label: number;
  readonly body: number;
  readonly inset: number;
}

/** One candle as the chart draws it: where it sits, and what it stands for. */
interface DrawnCandle {
  /**
   * The position in `data` of its period, or of the first of the periods merged into it:
   * its slot on the x axis and what it is tracked by.
   */
  readonly index: number;
  /** Its classes, by its direction: the increase colour for a close at or above the open, else the decrease one. */
  readonly classes: string;
  /** Its position and its four prices, `index open high low close`: what the test harness reads. */
  readonly figures: string;
  /** Its centre, as a percentage of the drawing's width from the left. */
  readonly left: number;
  /** Its top — the higher of the high and the body — as a percentage of the drawing's height from the top. */
  readonly top: number;
  /** How far it reaches down from `top`, as a percentage of the drawing's height. */
  readonly height: number;
  /** How much of its own height the upper wick takes, from its top to the body, in percent. */
  readonly upper: number;
  /** How much of its own height the lower wick takes, from the body to its bottom, in percent. */
  readonly lower: number;
}

/**
 * Prices over time as candles: one per period, its wick from the low to the high and its
 * body from the open to the close. No external dependency, and no SVG: every candle is a
 * box placed by percentage, so its width can be a share of its slot held between 1px and
 * a ceiling.
 *
 * @example
 * ```html
 * <wr-candlestick-chart
 *   ariaLabel="ACME, daily"
 *   [data]="[
 *     { label: 'Mon', open: 102, high: 108, low: 99, close: 106 },
 *     { label: 'Tue', open: 106, high: 107, low: 98, close: 100 }
 *   ]"
 * />
 * ```
 *
 * **A rise and a fall.** A rising candle, one that closed at or above its open, is drawn
 * in the increase colour, success by default; a falling one in the decrease colour,
 * danger by default - the words, the modifiers and the hooks the waterfall chart uses
 * for a change up and a change down. Both bodies are SOLID: a hollow rising body was two
 * 1px edges, which read thin beside every other chart's marks. The two intents sit
 * within 1.004:1 of each other in luminance, so on the drawing alone the direction is
 * colour; the tooltip gives the open and the close, `dataTable` gives every price, and
 * `hollow` draws a rising body as an outline again, the cue that survives greyscale and
 * print. `increaseColor` and `decreaseColor` swap the colours, for a market that draws
 * rises in red. Every body is drawn at least 4px tall (5px while dense), growing into its
 * own wicks, so the high and the low stay put and a candle that barely moved is still a
 * body rather than a line.
 *
 * **Many candles thin out rather than pile up.** A body takes 70% of its slot, between
 * 1px and `--wr-candlestick-chart-body-max-width`, so the gaps close as the candles
 * crowd. Once a body is under 4px wide the chart is drawn `--dense`, which under
 * `hollow` dots a rising body rather than outlining it. Past two candles a pixel the
 * periods are merged (`decimate`, on by default): each drawn candle then stands for a
 * run of periods - the open of the first, the close of the last, the highest high and
 * the lowest low - one every two pixels, while the tooltip and the data table keep every
 * period. The x labels are thinned to every n-th, the smallest n that keeps the widest
 * label clear of its neighbours. All of it is decided on the drawing's measured width,
 * after render, so the server and the first paint assume a 560px drawing.
 *
 * **Grid, axis and states.** Gridlines cross the plot at every tick of the price axis
 * (`showGrid`) with the scale beside it (`showAxis`), both on by default. With nothing
 * to draw the chart keeps that frame and says "No data"; `loading` and `error` put
 * their own message there in place of the candles.
 *
 * The y axis is fitted to the lows and highs shown with no zero forced in, since a price
 * has no baseline, and snapped outward to a readable step, so no wick ends on the frame.
 *
 * The drawing is one named `role="img"` and takes no tab stop; the tooltip, the period
 * with its open, high, low and close, is pointer only. `dataTable` renders every price
 * as a table only assistive technology reaches.
 *
 * @see https://ngwr.dev/charts/candlestick-chart
 */
@Component({
  selector: 'wr-candlestick-chart',
  templateUrl: './candlestick-chart.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-candlestick-chart',
    '[class.wr-candlestick-chart--axis]': 'showAxis()',
    // A rising body drawn as an outline; one too narrow for that is dotted, see `dense`.
    '[class.wr-candlestick-chart--hollow]': 'hollow()',
    '[class.wr-candlestick-chart--dense]': 'dense()',
    // Variables of their own rather than the hooks, which an author sets from outside: a
    // `null` binding wipes a value of its own name from the host's `style` attribute.
    '[style.--wr-candlestick-chart-input-increase-color]': 'increaseColor()',
    '[style.--wr-candlestick-chart-input-decrease-color]': 'decreaseColor()',
  },
  imports: [WrChartState, WrChartTable],
})
export class WrCandlestickChart {
  /**
   * The periods, oldest first: one evenly spaced slot each. A period whose four prices
   * are not all finite keeps its slot and its label, and draws no candle.
   */
  readonly data = input<readonly WrCandlestickDatum[]>([]);

  /**
   * Accessible name of the chart. The prices are nowhere in text unless `dataTable`
   * puts them there, so say what the chart shows: the instrument and the period.
   * Falls back to `candlestickChart.label` ("Candlestick chart"). It is also the data
   * table's caption.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'candlestickChart.label', 'Candlestick chart');

  /**
   * The colour of a rising candle, any CSS colour. `null` keeps
   * `--wr-candlestick-chart-increase-color`, which is `var(--wr-color-success)`.
   * @default null
   */
  readonly increaseColor = input<string | null>(null);

  /**
   * The colour of a falling candle, any CSS colour. `null` keeps
   * `--wr-candlestick-chart-decrease-color`, which is `var(--wr-color-danger)`.
   * @default null
   */
  readonly decreaseColor = input<string | null>(null);

  /**
   * Writes every price the chart shows: the y-axis ticks, the tooltip and the data
   * table. `null` uses `Intl.NumberFormat` in `LOCALE_ID`: compact ticks (`1.2K`) unless
   * the full numbers are shorter, and in the tooltip and the table every price at the
   * data's own precision — as many fraction digits as the most precise price given, up
   * to ten, and never fewer than the axis step needs — so a forex quote of 1.08345 is
   * not written `1.083`.
   */
  readonly valueFormat = input<((value: number) => string) | null>(null);

  /** The axis' compact ticks and the prices at the data's own precision, in `LOCALE_ID` unless `valueFormat` is given. */
  private readonly numbers = useChartNumbers(this.valueFormat);

  /** The plot's height in px, at least 80. @default 240 */
  readonly height = input(240, { transform: (v: unknown): number => Math.max(80, coerceNumberProperty(v, 240)) });

  /**
   * Draw the gridlines: one across the plot at every tick of the price axis. Their colour
   * is `--wr-candlestick-chart-grid-color`, which defaults to the chart theme's
   * `--wr-chart-grid`. @default true
   */
  readonly showGrid = input(true, { transform: coerceBooleanProperty });

  /**
   * Draw the price axis' scale: a number beside the plot at every tick. The period labels
   * under the candles are the time axis, so they stay either way, as the line chart's
   * `xLabels` do. @default true
   */
  readonly showAxis = input(true, { transform: coerceBooleanProperty });

  /**
   * Draw a rising body as an outline rather than solid, so a rise and a fall are told
   * apart by fill as well as by colour: the cue that survives greyscale, print and
   * red-green colour blindness. A body too narrow to show an inside (under 4px) is dotted
   * instead. A falling body is solid either way. @default false
   */
  readonly hollow = input(false, { transform: coerceBooleanProperty });

  /**
   * Merge the periods once there are more than two a pixel of the drawing: each drawn
   * candle then stands for a run of them, with the open of the first, the close of the
   * last, the highest high and the lowest low, so the chart's extremes, its first open
   * and its last close are all still drawn, at one candle every two pixels instead of
   * two elements a period. The tooltip reads the period under the pointer and the data
   * table lists every one, merged or not. Off draws a candle per period whatever their
   * number. @default true
   */
  readonly decimate = input(true, { transform: coerceBooleanProperty });

  /**
   * A request for the chart's data is in flight: the candles give way to the loading
   * message, over the grid and the axis the chart keeps. @default false
   */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /**
   * The chart's data failed to load: the candles give way to the error message. `loading`
   * comes first when both are set. @default false
   */
  readonly error = input(false, { transform: coerceBooleanProperty });

  /** The message shown with nothing to draw. Falls back to `chart.empty`, then `'No data'`. */
  readonly emptyLabel = input<string | null>(null);

  /** The message shown while `loading`. Falls back to `chart.loading`, then `'Loading…'`. */
  readonly loadingLabel = input<string | null>(null);

  /** The message shown on `error`. Falls back to `chart.error`, then `'Could not load'`. */
  readonly errorLabel = input<string | null>(null);

  /** Show a tooltip with the period's open, high, low and close under the pointer. Pointer only. @default true */
  readonly tooltip = input(true, { transform: coerceBooleanProperty });

  /**
   * Render every period's prices as a table only assistive technology reaches, beside
   * the drawing: a row per period, headed by its label, and a column each for the open,
   * the high, the low and the close. A price that is not a finite number is an empty
   * cell. The drawing is one named image, so without it the prices are nowhere a screen
   * reader can walk. @default false
   */
  readonly dataTable = input(false, { transform: coerceBooleanProperty });

  /** The words for the four prices, from the catalog: in the tooltip and as the data table's columns. */
  private readonly openText = wrReadI18nText('candlestickChart.open', 'Open');
  private readonly highText = wrReadI18nText('candlestickChart.high', 'High');
  private readonly lowText = wrReadI18nText('candlestickChart.low', 'Low');
  private readonly closeText = wrReadI18nText('candlestickChart.close', 'Close');

  private readonly plot = viewChild<ElementRef<HTMLElement>>('plot');

  private readonly drawing = viewChild<ElementRef<HTMLElement>>('drawing');

  private readonly probe = viewChild<ElementRef<HTMLElement>>('probe');

  private readonly candleEls = viewChildren<ElementRef<HTMLElement>>('candleEl');

  /**
   * What a browser measured, once it has: `null` on the server and until the first
   * render, which decide against {@link ASSUMED_WIDTH} instead.
   */
  private readonly measured = signal<Measured | null>(null);

  /** The drawing's box, on the observer every chart shares: what a resize re-measures on. */
  private readonly drawingSize = useChartSize(this.drawing);

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('charts/candlestick-chart');
    // Measured after render, in a browser: when the drawing changes size, when the labels
    // measured change, and when the number of candles drawn does, which is what moves a
    // body's width. Not on every change to the prices: a live chart ticks its last candle
    // many times a second, and each tick forced a layout. Never on the server - said here
    // as well as by the render hooks, which a server-platform test still runs.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const destroyRef = inject(DestroyRef);

    afterRenderEffect(() => {
      this.probes();
      this.drawnSlots();
      this.drawingSize();
      untracked(() => this.measure());
    });

    // The pointer, heard natively on the plot: a template listener would run a change
    // detection pass over the chart for every pixel the pointer crosses.
    afterNextRender(() => {
      const plot = this.plot()?.nativeElement;
      if (!plot) return;
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

  /** How many slots the x axis has: one per period, drawn or not. */
  protected readonly slots = computed(() => this.data().length);

  /**
   * How many periods one drawn candle stands for: 1 until there are more than two a pixel
   * of the drawing, measured or assumed, and `decimate` is on. A number of periods rather
   * than the width, so a resize that leaves it alone rebuilds no candle.
   */
  private readonly per = computed(() =>
    this.decimate() ? wrCandlestickPer(this.slots(), this.measured()?.width ?? ASSUMED_WIDTH) : 1
  );

  /** The candles to draw, each one period or a run of `per` merged: every one whose prices are finite. */
  private readonly merged = computed(() => wrCandlestickMerge(this.data(), this.per()));

  /** How many slots the candles drawn share the axis among: the periods, or the runs they are merged into. */
  private readonly drawnSlots = computed(() => Math.ceil(this.slots() / this.per()));

  /**
   * One drawn candle's share of the drawing's width, in percent: what the stylesheet sizes
   * a body and the hover band against.
   */
  protected readonly slot = computed(() => (this.slots() === 0 ? 100 : percent((100 * this.per()) / this.slots())));

  /**
   * The y axis, from `wrChartAxis` over every candle drawn: fitted from the lowest of the
   * lows to the highest of the highs with no zero forced in, since a price has no
   * baseline, snapped outward at both ends and lifted a step at either end a wick would
   * end on (`symmetric`). A single price is centred with a step either side. With
   * nothing to draw, the 0 to 1 frame.
   *
   * A high below the body or a low above it counts as the body's edge, so nothing is
   * drawn outside the frame. Read off the merged candles, which keep the data's extremes.
   */
  protected readonly axis = computed(() => {
    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    for (const d of this.merged()) {
      lo = Math.min(lo, d.low, d.open, d.close);
      hi = Math.max(hi, d.high, d.open, d.close);
    }
    return wrChartAxis(lo, hi, { symmetric: true });
  });

  /**
   * The candles as drawn: placed on the middle of the slots each stands for and on the
   * axis, with its wicks as shares of its own height so the stylesheet can draw both and
   * the body between them.
   */
  protected readonly candles = computed<readonly DrawnCandle[]>(() => {
    const { min, max } = this.axis();
    const slots = this.slots();
    const range = max - min;
    return this.merged().map(d => {
      const top = Math.max(d.high, d.open, d.close);
      const bottom = Math.min(d.low, d.open, d.close);
      const span = top - bottom;
      const y = ((max - top) / range) * 100;
      return {
        index: d.start,
        classes: d.close >= d.open ? INCREASE : DECREASE,
        figures: `${d.start} ${d.open} ${d.high} ${d.low} ${d.close}`,
        left: percent(((d.start + d.end) / 2 / slots) * 100),
        top: percent(y),
        height: percent(((max - bottom) / range) * 100 - y),
        upper: span > 0 ? percent(((top - Math.max(d.open, d.close)) / span) * 100) : 0,
        lower: span > 0 ? percent(((Math.min(d.open, d.close) - bottom) / span) * 100) : 0,
      };
    });
  });

  /**
   * Where the candle of each drawn slot is in {@link candles}, or -1 for a slot that draws
   * none: how the tooltip finds the element of the candle a period is drawn in.
   */
  private readonly positions = computed(() => {
    const per = this.per();
    const positions = new Int32Array(this.drawnSlots()).fill(-1);
    this.merged().forEach((candle, position) => (positions[Math.floor(candle.start / per)] = position));
    return positions;
  });

  /** The position in {@link candles} of the candle period `index` is drawn in, or -1 where it has none of its own. */
  private drawnAt(index: number): number {
    const d = this.data()[index];
    if (!d || !WrCandlestickChart.drawable(d)) return -1;
    return this.positions()[Math.floor(index / this.per())] ?? -1;
  }

  /** One drawn slot's width in px: measured, or against the assumed drawing. */
  private readonly slotPx = computed(() => (this.measured()?.width ?? ASSUMED_WIDTH) / Math.max(1, this.drawnSlots()));

  /** One period's width in px, merged or not: what the x labels are spaced against. */
  private readonly periodPx = computed(() => (this.measured()?.width ?? ASSUMED_WIDTH) / Math.max(1, this.slots()));

  /**
   * Whether a body is too narrow to show an inside - under 4px wide, measured off the
   * first candle, or worked out from the assumed drawing before a browser has measured
   * it. Under `hollow` a dense chart dots its rising bodies instead (see the stylesheet).
   * A chart with no candle is never dense.
   */
  protected readonly dense = computed(() => {
    if (this.candles().length === 0) return false;
    const measured = this.measured()?.body ?? 0;
    const body = measured > 0 ? measured : wrClamp(this.slotPx() * BODY_SHARE, 1, BODY_MAX);
    return body < DENSE_BELOW;
  });

  /** The longest period label, by its characters: what the room for the x labels is estimated from before a browser has measured. */
  private readonly longestLabel = computed(() =>
    this.data().reduce((longest, d) => (d.label.length > longest.length ? d.label : longest), '')
  );

  /**
   * The longest few period labels, a line each: the hidden copy the x labels' room is
   * measured against. Laid out as wide as its widest line, so among those few it measures
   * the widest rather than the one with the most characters - `WWWWWWW` is wider than
   * `iiiiiiii`. A few and not every label: ten thousand periods were ten thousand lines
   * to shape on every change to the labels. A line break inside a label is a space here,
   * as the printed label shows it.
   */
  protected readonly probes = computed(() =>
    wrChartLongest(
      this.data().map(d => d.label.replace(/\r\n?|\n/g, ' ')),
      PROBES
    ).join('\n')
  );

  /**
   * How wide a period label is taken to be, in px: the widest one as a browser measured
   * it, or seven pixels a character of the longest before it has. Every label is spaced as
   * if it were that wide.
   */
  private readonly labelPx = computed(() => {
    const measured = this.measured()?.label ?? 0;
    return measured > 0 ? measured : this.longestLabel().length * CHAR_WIDTH;
  });

  /**
   * Every how many slots a period label is printed: 1 while the widest label and a gap
   * fit one slot, else the smallest n whose n slots hold them.
   */
  protected readonly labelEvery = computed(() =>
    Math.max(1, Math.ceil((this.labelPx() + LABEL_GAP) / this.periodPx()))
  );

  /**
   * The period labels printed, left to right: every `labelEvery`-th, gaps included. Each
   * is laid out as wide as the widest, centred under its candle and moved inwards where
   * that would cross the frame, as the stylesheet draws it; the last is left out if
   * moving it brings it within the gap of the one before.
   *
   * They start from the first period, unless moving its label inwards would bring it
   * within the gap of the next printed one. Then they start from the first period whose
   * label fits between the frame and its candle unmoved, a slot or two in: dropping the
   * second label instead would open a gap of two steps at the start of the axis, and
   * keeping both would let them touch. With one candle and a label wider than the
   * drawing, that label is printed alone, ellipsised.
   */
  protected readonly xLabels = computed(() => {
    const every = this.labelEvery();
    const slots = this.slots();
    const slotPx = this.periodPx();
    const width = slotPx * slots;
    const label = Math.min(this.labelPx(), width);
    const data = this.data();
    /** Where a label's laid-out box starts, in px from the drawing's left. */
    const at = (index: number): number => wrClamp((index + 0.5) * slotPx - label / 2, 0, width - label);
    // A hair of slack on every comparison, so the regular spacing never fails on a rounding.
    const crowds = (start: number, previousEnd: number): boolean => start + 1e-6 < previousEnd + LABEL_GAP;
    const start =
      slots > every && crowds(at(every), at(0) + label) ? Math.max(0, Math.ceil(label / 2 / slotPx - 0.5 - 1e-6)) : 0;

    const labels: { readonly index: number; readonly label: string; readonly left: number }[] = [];
    let end = Number.NEGATIVE_INFINITY;
    for (let index = start; index < slots; index += every) {
      const left = at(index);
      if (crowds(left, end)) break;
      labels.push({ index, label: data[index].label, left: percent(((index + 0.5) / slots) * 100) });
      end = left + label;
    }
    return labels;
  });

  /** The room each printed label has, as a percentage of the drawing's width: `labelEvery` slots, at most all of it. */
  protected readonly xSlot = computed(() =>
    Math.min(100, percent((this.slots() === 0 ? 100 : percent(100 / this.slots())) * this.labelEvery()))
  );

  /**
   * The y ticks, top to bottom: each value's label, its gridline's distance from the top
   * in percent, and whether it is zero, whose line is drawn stronger. The labels are
   * written only for the scale: with `showAxis` off nothing prints them.
   */
  protected readonly yTicks = computed(() => {
    const { min, max, step, ticks } = this.axis();
    const labels = this.showAxis() ? this.numbers.ticks(ticks, step) : [];
    return ticks.map((value, i) => ({
      label: labels[i] ?? '',
      top: percent(((max - value) / (max - min)) * 100),
      zero: value === 0,
    }));
  });

  /** How many fraction digits the axis step is written with. */
  private readonly stepDigits = computed(() => {
    const step = this.axis().step;
    return wrCandlestickDigits([{ open: step, high: step, low: step, close: step }], 0, MAX_PRICE_DIGITS);
  });

  /**
   * How many fraction digits an exact price is written with, at most: as many as the
   * most precise finite price in `data` has, and at least as many as the axis step,
   * held to {@link MAX_PRICE_DIGITS}. A ceiling rather than a count, so `120` stays `120`
   * beside `120.25`. The shared `value` writer stops at three, which wrote the four
   * prices of a forex candle — 1.08345, 1.08391, 1.08301, 1.08362 — as two numbers,
   * coarser than the axis beside them.
   */
  private readonly priceDigits = computed(() => wrCandlestickDigits(this.data(), this.stepDigits(), MAX_PRICE_DIGITS));

  /** A price as the tooltip and the data table write it: through `valueFormat`, else at the data's precision. */
  private price(value: number): string {
    return this.numbers.exact(value, this.priceDigits());
  }

  /**
   * One tooltip for the candle under the pointer: the period as its heading, then a row
   * each for the open, the high, the low and the close, every price written in full. It
   * points at the candle itself, from above its high, and follows it if the data moves
   * it. No swatch: the colour is the candle's direction, and the four prices say it.
   *
   * The candle is found by POSITION — the slot under the pointer, anywhere over the
   * drawing — so a thin candle needs no aim, and a candle under the open chip can still
   * be reached by moving onto it.
   */
  protected readonly tip = useChartTooltip(
    this.tooltip,
    index => {
      const position = this.drawnAt(index);
      const candle = this.data()[index];
      const anchor = this.candleEls()[position]?.nativeElement;
      if (position < 0 || !candle || !anchor || this.state()) return null;
      return {
        datum: {
          label: candle.label,
          value: '',
          rows: [
            { label: this.openText(), value: this.price(candle.open) },
            { label: this.highText(), value: this.price(candle.high) },
            { label: this.lowText(), value: this.price(candle.low) },
            { label: this.closeText(), value: this.price(candle.close) },
          ],
        },
        anchor,
      };
    },
    (x, y) => this.slotAt(x, y)
  );

  /**
   * The slot the tooltip is reading, marked by a band behind its candle: the period's
   * own slot, or the whole of the run it is merged into.
   */
  protected readonly activeSlot = computed(() => {
    const index = this.tip.active();
    if (index === null) return null;
    const per = this.per();
    return { left: percent(((Math.floor(index / per) * per) / Math.max(1, this.slots())) * 100) };
  });

  /** Whether the chart has nothing to draw: no period, or none whose four prices are finite. */
  private readonly empty = computed(() => this.merged().length === 0);

  /** What the chart shows in place of its candles, or `null` while it draws them. */
  protected readonly state = useChartState({
    loading: this.loading,
    error: this.error,
    empty: this.empty,
    emptyLabel: this.emptyLabel,
    loadingLabel: this.loadingLabel,
    errorLabel: this.errorLabel,
  });

  /**
   * The figures for `dataTable`: the chart's name as the caption, a row per period headed
   * by its label, and the open, high, low and close written as the tooltip writes them.
   * A period with no candle keeps its row, with an empty cell for each price that is not
   * a finite number.
   */
  protected readonly tableData = computed<WrChartTableData>(() => {
    const cell = (value: number): string => (Number.isFinite(value) ? this.price(value) : '');
    return {
      caption: this.resolvedAriaLabel(),
      columns: [this.openText(), this.highText(), this.lowText(), this.closeText()],
      groups: [
        {
          rows: this.data().map(d => ({
            header: d.label,
            cells: [cell(d.open), cell(d.high), cell(d.low), cell(d.close)],
          })),
        },
      ],
    };
  });

  /**
   * The pointer over the plot, while no chip is up: an open chip follows the pointer by
   * itself, through `slotAt`, so each move is measured once. A MOUSE event, as every
   * chart's is: a tap fires the compatibility `mousemove` and no `pointermove`. Over a
   * slot with no candle, the open tooltip starts its grace period.
   */
  private onPointerMove(event: MouseEvent): void {
    if (!this.tooltip() || this.tip.active() !== null) return;
    const index = this.slotAt(event.clientX, event.clientY);
    if (index === null) this.tip.leave(event);
    else this.tip.enter(index);
  }

  /**
   * The slot under a viewport position, if a candle is drawn there: across the drawing's
   * width, and anywhere down the plot, its padding included. A drawing with no box
   * (nothing laid out yet) answers nothing. One layout read: the plot's box is the
   * drawing's, taller by the padding last measured.
   */
  private slotAt(clientX: number, clientY: number): number | null {
    const drawing = this.drawing()?.nativeElement;
    const slots = this.slots();
    if (!drawing || slots === 0 || this.state()) return null;
    const box = drawing.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return null;
    const inset =
      this.measured()?.inset ?? box.top - (this.plot()?.nativeElement.getBoundingClientRect().top ?? box.top);
    if (clientX < box.left || clientX > box.right || clientY < box.top - inset || clientY > box.bottom + inset) {
      return null;
    }
    const index = wrClamp(Math.floor(((clientX - box.left) / box.width) * slots), 0, slots - 1);
    return this.drawnAt(index) < 0 ? null : index;
  }

  /**
   * Read the drawing's width, the widest label's, one body's and the plot's padding off
   * the layout. A hidden chart measures 0 and keeps its last reading rather than thin to
   * nothing; a label or a body with nothing to measure - no period, no candle - reads 0
   * and leaves the estimate in charge of what it decides.
   */
  private measure(): void {
    const drawing = this.drawing()?.nativeElement;
    if (!drawing) return;
    const box = drawing.getBoundingClientRect();
    const width = box.width;
    if (width <= 0) return;
    const label = this.probe()?.nativeElement.getBoundingClientRect().width ?? 0;
    const body = this.candleEls()[0]?.nativeElement.getBoundingClientRect().width ?? 0;
    const inset = Math.max(0, box.top - (this.plot()?.nativeElement.getBoundingClientRect().top ?? box.top));
    const last = this.measured();
    if (last?.width === width && last.label === label && last.body === body && last.inset === inset) return;
    this.measured.set({ width, label, body, inset });
  }

  /** Whether a period can be drawn: all four prices finite. */
  private static drawable(d: WrCandlestickDatum): boolean {
    return Number.isFinite(d.open) && Number.isFinite(d.high) && Number.isFinite(d.low) && Number.isFinite(d.close);
  }
}

export type { WrCandlestickDatum } from './types';
