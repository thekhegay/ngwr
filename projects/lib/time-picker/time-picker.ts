/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { WrDateAdapter, WR_DATE_LOCALE } from 'ngwr/date-adapter';
import { noop } from 'ngwr/utils';

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Wraps a value into `[0, modulus)` so steppers cycle nicely. */
function wrap(v: number, modulus: number): number {
  return ((v % modulus) + modulus) % modulus;
}

/** Detect whether a locale uses 12-hour time by default. */
function isLocaleHour12(locale: string): boolean {
  try {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12 === true;
  } catch {
    return false;
  }
}

/**
 * Numeric time picker — `HH:MM` (or `HH:MM:SS`) with optional AM/PM column.
 * Each field is a stepper: ▲ / typeable input / ▼. AM/PM works the same
 * — both arrows toggle.
 *
 * Implements `ControlValueAccessor` — value is `Date | null` (only the hours,
 * minutes and seconds matter; the date portion is preserved). When typing
 * into an empty picker, today's date is used for the date portion.
 *
 * 12 / 24-hour mode is locale-aware by default — `format="auto"` (the default)
 * picks 12h for `en-US` and similar, 24h for most other locales. Override
 * explicitly with `format="12h"` / `format="24h"`.
 *
 * @example
 * ```html
 * <wr-time-picker [(ngModel)]="picked" />
 * <wr-time-picker [(ngModel)]="picked" format="24h" [showSeconds]="true" [step]="5" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/time-picker
 */
@Component({
  selector: 'wr-time-picker',
  templateUrl: './time-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrTimePicker),
      multi: true,
    },
  ],
})
export class WrTimePicker implements ControlValueAccessor {
  /** 12 / 24-hour mode. @default 'auto' (derived from the locale) */
  readonly format = input<'auto' | '12h' | '24h'>('auto');

  /** Render a third column for seconds. @default false */
  readonly showSeconds = input(false, { transform: coerceBooleanProperty });

  /** Step applied to minutes / seconds steppers. @default 1 */
  readonly step = input(1, { transform: (v: unknown): number => Math.max(1, coerceNumberProperty(v, 1)) });

  /** Disable interaction. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Read-only — values cannot be changed. @default false */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  private readonly adapter = inject<WrDateAdapter<Date>>(WrDateAdapter);
  private readonly locale = inject(WR_DATE_LOCALE);

  /** Source of truth — stores h/m/s in 24-hour form. */
  protected readonly hours = signal(0);
  protected readonly minutes = signal(0);
  protected readonly seconds = signal(0);

  /** Date portion preserved across updates (today's date if none was supplied). */
  private readonly basis = signal<Date>(this.adapter.today());

  private readonly disabledFromCva = signal(false);

  protected readonly effectiveDisabled = computed(() => this.disabled() || this.disabledFromCva());

  protected readonly interactive = computed(() => !this.effectiveDisabled() && !this.readonly());

  /** Resolved format — turns 'auto' into '12h' or '24h' based on the locale. */
  protected readonly is12h = computed(() => {
    const f = this.format();
    if (f === '12h') return true;
    if (f === '24h') return false;
    return isLocaleHour12(this.locale);
  });

  /** Hours value shown in the input (1-12 in 12h mode, 0-23 otherwise). */
  protected readonly displayHours = computed(() => {
    if (!this.is12h()) return this.hours();
    const h = this.hours() % 12;
    return h === 0 ? 12 : h;
  });

  protected readonly isPm = computed(() => this.hours() >= 12);

  protected readonly amPmLabel = computed(() => (this.isPm() ? 'PM' : 'AM'));

  // Padded values for the input display.
  protected readonly hoursDisplay = computed(() => pad(this.displayHours()));
  protected readonly minutesDisplay = computed(() => pad(this.minutes()));
  protected readonly secondsDisplay = computed(() => pad(this.seconds()));

  protected readonly classes = computed(() => {
    const parts = ['wr-time-picker'];
    if (this.is12h()) parts.push('wr-time-picker--12h');
    if (this.showSeconds()) parts.push('wr-time-picker--with-seconds');
    if (this.effectiveDisabled()) parts.push('wr-time-picker--disabled');
    return parts.join(' ');
  });

  // ──────── ControlValueAccessor ────────

  private onChange: (value: Date | null) => void = noop;
  private onTouched: () => void = noop;

  writeValue(value: Date | null): void {
    if (value && this.adapter.isValid(value)) {
      this.basis.set(this.adapter.clone(value));
      this.hours.set(this.adapter.getHours(value));
      this.minutes.set(this.adapter.getMinutes(value));
      this.seconds.set(this.adapter.getSeconds(value));
    } else {
      this.basis.set(this.adapter.today());
      this.hours.set(0);
      this.minutes.set(0);
      this.seconds.set(0);
    }
  }

  registerOnChange(fn: (value: Date | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledFromCva.set(coerceBooleanProperty(isDisabled));
  }

  // ──────── Typed-input handlers ────────

  protected onHoursInput(raw: string): void {
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    if (this.is12h()) {
      const h12 = clamp(Math.trunc(n), 1, 12) % 12;
      this.hours.set(this.isPm() ? h12 + 12 : h12);
    } else {
      this.hours.set(clamp(Math.trunc(n), 0, 23));
    }
    this.emit();
  }

  protected onMinutesInput(raw: string): void {
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    this.minutes.set(clamp(Math.trunc(n), 0, 59));
    this.emit();
  }

  protected onSecondsInput(raw: string): void {
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    this.seconds.set(clamp(Math.trunc(n), 0, 59));
    this.emit();
  }

  protected onBlur(): void {
    this.onTouched();
  }

  // ──────── Stepper handlers (▲ / ▼ buttons) ────────

  protected stepHours(direction: 1 | -1): void {
    if (!this.interactive()) return;
    this.hours.set(wrap(this.hours() + direction, 24));
    this.emit();
  }

  protected stepMinutes(direction: 1 | -1): void {
    if (!this.interactive()) return;
    this.minutes.set(wrap(this.minutes() + direction * this.step(), 60));
    this.emit();
  }

  protected stepSeconds(direction: 1 | -1): void {
    if (!this.interactive()) return;
    this.seconds.set(wrap(this.seconds() + direction * this.step(), 60));
    this.emit();
  }

  protected toggleAmPm(): void {
    if (!this.interactive()) return;
    // ±12 hours flips AM ↔ PM; using +12 is enough because wrap handles overflow.
    this.hours.set(wrap(this.hours() + 12, 24));
    this.emit();
  }

  // ──────── Emission ────────

  private emit(): void {
    const next = this.adapter.setTime(this.basis(), this.hours(), this.minutes(), this.seconds());
    this.onChange(next);
  }
}
