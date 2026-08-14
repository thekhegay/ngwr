/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type BooleanInput, coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
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

import { useConfigValue } from 'ngwr/config';
import { useI18nText } from 'ngwr/i18n';
import { WrInput, WrInputGroup, WrInputPrefix, WrInputSuffix, type WrInputSize } from 'ngwr/input';
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

  /**
   * Control size — forwarded to the field, and shares the `--wr-control-*`
   * contract. Unset falls back to the `inputNumber.size` app default from
   * `provideWrConfig()`, then to the `input.size` one, then to `md`. @default 'md'
   */
  readonly size = input<WrInputSize | null>(null);

  /**
   * Pill-shaped corners. Unset falls back to the `inputNumber.rounded` app default
   * from `provideWrConfig()`, then to the `input.rounded` one;
   * `[rounded]="false"` turns a configured `true` back off. @default false
   */
  readonly rounded = input<boolean | null, BooleanInput>(null, {
    // Null-preserving: the plain `coerceBooleanProperty` folds `null` into
    // `false`, which would make "not set" and "set to false" the same value —
    // and a config default nothing could ever supply.
    transform: (v: BooleanInput): boolean | null => (v == null ? null : coerceBooleanProperty(v)),
  });

  /**
   * `size`, then the app config, then `md` — bound to the field's `[wrSize]`.
   *
   * The chrome this control is built from resolves the same pair for itself, so
   * the config lookup falls through to `input.*` rather than stopping at
   * `inputNumber.*`: binding a value down always wins there, and an unchained
   * lookup would therefore SUPPRESS an `input.size` an app had set — the field
   * inside a number input would be the one `[wrInput]` in the app that ignored it.
   * Chained, the specific key wins where it is set and the general one still
   * applies where it is not.
   */
  protected readonly resolvedSize = useConfigValue(this.size, c => c.inputNumber?.size ?? c.input?.size, 'md');

  /** `rounded`, then the app config, then `false` — bound to the group AND the field. */
  protected readonly resolvedRounded = useConfigValue(
    this.rounded,
    c => c.inputNumber?.rounded ?? c.input?.rounded,
    false
  );

  /** Optional prefix label (e.g. `"$"`). */
  readonly prefix = input<string>('');

  /** Optional suffix label (e.g. `"kg"`). */
  readonly suffix = input<string>('');

  /** Placeholder shown when the input is empty. */
  readonly placeholder = input<string>('');

  /**
   * Accessible name for the field. Falls back to the placeholder — inside a
   * `<wr-form-field>` the projected `wrInput` picks up the label's id and needs
   * neither, but standalone the text field has no name at all.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = computed(() => {
    // Not `??`: an empty placeholder is no name at all, so it must fall through.
    const explicit = this.ariaLabel();
    if (explicit) return explicit;
    const placeholder = this.placeholder();
    return placeholder ? placeholder : null;
  });

  /** Increment button aria-label. Falls back to `inputNumber.increment`. */
  readonly incrementLabel = input<string | null>(null);

  /** Decrement button aria-label. Falls back to `inputNumber.decrement`. */
  readonly decrementLabel = input<string | null>(null);

  /**
   * The steppers are icon-only buttons, so these ARE their accessible names.
   * They were hard-coded English while the catalog carried the keys for them
   * unread — a Russian app announced "Increment".
   */
  protected readonly resolvedIncrement = useI18nText(this.incrementLabel, 'inputNumber.increment', 'Increment');
  protected readonly resolvedDecrement = useI18nText(this.decrementLabel, 'inputNumber.decrement', 'Decrement');

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

  /**
   * Fraction digits the stepper rounds its arithmetic to when `decimals` says
   * nothing. High enough to leave a real value alone, low enough to erase the
   * binary-float tail that repeated stepping accumulates.
   */
  private static readonly STEP_PRECISION = 10;

  constructor() {
    // Keep the display `text` in sync with external writes to `value` (via
    // `[formField]` / `[(value)]`). While the user is editing, the input
    // handlers own `text`, so skip re-formatting to avoid clobbering partial
    // input (e.g. mid-typed grouping or a value that is still being clamped).
    effect(() => {
      const v = this.value();
      if (this.focused()) return;
      if (v === null || Number.isNaN(v)) {
        this.text.set('');
        return;
      }
      // WRITE THE CLAMP BACK, do not just draw it. The display was formatted
      // from `constrain(v)` while the model kept `v`, so a `[max]="10"` field
      // handed 500 showed "10" and submitted 500 — and nothing reconciled them
      // until the user happened to type. Clamping is idempotent, so the
      // write-back re-enters this effect once and settles.
      const constrained = this.constrain(v);
      this.text.set(this.format(constrained));
      if (constrained !== v) this.value.set(constrained);
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
    // `round` before `constrain`, and only on the stepped ARITHMETIC. Binary
    // floats do not add: three presses of a `step="0.1"` stepper produced
    // 0.30000000000000004, `constrain` only rounds when `decimals` is set, and
    // `format` prints up to 20 fraction digits — so the drift went into the
    // model AND onto the screen. Ten digits erases IEEE noise without
    // quantising a value the user typed (0.15000000000000002 stays 0.15, it
    // does not snap to the step grid).
    const next = this.constrain(round(base + units * stepSize, WrInputNumber.STEP_PRECISION));
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
