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
  input,
  model,
  viewChild,
  viewChildren,
} from '@angular/core';

import {
  WR_CHART_LEGEND_BLOCK,
  WrChartLegend,
  type WrChartLegendItem,
  type WrChartLegendPosition,
} from 'ngwr/charts/chart-legend';
import {
  WrChartState,
  useChartHover,
  useChartNumbers,
  useChartState,
  wrChartColor,
  wrChartRound,
} from 'ngwr/charts/core';
import { useI18nText } from 'ngwr/i18n';
import { useChartTooltip } from 'ngwr/popover';
import { wrCheckStyles } from 'ngwr/utils';

import type { WrMeterSegment } from './types';

/**
 * Stacked-segment progress bar. Visualises a breakdown of a total —
 * disk usage, budget, vote share, etc. Each segment contributes a slice
 * proportional to its `value` relative to the sum of the segments shown (or the
 * explicit `max`).
 *
 * @example
 * ```html
 * <wr-meter-group
 *   [segments]="[
 *     { label: 'Used', value: 60 },
 *     { label: 'Reserved', value: 25, color: 'var(--wr-color-warning)' }
 *   ]"
 *   [max]="100"
 * />
 * ```
 *
 * The legend is a `ul[wr-chart-legend]` (`ngwr/charts/chart-legend`), and with
 * `toggleableLegend` its rows show and hide their segments through `hiddenSegments`.
 * `legendPosition` puts it under the bar, over it or beside it.
 *
 * **On the chart theme.** A segment with no `color` takes the next colour of the chart
 * palette (`--wr-chart-1` to `-8`), solid, and a 1px line in the surface parts two
 * segments. Hovering a segment or its legend row dims the others. With no segment the
 * bar is an empty track with "No data" under it; `loading` and `error` put their own
 * message there.
 *
 * @see https://ngwr.dev/charts/meter-group
 */
