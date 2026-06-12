/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, LOCALE_ID, ViewEncapsulation, computed, forwardRef, inject, input, signal } from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { WrInput, WrInputGroup, WrInputPrefix, WrInputSuffix } from 'ngwr/input';
import { clamp, noop, round } from 'ngwr/utils';

/** Round to `decimals` places, avoiding common float artefacts (`1.005 → 1.01`). */

/** Resolve the locale's decimal + grouping separators from `Intl.NumberFormat`. */
function resolveSeparators(locale: string): { decimal: string; group: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  const decimal = parts.find(p => p.type === 'decimal')?.value ?? '.';
  const group = parts.find(p => p.type === 'group')?.value ?? '';
  return { decimal, group };
}

/**
 * Numeric input with locale-aware formatting + ▲▼ stepper buttons.
 *
 * Implements `ControlValueAccessor` — value type is `number | null`.
 * Parses leniently while typing (allows partial input like `"1."` or `"-"`),
 * re-formats with grouping + fixed decimals on blur.
 *
 * Locale comes from Angular's `LOCALE_ID` — input-number intentionally does
 * NOT depend on `ngwr/date-adapter` so it can be used in date-free apps.
 *
 * @example
 * ```html
 * <wr-input-number [(ngModel)]="qty" [min]="0" [max]="100" />
 * <wr-input-number [(ngModel)]="price" [decimals]="2" suffix="USD" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/input-number
 */
@Component({
  selector: 'wr-input-number',
  templateUrl: './input-number.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrInput, WrInputGroup, WrInputPrefix, WrInputSuffix],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrInputNumber),
      multi: true,
    },
  ],
})
export class WrInputNumber implements ControlValueAccessor {
  /** Minimum allowed value. @default -Infinity */
  readonly min = input(Number.NEGATIVE_INFINITY, {
    transform: (v: unknown): number => coerceNumberProperty(v, Number.NEGATIVE_INFINITY),
  });

  /** Maximum allowed value. @default Infinity */
  readonly max = input(Number.POSITIVE_INFINITY, {
    transform: (v: unknown): number => coerceNumberProperty(v, Number.POSITIVE_INFINITY),
  });

  /** Step used by stepper buttons + arrow keys. @default 1 */
  readonly step = input(1, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 1)) });

  /** Fixed number of decimals shown on blur. `null` keeps the entered precision. @default null */
  readonly decimals = input<number | null>(null);

  /** Render the ▲▼ stepper column. @default true */
  readonly showSteppers = input(true, { transform: coerceBooleanProperty });

  /** Optional prefix label (e.g. `"$"`). */
  readonly prefix = input<string>('');

  /** Optional suffix label (e.g. `"kg"`). */
  readonly suffix = input<string>('');

  /** Placeholder shown when the input is empty. */
  readonly placeholder = input<string>('');

  /** Disable interaction. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Read-only — values cannot be changed (steppers + typing disabled). @default false */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  private readonly locale = inject(LOCALE_ID);
  private readonly separators = resolveSeparators(this.locale);

  /** Current numeric value mirrored from the CVA. */
  protected readonly value = signal<number | null>(null);

  /** Text currently in the input (may be partial / invalid mid-type). */
  protected readonly text = signal<string>('');

  private readonly disabledFromCva = signal(false);

  protected readonly effectiveDisabled = computed(() => this.disabled() || this.disabledFromCva());

  protected readonly interactive = computed(() => !this.effectiveDisabled() && !this.readonly());

  protected readonly atMin = computed(() => {
    const v = this.value();
    return v !== null && v <= this.min();
  });

  protected readonly atMax = computed(() => {
    const v = this.value();
    return v !== null && v >= this.max();
  });

  protected readonly classes = computed(() => {
    const parts = ['wr-input-number'];
    if (this.effectiveDisabled()) parts.push('wr-input-number--disabled');
    return parts.join(' ');
  });

  // ControlValueAccessor

  private onChange: (value: number | null) => void = noop;
  private onTouched: () => void = noop;

  writeValue(value: number | null): void {
    if (value === null || value === undefined || Number.isNaN(value)) {
      this.value.set(null);
      this.text.set('');
      return;
    }
    const coerced = this.constrain(Number(value));
    this.value.set(coerced);
    this.text.set(this.format(coerced));
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledFromCva.set(coerceBooleanProperty(isDisabled));
  }

  // Template handlers

  protected onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.text.set(raw);
    if (!raw.trim()) {
      this.value.set(null);
      this.onChange(null);
      return;
    }
    const parsed = this.parse(raw);
    if (parsed === null) return; // partial input — wait for more
    const next = this.constrain(parsed);
    this.value.set(next);
    this.onChange(next);
  }

  protected onBlur(): void {
    this.onTouched();
    const v = this.value();
    if (v === null) {
      this.text.set('');
      return;
    }
    this.text.set(this.format(v));
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.interactive()) return;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const direction = event.key === 'ArrowUp' ? 1 : -1;
    const multiplier = event.shiftKey ? 10 : 1;
    this.bump(direction * multiplier);
  }

  protected stepBy(direction: 1 | -1): void {
    if (!this.interactive()) return;
    this.bump(direction);
  }

  // Internals

  private bump(units: number): void {
    const stepSize = this.step() || 1;
    const base = this.value() ?? this.fallbackBase();
    const next = this.constrain(base + units * stepSize);
    this.value.set(next);
    this.text.set(this.format(next));
    this.onChange(next);
  }

  /** Choose a sensible starting point when bumping from `null`. */
  private fallbackBase(): number {
    if (Number.isFinite(this.min()) && this.min() > 0) return this.min();
    if (Number.isFinite(this.max()) && this.max() < 0) return this.max();
    return 0;
  }

  private constrain(v: number): number {
    let next = clamp(v, this.min(), this.max());
    const d = this.decimals();
    if (d !== null) next = round(next, d);
    return next;
  }

  /** Parse a locale-formatted string. Returns `null` for partial / not-yet-numeric input. */
  private parse(raw: string): number | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    // Strip group separators, normalise the decimal separator to `.`.
    let normalised = trimmed;
    if (this.separators.group) {
      normalised = normalised.split(this.separators.group).join('');
    }
    if (this.separators.decimal !== '.') {
      normalised = normalised.split(this.separators.decimal).join('.');
    }
    // Partial inputs we don't want to clobber while the user is still typing:
    // `-`, `-.`, `.`, `1.`, `-1.` etc.
    if (/^-?\.?$/.test(normalised) || normalised.endsWith('.')) return null;
    const n = Number(normalised);
    return Number.isFinite(n) ? n : null;
  }

  /** Format a value using `Intl.NumberFormat` for the active locale. */
  private format(v: number): string {
    const d = this.decimals();
    const formatter = new Intl.NumberFormat(this.locale, {
      minimumFractionDigits: d ?? 0,
      maximumFractionDigits: d ?? 20,
      useGrouping: true,
    });
    return formatter.format(v);
  }
}
