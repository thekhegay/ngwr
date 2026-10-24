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

import { WrChartTable, type WrChartTableData, chartAxis, useChartNumbers } from 'ngwr/charts/core';
import { readI18nText, useI18nText } from 'ngwr/i18n';
import { useChartTooltip } from 'ngwr/popover';
import { clamp } from 'ngwr/utils';

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
 * most a pixel between them read as one bar. The chart is drawn `--dense` then.
 */
const DENSE_BELOW = 4;

/** A label's width per character, in px, before a browser has measured the widest one. */
const CHAR_WIDTH = 7;

/** The least room, in px, between two neighbouring x labels. */
const LABEL_GAP = 12;

/** A percentage to three decimals, so an attribute stays short. */
const percent = (value: number): number => Math.round(value * 1000) / 1000;

/** What a browser measured: the drawing's width, the widest x label's and one body's, in px. */
interface Measured {
  readonly width: number;
  readonly label: number;
  readonly body: number;
}

/** One candle as the chart draws it: its prices and where it sits. */
interface DrawnCandle {
  /** Its position in `data`, which is its slot on the x axis and what it is tracked by. */
  readonly index: number;
  readonly label: string;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  /** Whether it closed at or above its open: drawn hollow in the up colour, else filled in the down one. */
  readonly up: boolean;
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
 * **Up and down are told apart twice.** A rising candle, one that closed at or above
 * its open, is drawn HOLLOW in the up colour, success by default; a falling one FILLED
 * in the down colour, danger by default. The two intents sit within 1.004:1 of each
 * other in luminance, so the fill is what a reader without red-green vision reads, and
 * what survives greyscale and print. `upColor` and `downColor` swap the colours — for a
 * market that draws rises in red — and leave the fill alone. So the fill always has room
 * to show, every body is drawn at least tall enough to hold it: its two edges and a 2px
 * inside (4px at the default edge), or two dashes and the gap between them while dense
 * (5px). It grows into its own wicks, so the high and the low stay put. A candle that
 * barely moved is drawn a few pixels taller than its prices, in both directions alike,
 * rather than as a line whose direction only its colour would tell.
 *
 * **Many candles thin out rather than pile up.** A body takes 70% of its slot, between
 * 1px and `--wr-candlestick-chart-body-max-width`, so the gaps close as the candles
 * crowd. Once a body is under 4px wide it has no inside to leave hollow, and the chart
 * is drawn `--dense`: a rising body is dotted rather than outlined, so the second
 * channel holds. The x labels are thinned to every n-th, the smallest n that keeps the
 * widest label clear of its neighbours. Both are decided on the drawing's measured
 * width, after render, so the server and the first paint assume a 560px drawing. Past a
 * candle per pixel the candles overlap; aggregate the periods first.
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
    // A body too narrow to leave hollow is dotted instead; see `dense`.
    '[class.wr-candlestick-chart--dense]': 'dense()',
    // Written only when given, so the stylesheet's hooks stay the default.
    '[style.--wr-candlestick-chart-up-color]': 'upColor()',
    '[style.--wr-candlestick-chart-down-color]': 'downColor()',
  },
  imports: [WrChartTable],
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
   * `--wr-candlestick-chart-up-color`, which is `var(--wr-color-success)`. A rising
   * candle is hollow whatever its colour. @default null
   */
  readonly upColor = input<string | null>(null);

  /**
   * The colour of a falling candle, any CSS colour. `null` keeps
   * `--wr-candlestick-chart-down-color`, which is `var(--wr-color-danger)`. A falling
   * candle is filled whatever its colour. @default null
   */
  readonly downColor = input<string | null>(null);

  /**
   * Writes every price the chart shows: the y-axis ticks, the tooltip and the data
   * table. `null` uses `Intl.NumberFormat` in `LOCALE_ID`, with compact ticks (`1.2K`)
   * unless the full numbers are shorter.
   */
  readonly valueFormat = input<((value: number) => string) | null>(null);

  /** The exact figures and the axis' compact ticks, in `LOCALE_ID` unless `valueFormat` is given. */
  private readonly numbers = useChartNumbers(this.valueFormat);

  /** The plot's height in px, at least 80. @default 240 */
  readonly height = input(240, { transform: (v: unknown): number => Math.max(80, coerceNumberProperty(v, 240)) });

  /** Show the gridlines, the y-axis ticks and the period labels under the candles. @default true */
  readonly showGrid = input(true, { transform: coerceBooleanProperty });

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
  private readonly openText = readI18nText('candlestickChart.open', 'Open');
  private readonly highText = readI18nText('candlestickChart.high', 'High');
  private readonly lowText = readI18nText('candlestickChart.low', 'Low');
  private readonly closeText = readI18nText('candlestickChart.close', 'Close');

  private readonly plot = viewChild<ElementRef<HTMLElement>>('plot');

  private readonly drawing = viewChild<ElementRef<HTMLElement>>('drawing');

  private readonly probe = viewChild<ElementRef<HTMLElement>>('probe');

  private readonly candleEls = viewChildren<ElementRef<HTMLElement>>('candleEl');

  /**
   * What a browser measured, once it has: `null` on the server and until the first
   * render, which decide against {@link ASSUMED_WIDTH} instead.
   */
  private readonly measured = signal<Measured | null>(null);

  constructor() {
    // Measured after render, in a browser: again when the candles or the labels change,
    // and when the drawing changes width. Never on the server — said here as well as by
    // the render hooks, which a server-platform test still runs.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const destroyRef = inject(DestroyRef);

    afterRenderEffect(() => {
      this.candles();
      this.probeText();
      this.showGrid();
      untracked(() => this.measure());
    });

    afterNextRender(() => {
      const drawing = this.drawing()?.nativeElement;
      if (!drawing || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => this.measure());
      observer.observe(drawing);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** How many slots the x axis has: one per period, drawn or not. */
  protected readonly slots = computed(() => this.data().length);

  /** One slot's share of the drawing's width, in percent: what the stylesheet sizes a body against. */
  protected readonly slot = computed(() => (this.slots() === 0 ? 100 : percent(100 / this.slots())));

  /**
   * The y axis, from `chartAxis` over every candle drawn: fitted from the lowest of the
   * lows to the highest of the highs with no zero forced in, since a price has no
   * baseline, snapped outward at both ends and lifted a step at either end a wick would
   * end on (`symmetric`). A single price is centred with a step either side. With
   * nothing to draw, the 0 to 1 frame.
   *
   * A high below the body or a low above it counts as the body's edge, so nothing is
   * drawn outside the frame.
   */
  protected readonly axis = computed(() => {
    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    for (const d of this.data()) {
      if (!WrCandlestickChart.drawable(d)) continue;
      lo = Math.min(lo, d.low, d.open, d.close);
      hi = Math.max(hi, d.high, d.open, d.close);
    }
    return chartAxis(lo, hi, { symmetric: true });
  });

  /**
   * The candles as drawn: every period whose four prices are finite, placed on its slot
   * and on the axis, with its wicks as shares of its own height so the stylesheet can
   * draw both and the body between them.
   */
  protected readonly candles = computed<readonly DrawnCandle[]>(() => {
    const { min, max } = this.axis();
    const slots = this.slots();
    const y = (value: number): number => ((max - value) / (max - min)) * 100;
    return this.data().flatMap((d, index) => {
      if (!WrCandlestickChart.drawable(d)) return [];
      const top = Math.max(d.high, d.open, d.close);
      const bottom = Math.min(d.low, d.open, d.close);
      const span = top - bottom;
      const share = (value: number): number => (span > 0 ? percent((value / span) * 100) : 0);
      return [
        {
          index,
          label: d.label,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          up: d.close >= d.open,
          left: percent(((index + 0.5) / slots) * 100),
          top: percent(y(top)),
          height: percent(y(bottom) - y(top)),
          upper: share(top - Math.max(d.open, d.close)),
          lower: share(Math.min(d.open, d.close) - bottom),
        },
      ];
    });
  });

  /** Each drawn candle's position in {@link candles}, by its slot: how the tooltip finds a candle's element. */
  private readonly positions = computed(
    () => new Map(this.candles().map((candle, position) => [candle.index, position]))
  );

  /** One slot's width in px: measured, or against the assumed drawing. */
  private readonly slotPx = computed(() => (this.measured()?.width ?? ASSUMED_WIDTH) / Math.max(1, this.slots()));

  /**
   * Whether a body is too narrow to leave hollow — under 4px wide, measured off the
   * first candle, or worked out from the assumed drawing before a browser has measured
   * it. A dense chart dots its rising bodies instead (see the stylesheet). A chart with
   * no candle is never dense.
   */
  protected readonly dense = computed(() => {
    if (this.candles().length === 0) return false;
    const measured = this.measured()?.body ?? 0;
    const body = measured > 0 ? measured : clamp(this.slotPx() * BODY_SHARE, 1, BODY_MAX);
    return body < DENSE_BELOW;
  });

  /** The longest period label, by its characters: what the room for the x labels is estimated from before a browser has measured. */
  private readonly longestLabel = computed(() =>
    this.data().reduce((longest, d) => (d.label.length > longest.length ? d.label : longest), '')
  );

  /**
   * Every period label once, a line each: the hidden copy the x labels' room is measured
   * against. Laid out as wide as its widest line, so it measures the widest label rather
   * than the one with the most characters — `WWWWWWW` is wider than `iiiiiiii`. A line
   * break inside a label is a space here, as the printed label shows it.
   */
  protected readonly probeText = computed(() =>
    [...new Set(this.data().map(d => d.label.replace(/\r\n?|\n/g, ' ')))].join('\n')
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
  protected readonly labelEvery = computed(() => Math.max(1, Math.ceil((this.labelPx() + LABEL_GAP) / this.slotPx())));

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
  protected readonly xTicks = computed(() => {
    const every = this.labelEvery();
    const slots = this.slots();
    const slotPx = this.slotPx();
    const width = slotPx * slots;
    const label = Math.min(this.labelPx(), width);
    const data = this.data();
    /** Where a label's laid-out box starts, in px from the drawing's left. */
    const at = (index: number): number => clamp((index + 0.5) * slotPx - label / 2, 0, width - label);
    // A hair of slack on every comparison, so the regular spacing never fails on a rounding.
    const crowds = (start: number, previousEnd: number): boolean => start + 1e-6 < previousEnd + LABEL_GAP;
    const start =
      slots > every && crowds(at(every), at(0) + label) ? Math.max(0, Math.ceil(label / 2 / slotPx - 0.5 - 1e-6)) : 0;

    const ticks: { readonly index: number; readonly label: string; readonly left: number }[] = [];
    let end = Number.NEGATIVE_INFINITY;
    for (let index = start; index < slots; index += every) {
      const left = at(index);
      if (crowds(left, end)) break;
      ticks.push({ index, label: data[index].label, left: percent(((index + 0.5) / slots) * 100) });
      end = left + label;
    }
    return ticks;
  });

  /** The room each printed label has, as a percentage of the drawing's width: `labelEvery` slots, at most all of it. */
  protected readonly xSlot = computed(() => Math.min(100, percent(this.slot() * this.labelEvery())));

  /** The y ticks, top to bottom: each value's label and its gridline's distance from the top, in percent. */
  protected readonly yTicks = computed(() => {
    const { min, max, step, ticks } = this.axis();
    const labels = this.numbers.ticks(ticks, step);
    return ticks.map((value, i) => ({ label: labels[i], top: percent(((max - value) / (max - min)) * 100) }));
  });

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
      const position = this.positions().get(index);
      if (position === undefined) return null;
      const candle = this.candles()[position];
      const anchor = this.candleEls()[position]?.nativeElement;
      if (!candle || !anchor) return null;
      return {
        datum: {
          label: candle.label,
          value: '',
          rows: [
            { label: this.openText(), value: this.numbers.value(candle.open) },
            { label: this.highText(), value: this.numbers.value(candle.high) },
            { label: this.lowText(), value: this.numbers.value(candle.low) },
            { label: this.closeText(), value: this.numbers.value(candle.close) },
          ],
        },
        anchor,
      };
    },
    (x, y) => this.slotAt(x, y)
  );

  /** The slot the tooltip is reading, marked by a band behind its candle. */
  protected readonly activeSlot = computed(() => {
    const index = this.tip.active();
    return index === null ? null : { left: percent((index / Math.max(1, this.slots())) * 100) };
  });

  /**
   * The figures for `dataTable`: the chart's name as the caption, a row per period headed
   * by its label, and the open, high, low and close written as the tooltip writes them.
   * A period with no candle keeps its row, with an empty cell for each price that is not
   * a finite number.
   */
  protected readonly tableData = computed<WrChartTableData>(() => {
    const cell = (value: number): string => (Number.isFinite(value) ? this.numbers.value(value) : '');
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
   * The candle under the pointer. A MOUSE event, as every chart's is: a tap fires the
   * compatibility `mousemove` and no `pointermove`. Over a slot with no candle, the open
   * tooltip starts its grace period.
   */
  protected onPointerMove(event: MouseEvent): void {
    if (!this.tooltip()) return;
    const index = this.slotAt(event.clientX, event.clientY);
    if (index === null) this.tip.leave(event);
    else this.tip.enter(index);
  }

  /**
   * The slot under a viewport position, if a candle is drawn there: across the drawing's
   * width, and anywhere down the plot, its padding included. A drawing with no box
   * (nothing laid out yet) answers nothing.
   */
  private slotAt(clientX: number, clientY: number): number | null {
    const drawing = this.drawing()?.nativeElement;
    const plot = this.plot()?.nativeElement;
    const slots = this.slots();
    if (!drawing || !plot || slots === 0) return null;
    const box = drawing.getBoundingClientRect();
    const frame = plot.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return null;
    if (clientX < box.left || clientX > box.right || clientY < frame.top || clientY > frame.bottom) return null;
    const index = clamp(Math.floor(((clientX - box.left) / box.width) * slots), 0, slots - 1);
    return this.positions().has(index) ? index : null;
  }

  /**
   * Read the drawing's width, the widest label's and one body's off the layout. A
   * hidden chart measures 0 and keeps its last reading rather than thin to nothing; a
   * label or a body with nothing to measure — no grid, no candle — reads 0 and leaves
   * the estimate in charge of what it decides.
   */
  private measure(): void {
    const drawing = this.drawing()?.nativeElement;
    if (!drawing) return;
    const width = drawing.getBoundingClientRect().width;
    if (width <= 0) return;
    const label = this.probe()?.nativeElement.getBoundingClientRect().width ?? 0;
    const body = this.candleEls()[0]?.nativeElement.getBoundingClientRect().width ?? 0;
    const last = this.measured();
    if (last?.width === width && last.label === label && last.body === body) return;
    this.measured.set({ width, label, body });
  }

  /** Whether a period can be drawn: all four prices finite. */
  private static drawable(d: WrCandlestickDatum): boolean {
    return Number.isFinite(d.open) && Number.isFinite(d.high) && Number.isFinite(d.low) && Number.isFinite(d.close);
  }
}

export type { WrCandlestickDatum } from './types';
