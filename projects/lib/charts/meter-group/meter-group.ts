/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, type ElementRef, ViewEncapsulation, computed, input, model, viewChildren } from '@angular/core';

import { WR_CHART_LEGEND_BLOCK, WrChartLegend, type WrChartLegendItem } from 'ngwr/charts/chart-legend';
import { chartColor, useChartNumbers } from 'ngwr/charts/core';
import { useI18nText } from 'ngwr/i18n';
import { useChartTooltip } from 'ngwr/popover';

import type { WrMeterSegment } from './types';

/**
 * Stacked-segment progress bar. Visualises a breakdown of a total —
 * disk usage, budget, vote share, etc. Each segment contributes a slice
 * proportional to its `value` relative to the sum (or the explicit `max`).
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
 *
 * @see https://ngwr.dev/charts/meter-group
 */
@Component({
  selector: 'wr-meter-group',
  templateUrl: './meter-group.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-meter-group' },
  imports: [WrChartLegend],
  // The legend's rows keep the classes this chart drew before it drew them through
  // `WrChartLegend`: `.wr-meter-group__legend-item`, `__swatch`, `__legend-label` and
  // `__legend-value`.
  viewProviders: [{ provide: WR_CHART_LEGEND_BLOCK, useValue: 'wr-meter-group' }],
})
export class WrMeterGroup {
  /** Accessible name — the role needs one. Falls back to `meterGroup.label`. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'meterGroup.label', 'Meter');

  /**
   * The parts of the bar, in order. Values are summed and each segment is drawn
   * as its share of that total, so they need not add up to anything in particular.
   */
  readonly segments = input<readonly WrMeterSegment[]>([]);

  /** Explicit total. When `0` (default), `max = sum(values)`. @default 0 */
  readonly max = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /** Show the labelled legend under the bar. @default true */
  readonly showLegend = input(true, { transform: coerceBooleanProperty });

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

  /** Each value as the legend, the tooltip and the bar print it: exact, in `LOCALE_ID` unless `valueFormat` is given. */
  private readonly numbers = useChartNumbers(this.valueFormat);

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
      color: segment.color ?? chartColor(i),
      hidden: hidden.has(i),
      percent: hidden.has(i) ? 0 : (WrMeterGroup.amount(segment.value) / max) * 100,
    }));
  });

  /**
   * The bands drawn, in order: every segment but the hidden ones. A hidden band is left
   * out rather than drawn at zero width, since a zero band still lays its gap over the
   * boundary and would leave a double one.
   */
  protected readonly bands = computed(() => this.slices().filter(slice => !slice.hidden));

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
    const slice = this.slices()[index];
    if (!slice || slice.hidden) return null;
    const el = this.sliceEls()[this.bands().indexOf(slice)]?.nativeElement;
    if (!el) return null;
    return { datum: { label: slice.label, value: slice.text, color: slice.color }, anchor: el };
  });
}
