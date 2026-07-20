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
  model,
  output,
  signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { WrInput, WrInputGroup, WrInputPrefix, WrInputSuffix } from 'ngwr/input';
import { clamp, round } from 'ngwr/utils';

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
 * A signal-forms native control: it implements `FormValueControl<number | null>`,
 * so `[formField]` binds straight to its `value` model — no
 * `ControlValueAccessor` in between. `[(value)]` works standalone.
 *
 * Parses leniently while typing (allows partial input like `"1."` or `"-"`),
 * re-formats with grouping + fixed decimals on blur.
 *
 * Locale comes from Angular's `LOCALE_ID` — input-number intentionally does
 * NOT depend on `ngwr/date-adapter` so it can be used in date-free apps.
 *
 * @example
 * ```html
 * <!-- signal forms -->
 * <wr-input-number [formField]="form.qty" [min]="0" [max]="100" />
 *
 * <!-- standalone two-way binding -->
 * <wr-input-number [(value)]="price" [decimals]="2" suffix="USD" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/input-number
 */
@Component({
  selector: 'wr-input-number',
  templateUrl: './input-number.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrInput, WrInputGroup, WrInputPrefix, WrInputSuffix],
})
export class WrInputNumber implements FormValueControl<number | null> {
  /** Minimum allowed value. @default -Infinity */
  readonly min = input<number | undefined>(Number.NEGATIVE_INFINITY, {
    transform: (v: unknown): number => coerceNumberProperty(v, Number.NEGATIVE_INFINITY),
  });

  /** Maximum allowed value. @default Infinity */
  readonly max = input<number | undefined>(Number.POSITIVE_INFINITY, {
    transform: (v: unknown): number => coerceNumberProperty(v, Number.POSITIVE_INFINITY),
  });

  private readonly minValue = computed(() => this.min() ?? Number.NEGATIVE_INFINITY);
  private readonly maxValue = computed(() => this.max() ?? Number.POSITIVE_INFINITY);

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

  /** Numeric value (`null` when empty). Bound by `[formField]`, or two-way via `[(value)]`. */
  readonly value = model<number | null>(null);

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  private readonly locale = inject(LOCALE_ID);
  private readonly separators = resolveSeparators(this.locale);

  /** Text currently in the input (may be partial / invalid mid-type). */
  protected readonly text = signal<string>('');

  /** Whether the input is focused. While true, the input handlers own `text`. */
  protected readonly focused = signal(false);

  protected readonly interactive = computed(() => !this.disabled() && !this.readonly());

  protected readonly atMin = computed(() => {
    const v = this.value();
    return v !== null && v <= this.minValue();
  });

  protected readonly atMax = computed(() => {
    const v = this.value();
    return v !== null && v >= this.maxValue();
  });

  protected readonly classes = computed(() => {
    const parts = ['wr-input-number'];
    if (this.disabled()) parts.push('wr-input-number--disabled');
    return parts.join(' ');
  });

  constructor() {
    // Keep the display `text` in sync with external writes to `value` (via
    // `[formField]` / `[(value)]`). While the user is editing, the input
    // handlers own `text`, so skip re-formatting to avoid clobbering partial
    // input (e.g. mid-typed grouping or a value that is still being clamped).
    effect(() => {
      const v = this.value();
      if (this.focused()) return;
      this.text.set(v === null || Number.isNaN(v) ? '' : this.format(this.constrain(v)));
    });
  }

  // Template handlers

  protected onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.text.set(raw);
    if (!raw.trim()) {
      this.value.set(null);
      return;
    }
    const parsed = this.parse(raw);
    if (parsed === null) return; // partial input — wait for more
    const next = this.constrain(parsed);
    this.value.set(next);
  }

  protected onFocus(): void {
    this.focused.set(true);
  }

  protected onBlur(): void {
    // Flipping `focused` false lets the sync effect re-format `text` from the
    // committed `value` (e.g. `"1."` → `"1"`, or grouping the final number).
    this.focused.set(false);
    this.touch.emit();
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
  }

  /** Choose a sensible starting point when bumping from `null`. */
  private fallbackBase(): number {
    if (Number.isFinite(this.minValue()) && this.minValue() > 0) return this.minValue();
    if (Number.isFinite(this.maxValue()) && this.maxValue() < 0) return this.maxValue();
    return 0;
  }

  private constrain(v: number): number {
    let next = clamp(v, this.minValue(), this.maxValue());
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
