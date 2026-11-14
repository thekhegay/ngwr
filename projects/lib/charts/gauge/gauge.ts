/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, type ElementRef, ViewEncapsulation, computed, input, viewChild } from '@angular/core';

import { WrChartState, useChartNumbers, useChartState, wrChartRound } from 'ngwr/charts/core';
import { useI18nText } from 'ngwr/i18n';
import { useChartTooltip } from 'ngwr/popover';
import { wrClamp, wrCheckStyles } from 'ngwr/utils';

/**
 * Semicircle progress gauge. Display-only — for interactive use see the
 * {@link WrKnob} from `ngwr/knob`.
 *
 * @example
 * ```html
 * <wr-gauge [value]="72" />
 * <wr-gauge [value]="9.5" [min]="0" [max]="10" suffix="/10" valueColor="var(--wr-color-warning)" />
 * ```
 *
 * **The look is the chart theme's.** The arc is the first colour of the chart palette
 * (`--wr-chart-1`) over a track in `--wr-chart-track`, and `strokeWidth` is in CSS pixels,
 * so two gauges of different sizes draw the same arc. `valueColor` takes any colour: a
 * palette token, or an intent once the reading crosses a threshold.
 *
 * **Loading and error.** `loading` and `error` put their message in place of the reading,
 * over the track; the gauge is a named group rather than a meter while it has no reading
 * to announce.
 *
 * @see https://ngwr.dev/charts/gauge
 */
