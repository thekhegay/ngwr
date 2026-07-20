/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import {
  Component,
  LOCALE_ID,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';

import { WrCountUp } from 'ngwr/counter';
import { WrPlatform } from 'ngwr/platform';
import { numAttr } from 'ngwr/utils';

/**
 * KPI card — label + big number + optional prefix/suffix + delta. Pair
 * with `<wr-statistic-group>` for a responsive dashboard grid.
 *
 * When `value` is numeric the number counts up (eased) from its previous
 * value to the new one on every change — see `animate`. String values and
 * `prefers-reduced-motion` render instantly.
 *
 * @example
 * ```html
 * <wr-statistic label="Active users" [value]="12345" suffix="users" />
 * <wr-statistic label="Revenue" [value]="9512" prefix="$" [delta]="12.4" />
 * <wr-statistic label="Churn" [value]="1.8" suffix="%" [precision]="1" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/statistic
 */
@Component({
  selector: 'wr-statistic',
  templateUrl: './statistic.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-statistic' },
  imports: [WrCountUp],
})
export class WrStatistic {
  private readonly platform = inject(WrPlatform);
  private readonly locale = inject(LOCALE_ID);

  readonly label = input<string>('');

  /** The number (or string) to display in the main slot. */
  readonly value = input<number | string | null>(null);

  /** Prefix glyph / symbol (e.g. `'$'`). */
  readonly prefix = input<string>('');

  /** Suffix glyph / unit (e.g. `'%'`, `'kg'`). */
  readonly suffix = input<string>('');

  /** Fixed number of decimals applied to numeric values. @default 0 */
  readonly precision = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /**
   * Count up to a new numeric `value` instead of swapping instantly. Always
   * off for string values or under `prefers-reduced-motion`. @default true
   */
  readonly animate = input(true, { transform: coerceBooleanProperty });

  /** Count-up duration (ms). @default 700 */
  readonly duration = input(700, { transform: numAttr(700) });

  /**
   * The current value coerced to a finite number, or `null` when `value` is
   * a non-numeric string / empty / nullish (rendered as-is).
   */
  protected readonly numericValue = computed<number | null>(() => {
    const raw = this.value();
    if (raw === null || raw === '') return null;
    const n = typeof raw === 'number' ? raw : coerceNumberProperty(raw, Number.NaN);
    return Number.isFinite(n) ? n : null;
  });

  /** Whether the value should count up (browser, numeric, opted-in, motion allowed). */
  protected readonly animated = computed<boolean>(
    () =>
      this.platform.isBrowser && this.animate() && !this.platform.prefersReducedMotion() && this.numericValue() !== null
  );

  /** Animation start — the previously-rendered numeric value (0 on first paint). */
  protected readonly animateFrom = signal(0);

  /** Bookkeeping: the last numeric value seen, fed back as the next `from`. */
  private readonly lastNumeric = signal(0);

  constructor() {
    // Whenever the numeric value changes, snapshot the prior value as the
    // count-up start, then remember the new one for the next transition.
    effect(() => {
      const next = this.numericValue();
      if (next === null) return;
      untracked(() => {
        this.animateFrom.set(this.lastNumeric());
        this.lastNumeric.set(next);
      });
    });
  }

  /**
   * Static (non-animated) display string. Numeric values honour `precision`
   * and locale grouping so they match the count-up output; everything else
   * renders verbatim with an em-dash fallback.
   */
  protected readonly displayValue = computed<string>(() => {
    const n = this.numericValue();
    if (n !== null) {
      return new Intl.NumberFormat(this.locale, {
        minimumFractionDigits: this.precision(),
        maximumFractionDigits: this.precision(),
      }).format(n);
    }
    return String(this.value() ?? '—');
  });

  /**
   * Optional delta vs previous period — shown as `+x.x%` (or `-x.x%`).
   * Use `deltaSuffix` to change the trailing unit.
   */
  readonly delta = input<number | null>(null, {
    transform: (v: unknown): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = coerceNumberProperty(v, Number.NaN);
      return Number.isFinite(n) ? n : null;
    },
  });

  /** Unit appended to the delta value. @default '%' */
  readonly deltaSuffix = input<string>('%');

  protected readonly hasDelta = computed(() => this.delta() !== null);

  protected readonly deltaDirection = computed<'up' | 'down' | 'flat'>(() => {
    const d = this.delta();
    if (d === null || d === 0) return 'flat';
    return d > 0 ? 'up' : 'down';
  });

  protected readonly deltaText = computed(() => {
    const d = this.delta();
    if (d === null) return '';
    const sign = d > 0 ? '+' : '';
    return `${sign}${d}${this.deltaSuffix()}`;
  });
}