@Component({
  selector: 'wr-meter-group',
  templateUrl: './meter-group.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    // `wr-chart--legend`: the shared rule that keeps the legend's room from the bar.
    class: 'wr-meter-group wr-chart--legend',
    '[class.wr-chart--legend-side]': 'legendShown() && legendSide()',
  },
  imports: [NgTemplateOutlet, WrChartLegend, WrChartState],
  // The legend's rows keep the classes this chart drew before it drew them through
  // `WrChartLegend`: `.wr-meter-group__legend-item`, `__swatch`, `__legend-label` and
  // `__legend-value`.
  viewProviders: [{ provide: WR_CHART_LEGEND_BLOCK, useValue: 'wr-meter-group' }],
})
export class WrMeterGroup {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('charts/meter-group');
    // One pair of listeners on the host, not two on every band: the band under the pointer
    // is the nearest element up from it carrying `data-wr-index`, its segment's position.
    useChartHover({ enter: index => this.tip.enter(index), leave: event => this.tip.leave(event) });
  }

  /** Accessible name — the role needs one. Falls back to `meterGroup.label`. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'meterGroup.label', 'Meter');

  /**
   * The parts of the bar, in order. Each segment is drawn as its share of `max` when
   * set, else of the sum of the segments shown, so they need not add up to anything in
   * particular.
   */
  readonly segments = input<readonly WrMeterSegment[]>([]);

  /** Explicit total, a capacity the segments fill. `0` (default) uses the sum of the segments shown. @default 0 */
  readonly max = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /**
   * Show the labelled legend. `'auto'` leaves it out for a single segment, which has
   * nothing to tell apart; `true` shows it for one too, since the row carries the value.
   * @default true
   */
  readonly showLegend = input<boolean | 'auto', unknown>(true, {
    transform: (value: unknown): boolean | 'auto' => (value === 'auto' ? 'auto' : coerceBooleanProperty(value)),
  });

  /**
   * Where the legend sits: `bottom` or `top` of the bar as a wrapping row, `start` or
   * `end` of it as a column, or `none` for no legend at all - `hiddenSegments` still
   * hides a segment from outside. @default 'bottom'
   */
  readonly legendPosition = input<WrChartLegendPosition>('bottom');

  /**
   * A request for the meter's data is in flight: the bar empties and the loading message
   * takes the legend's place. @default false
   */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /**
   * The meter's data failed to load: the bar empties and the error message takes the
   * legend's place. `loading` wins while both are set. @default false
   */
  readonly error = input(false, { transform: coerceBooleanProperty });

  /** The message shown when there is no segment. Falls back to `chart.empty`, then `'No data'`. */
  readonly emptyLabel = input<string | null>(null);

  /** The message shown while `loading`. Falls back to `chart.loading`, then `'Loading…'`. */
  readonly loadingLabel = input<string | null>(null);

  /** The message shown on `error`. Falls back to `chart.error`, then `'Could not load'`. */
  readonly errorLabel = input<string | null>(null);

  /** Show each segment's value in the legend, next to its label. @default true */
  readonly showValues = input(true, { transform: coerceBooleanProperty });

  /**
   * Make each legend row a toggle button that shows and hides its segment, through
   * `hiddenSegments`. A row is a `<button aria-pressed>`, pressed while its segment is
   * shown, so the legend becomes one tab stop per segment. @default false
   */
  readonly toggleableLegend = input(false, { transform: coerceBooleanProperty });

  /**
   * The positions in `segments` of the segments that are hidden. Positions rather than
   * labels, since two segments may share a label. A toggleable legend writes it, and a
   * host may bind it with or without one: `[(hiddenSegments)]`.
   *
   * A hidden segment is left out of the bar and out of the sum. With no `max`, the
   * segments still shown share the whole bar between them, each at its share of their
   * own total, as `wr-donut-chart`'s slices do: the bar is the whole of what it draws.
   * An explicit `max` is a capacity rather than a sum, so it stays, and the hidden
   * segment's share becomes empty track. Either way the bar announces the total of the
   * segments shown (`aria-valuenow`, `aria-valuetext`), since that is what it draws, and
   * the tooltip cannot open on a segment that is not drawn. The legend keeps the hidden
   * segment's row, struck through and with its own value, so it can be shown again; the
   * row says "hidden" to a screen reader as well, through `aria-pressed` on a toggle and
   * a visually hidden word otherwise. A position past the end of `segments` is kept and
   * ignored.
   */
  readonly hiddenSegments = model<readonly number[]>([]);

  /**
   * Show a tooltip with the segment's label and value on hover. It replaces the
   * band's `title`, which is written only while this is off — or the browser would
   * open a second copy a moment later. @default true
   */
  readonly tooltip = input(true, { transform: coerceBooleanProperty });

  /**
   * Writes every value in the legend and the tooltip, and the total the bar announces
   * as `aria-valuetext`. `null` uses `Intl.NumberFormat` in `LOCALE_ID`.
   * `aria-valuenow` stays a number.
   */
  readonly valueFormat = input<((value: number) => string) | null>(null);

  /** Each value as the legend, the tooltip and the bar print it: never compact, in `LOCALE_ID` unless `valueFormat` is given. */
  private readonly numbers = useChartNumbers(this.valueFormat);

  private readonly barEl = viewChild.required<ElementRef<HTMLElement>>('bar');
  private readonly sliceEls = viewChildren<ElementRef<HTMLElement>>('slice');

  /**
   * A segment's contribution, floored at `0` and with anything non-finite read
   * as `0`. One `NaN` used to poison the whole bar: the sum is `NaN` as soon as
   * one value is, so the total fell back to `1` and every OTHER segment was
   * asked for a width of `value * 100`%, while `aria-valuenow` announced `NaN`.
   */
  private static amount(raw: number): number {
    return Number.isFinite(raw) ? Math.max(0, raw) : 0;
  }

  private readonly hidden = computed(() => new Set(this.hiddenSegments()));

  /** What the segments still shown add up to (see `hiddenSegments`). */
  private readonly shownSum = computed(() => {
    const hidden = this.hidden();
    return this.segments().reduce((acc, s, i) => acc + (hidden.has(i) ? 0 : WrMeterGroup.amount(s.value)), 0);
  });

  protected readonly resolvedMax = computed(() => {
    const explicit = this.max();
    if (explicit > 0) return explicit;
    const sum = this.shownSum();
    return sum > 0 ? sum : 1;
  });

  /**
   * Sum of the segments, for `aria-valuenow`. `role="progressbar"` without it
   * announces no value at all, so the bar was invisible to assistive tech.
   *
   * Capped at the total, because segments summing past an explicit `max` used
   * to announce a value outside the range they were announced against.
   */
  protected readonly totalValue = computed(() => Math.min(this.resolvedMax(), this.shownSum()));

  /**
   * The total as the bar announces it — `aria-valuetext`, written the way the legend
   * writes each figure — so a `valueFormat` that adds a unit reaches a screen reader
   * too, rather than a bare percentage of `aria-valuemax`. The gauge does the same.
   */
  protected readonly totalText = computed(() => this.numbers.value(this.totalValue()));

  protected readonly slices = computed(() => {
    const hidden = this.hidden();
    const max = this.resolvedMax();
    return this.segments().map((segment, i) => ({
      index: i,
      label: segment.label,
      // The legend keeps a negative value visible — it is data the caller gave
      // us — but not a non-finite one, which reads as the literal text `NaN`.
      text: this.numbers.value(Number.isFinite(segment.value) ? segment.value : 0),
      color: segment.color ?? wrChartColor(i),
      hidden: hidden.has(i),
      percent: hidden.has(i) ? 0 : (WrMeterGroup.amount(segment.value) / max) * 100,
    }));
  });

  /**
   * The bands drawn, in order: every segment but the hidden ones. A hidden band is left
   * out rather than drawn at zero width, since a zero band still lays its gap over the
   * boundary and would leave a double one.
   */
  protected readonly bands = computed(() => {
    const shown = this.slices().filter(slice => !slice.hidden);
    let end = 0;
    return shown.map((slice, at) => {
      const size = slice.percent / 100;
      end = Math.min(1, end + size);
      return {
        ...slice,
        /** Its share of the bar, 0 to 1. */
        size: wrChartRound(size, 5),
        /**
         * Where it ends, as a share of the bar from its start. Every band is as wide as the
         * bar and slid back so that it ends here, under the bands before it: its length on
         * screen is then a transform, and a new value lays nothing out.
         */
        end: wrChartRound(end, 5),
        /** Its place in the pile: the first band on top, so each covers the start of the next. */
        layer: shown.length - at,
      };
    });
  });

  /** The legend's rows: every segment, hidden ones included, with its value unless `showValues` is off. */
  protected readonly legendItems = computed<readonly WrChartLegendItem[]>(() => {
    const values = this.showValues();
    return this.slices().map(({ label, color, text }) => ({ label, color, value: values ? text : null }));
  });

  /**
   * One tooltip for the whole bar, pointing at the hovered band, with the value as
   * the legend prints it. Asked by the segment's own position, and the drawn bands are
   * only the shown ones, so the band is found among them by that position.
   */
  protected readonly tip = useChartTooltip(this.tooltip, index => {
    const at = this.bands().findIndex(band => band.index === index);
    const band = this.bands()[at];
    const el = this.sliceEls()[at]?.nativeElement;
    if (!band || !el) return null;
    // The band's own box is as wide as the bar, most of it out of sight under the bands
    // before it, so the chip points at the part of the bar the band shows.
    const bar = this.barEl().nativeElement;
    const box = bar.getBoundingClientRect();
    const rtl = getComputedStyle(bar).direction === 'rtl';
    const width = band.size * box.width;
    const x = rtl ? box.right - band.end * box.width : box.left + band.end * box.width - width;
    return {
      datum: { label: band.label, value: band.text, color: band.color },
      anchor: { x, y: box.top, width, height: box.height },
    };
  });

  /**
   * Whether the meter draws its legend: unless `showLegend` is off, `legendPosition` is
   * `none`, or there is no segment. Under `showLegend="auto"` a single segment draws none.
   */
  protected readonly legendShown = computed(() => {
    const show = this.showLegend();
    const rows = this.slices().length;
    if (show === false || rows === 0 || this.legendPosition() === 'none') return false;
    return show === true || rows > 1;
  });

  /** Whether the legend comes before the bar, in the DOM as on screen: above it, or at inline start. */
  protected readonly legendFirst = computed(() => {
    const position = this.legendPosition();
    return position === 'top' || position === 'start';
  });

  /** Whether the legend sits beside the bar rather than above or below it. */
  protected readonly legendSide = computed(() => {
    const position = this.legendPosition();
    return position === 'start' || position === 'end';
  });

  /** What the meter shows in place of its legend, or `null` while it draws its segments. */
  protected readonly state = useChartState({
    loading: this.loading,
    error: this.error,
    empty: computed(() => this.segments().length === 0),
    emptyLabel: this.emptyLabel,
    loadingLabel: this.loadingLabel,
    errorLabel: this.errorLabel,
  });
}