@Component({
  selector: 'wr-gauge',
  templateUrl: './gauge.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-gauge' },
  imports: [WrChartState],
})
export class WrGauge {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('charts/gauge');
  }

  /** Accessible name — the role needs one. Falls back to `gauge.label`. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'gauge.label', 'Gauge');

  /**
   * The reading. Coerced like every other numeric input here — it was the only one
   * without it, so a NaN reached the arc's `d` as the literal text `NaN`, which is
   * invalid path geometry and drops the arc.
   */
  readonly value = input.required<number, unknown>({
    transform: (v: unknown): number => coerceNumberProperty(v, 0),
  });
  /**
   * Low end of the scale — where the arc starts. Values below it clamp here.
   * @default 0
   */
  readonly min = input(0, { transform: (v: unknown): number => coerceNumberProperty(v, 0) });
  /**
   * High end of the scale — where the arc completes. Values above it clamp here.
   * @default 100
   */
  readonly max = input(100, { transform: (v: unknown): number => coerceNumberProperty(v, 100) });

  /** Diameter in CSS pixels. @default 160 */
  readonly size = input(160, { transform: (v: unknown): number => Math.max(48, coerceNumberProperty(v, 160)) });

  /**
   * Arc stroke thickness in CSS pixels, the same at any `size`. It was a share of the
   * drawing until 16.5, so a gauge twice the size drew an arc twice as thick.
   * @default 16
   */
  readonly strokeWidth = input(16, {
    transform: (v: unknown): number => Math.max(1, coerceNumberProperty(v, 16)),
  });

  /**
   * Colour of the unfilled arc behind the value. Any CSS colour; the default is the
   * chart theme's track, shared with the meter group and the bullet chart.
   * @default 'var(--wr-chart-track)'
   */
  readonly trackColor = input<string>('var(--wr-chart-track)');
  /**
   * Colour of the filled arc. Any CSS colour: the default is the first colour of the
   * chart palette; pass another (`var(--wr-chart-3)`), or an intent token to tie it to
   * a threshold, e.g. `var(--wr-color-danger)` once the value crosses one.
   * @default 'var(--wr-chart-1)'
   */
  readonly valueColor = input<string>('var(--wr-chart-1)');

  /** Show the value text in the center. @default true */
  readonly showValue = input(true, { transform: coerceBooleanProperty });

  /**
   * Unit printed immediately after the number — `%`, `/10`, ` GB`. It goes into
   * the accessible text too, so the gauge is announced the way it reads.
   */
  readonly suffix = input<string>('');

  /**
   * A request for the reading is in flight: the arc and the number give way to the
   * loading message, over the track. @default false
   */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /**
   * The reading failed to load: the arc and the number give way to the error message.
   * `loading` wins while both are set. @default false
   */
  readonly error = input(false, { transform: coerceBooleanProperty });

  /** The message shown while `loading`. Falls back to `chart.loading`, then `'Loading…'`. */
  readonly loadingLabel = input<string | null>(null);

  /** The message shown on `error`. Falls back to `chart.error`, then `'Could not load'`. */
  readonly errorLabel = input<string | null>(null);

  /**
   * Show a tooltip with the reading on hover, named by `ariaLabel` when one is
   * given. Pointer only — the meter announces the same reading. @default true
   */
  readonly tooltip = input(true, { transform: coerceBooleanProperty });

  /**
   * Writes the reading in the centre, the tooltip and `aria-valuetext`, before
   * `suffix`. `null` uses `Intl.NumberFormat` in `LOCALE_ID`. `aria-valuenow` stays a
   * number.
   */
  readonly valueFormat = input<((value: number) => string) | null>(null);

  /** The reading as the centre, the tooltip and `aria-valuetext` write it: never compact. */
  private readonly numbers = useChartNumbers(this.valueFormat);

  private readonly surface = viewChild<ElementRef<HTMLElement>>('surface');

  // Geometry — a semicircle in a viewBox 100 wide (centre at 50, 50), as tall as the arc's
  // round caps reach below the centre: 56 at the default stroke.
  protected readonly cx = 50;
  protected readonly cy = 50;

  /**
   * The stroke in the viewBox's units. The drawing is `size` px wide and 100 units wide,
   * so a width in pixels is that many hundredths of `size`: worked out from the input
   * rather than measured, since the surface is laid out at exactly `size`, and the radius
   * and the viewBox depend on it, which a non-scaling stroke would leave behind.
   */
  protected readonly stroke = computed(() => wrChartRound((this.strokeWidth() * 100) / this.size(), 2));

  // A negative radius is invalid in the SVG path grammar, so the browser drops the arc
  // and the dial vanishes — which a fat stroke reaches at 99 units. `wr-knob` floors it too.
  protected readonly radius = computed(() => Math.max(1, wrChartRound(50 - this.stroke() / 2 - 0.5, 2)));

  /**
   * The reading as it can actually be shown. Only `ratio` used to be clamped, so an
   * over-range value drew a full bar while `aria-valuenow` announced the raw number
   * against `aria-valuemax` — an invalid state for `role="meter"` — and the printed
   * text disagreed with the bar as well.
   */
  protected readonly displayValue = computed(() => wrClamp(this.value(), this.min(), this.max()));

  /** The reading as the centre prints it, without the suffix. */
  protected readonly displayText = computed(() => this.numbers.value(this.displayValue()));

  protected readonly ratio = computed(() => {
    const range = this.max() - this.min();
    if (range <= 0) return 0;
    return wrClamp((this.value() - this.min()) / range, 0, 1);
  });

  protected readonly trackPath = computed(() => {
    const r = this.radius();
    return `M ${this.cx - r} ${this.cy} A ${r} ${r} 0 0 1 ${this.cx + r} ${this.cy}`;
  });

  protected readonly valuePath = computed(() => {
    // Nothing to draw at zero. A zero-length arc is not nothing: its round cap paints a
    // dot a stroke wide at the start of the track, so 0 read as a small reading.
    if (this.ratio() === 0) return null;
    const r = this.radius();
    const angle = Math.PI * (1 - this.ratio());
    const ex = this.cx + r * Math.cos(angle);
    const ey = this.cy - r * Math.sin(angle);
    // The arc always spans `π × ratio` radians (≤ 180°), so largeArc stays 0.
    // Previously this was set to 1 when ratio > 0.5, which made the swept arc
    // take the long way round and visually flipped the bar.
    return `M ${this.cx - r} ${this.cy} A ${r} ${r} 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  });

  /** A unit past the caps, which end half a stroke below the centre. */
  protected readonly viewBox = computed(() => `0 0 100 ${wrChartRound(this.cy + this.stroke() / 2 + 1, 2)}`);

  /** Loading, or a failed load, or `null` while the gauge shows its reading. A gauge always has a value, so it is never empty. */
  protected readonly state = useChartState({
    loading: this.loading,
    error: this.error,
    empty: computed(() => false),
    emptyLabel: computed(() => null),
    loadingLabel: this.loadingLabel,
    errorLabel: this.errorLabel,
  });

  /**
   * The reading as the meter announces it — `aria-valuetext`, the number plus the
   * suffix — so the tooltip, the printed value and a screen reader all say one
   * thing.
   */
  protected readonly valueText = computed(() => `${this.displayText()}${this.suffix()}`);

  /**
   * One tooltip, pointing at the top of the dial. The whole gauge is one section.
   * The label is the `ariaLabel` input and not the catalog fallback, which names
   * the kind of widget rather than the reading.
   */
  protected readonly tip = useChartTooltip(this.tooltip, () => {
    const el = this.surface()?.nativeElement;
    // No reading to show under a state: its message is already on the dial.
    if (!el || this.state()) return null;
    return {
      datum: { label: this.ariaLabel() ?? undefined, value: this.valueText(), color: this.valueColor() },
      anchor: el,
    };
  });
}
