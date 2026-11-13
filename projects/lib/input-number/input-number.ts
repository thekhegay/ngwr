/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import {
  Component,
  type ElementRef,
  LOCALE_ID,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { useI18nText } from 'ngwr/i18n';
import { WrInput, WrInputGroup, WrInputPrefix, WrInputSuffix, type WrInputSize } from 'ngwr/input';
import {
  wrClamp,
  wrRound,
  wrCheckStyles,
  wrDecimal,
  wrDecimalAdd,
  wrDecimalCompare,
  wrDecimalMultiply,
  wrDecimalRound,
} from 'ngwr/utils';

import type { WrInputNumberMode, WrInputNumberValue } from './types';

/** Resolve the locale's decimal + grouping separators from `Intl.NumberFormat`. */
function resolveSeparators(locale: string): { decimal: string; group: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  const decimal = parts.find(p => p.type === 'decimal')?.value ?? '.';
  const group = parts.find(p => p.type === 'group')?.value ?? '';
  return { decimal, group };
}

/**
 * The ten digits `locale` writes, index 0 to 9 — empty when the system is
 * algorithmic. ar-EG prints `١٬٢٣٤٫٥`, and `Number()` reads none of those digits,
 * so an edit to the field's own display could never commit. A copy of the time
 * panel's helper in `ngwr/date-picker`, kept a copy for the reason given there.
 */
function resolveNumerals(locale: string): readonly string[] {
  try {
    const formatter = new Intl.NumberFormat(locale, { useGrouping: false });
    const digits: string[] = [];
    for (let i = 0; i < 10; i++) {
      const digit = formatter.format(i);
      if ([...digit].length !== 1 || digits.includes(digit)) return [];
      digits.push(digit);
    }
    return digits;
  } catch {
    return [];
  }
}

/**
 * Characters a user types for a separator the locale prints as something else:
 * a keyboard sends a plain space where ru / uk / kk group with U+00A0 and fr with
 * U+202F, and a plain apostrophe where de-CH groups with U+2019.
 */
function groupPattern(group: string): RegExp | null {
  if (!group) return null;
  if (/\s/.test(group)) return /\s/g;
  if (/['\u2019]/.test(group)) return /['\u2019]/g;
  return new RegExp(group.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
}

/** A finite `min` / `max` as a decimal; an infinite one is no bound. */
function decimalBound(bound: number): string | null {
  return Number.isFinite(bound) ? wrDecimal(bound) : null;
}

/**
 * `min` / `max` are numbers at runtime in either mode. The declared type is
 * `FormValueControl`'s, which names the bound after the value, so the number
 * is cast into it here and read back out in `minValue` / `maxValue`.
 */
function asBound<M extends WrInputNumberMode>(bound: number): NonNullable<WrInputNumberValue<M>> {
  return bound as unknown as NonNullable<WrInputNumberValue<M>>;
}

/**
 * Numeric input with locale-aware formatting + ▲▼ stepper buttons.
 *
 * A signal-forms native control: it implements `FormValueControl`, so
 * `[formField]` binds straight to its `value` model — no
 * `ControlValueAccessor` in between. `[(value)]` works standalone.
 *
 * Parses leniently while typing (allows partial input like `"1."` or `"-"`),
 * re-formats with grouping + fixed decimals on blur.
 *
 * `M` is the `mode`, and it decides what `value` holds: `number | null` by
 * default, `string | null` under `mode="decimal"`, where the digits are kept
 * exact (see `WrInputNumberValue`).
 *
 * Locale comes from Angular's `LOCALE_ID` — input-number intentionally does
 * NOT depend on `ngwr/date` so it can be used in date-free apps.
 *
 * @example
 * ```html
 * <!-- signal forms -->
 * <wr-input-number [formField]="form.qty" [min]="0" [max]="100" />
 *
 * <!-- standalone two-way binding -->
 * <wr-input-number [(value)]="price" [decimals]="2" suffix="USD" />
 *
 * <!-- exact decimals: `amount` is a `string | null` such as '1234.56' -->
 * <wr-input-number mode="decimal" [(value)]="amount" [decimals]="2" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/input-number
 */
@Component({
  selector: 'wr-input-number',
  templateUrl: './input-number.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-input-number', '[class]': 'classes()' },
  imports: [WrInput, WrInputGroup, WrInputPrefix, WrInputSuffix],
})
export class WrInputNumber<M extends WrInputNumberMode = 'number'> implements FormValueControl<WrInputNumberValue<M>> {
  /**
   * What `value` holds. `'number'` is the engine's double. `'decimal'` keeps
   * the typed digits exact as a canonical string (`'1234.56'`: a `.` for the
   * point, no grouping), reads a decimal comma and pasted spaces, and steps,
   * clamps and rounds through `wrDecimal` from `ngwr/utils`, so `0.2` stepped
   * by `0.1` is `'0.3'`. A lone `.` or `,` is read in the locale's role: its
   * decimal separator is a point, its grouping character is grouping when
   * exactly three digits follow it (`1,234` in en-US is `'1234'`, but `0,125`
   * is `'0.125'`) and a point otherwise. With both present,
   * the last one is the point: `1,234.56` and `1.234,56` are `'1234.56'`.
   * Grouping comes in threes, so `1.2.3` is unreadable and the committed
   * value stays, as it does for any text the field cannot read.
   *
   * @default 'number'
   */
  readonly mode = input<M>('number' as M);

  private readonly decimal = computed(() => this.mode() === 'decimal');

  /** Minimum allowed value, a number in either mode. @default -Infinity */
  readonly min = input<NonNullable<WrInputNumberValue<M>> | undefined, unknown>(asBound<M>(Number.NEGATIVE_INFINITY), {
    transform: (v: unknown) => asBound<M>(coerceNumberProperty(v, Number.NEGATIVE_INFINITY)),
  });

  /** Maximum allowed value, a number in either mode. @default Infinity */
  readonly max = input<NonNullable<WrInputNumberValue<M>> | undefined, unknown>(asBound<M>(Number.POSITIVE_INFINITY), {
    transform: (v: unknown) => asBound<M>(coerceNumberProperty(v, Number.POSITIVE_INFINITY)),
  });

  private readonly minValue = computed(() => (this.min() as number | undefined) ?? Number.NEGATIVE_INFINITY);
  private readonly maxValue = computed(() => (this.max() as number | undefined) ?? Number.POSITIVE_INFINITY);

  /** Step used by stepper buttons + arrow keys. @default 1 */
  readonly step = input(1, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 1)) });

  /**
   * Fixed number of decimals. Rounds the value as it is COMMITTED, and fixes the
   * digits shown once the field reformats on blur. `null` keeps the entered
   * precision and formats with up to 20.
   *
   * Clamped to 0–100, the range `Intl.NumberFormat`'s `minimumFractionDigits` /
   * `maximumFractionDigits` accept — because it is the one numeric input on this
   * component that had no transform, and the value goes straight into the
   * formatter, which THROWS a `RangeError` outside that range rather than
   * degrading. A `[decimals]="-1"` bound from a config object took the whole
   * component down on blur.
   *
   * @default null
   */
  readonly decimals = input<number | null, unknown>(null, {
    transform: (v: unknown): number | null =>
      v === null || v === undefined ? null : Math.min(100, Math.max(0, Math.trunc(coerceNumberProperty(v, 0)))),
  });

  /** Render the ▲▼ stepper column. @default true */
  readonly showSteppers = input(true, { transform: coerceBooleanProperty });

  /**
   * Control size — forwarded to the field's `[size]`, and shares the
   * `--wr-control-*` contract. @default 'md'
   */
  readonly size = input<WrInputSize>('md');

  /** Pill-shaped corners — forwarded to the group AND the field. @default false */
  readonly rounded = input(false, { transform: coerceBooleanProperty });

  /** Optional prefix label (e.g. `"$"`). */
  readonly prefix = input<string>('');

  /** Optional suffix label (e.g. `"kg"`). */
  readonly suffix = input<string>('');

  /** Placeholder shown when the input is empty. */
  readonly placeholder = input<string>('');

  /**
   * Accessible name for the field. Unset, the field is named by whatever labels
   * it — there is deliberately no fallback here.
   *
   * It used to mirror the `placeholder`, and an `aria-label` OUTRANKS a
   * `<label>` in the accname order: inside a `<wr-form-field label="Quantity">`
   * the very input that adopts the field's id announced the placeholder ("0")
   * instead, and a placeholder disappears as soon as the user types. Standalone
   * nothing was lost by dropping it — an input with no other name already falls
   * back to its own `placeholder` attribute, which is the name axe's `label`
   * rule accepts too.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = computed(() => {
    // Not `??`: an empty binding is no name at all, and an empty `aria-label` is
    // worse than none — it still wins the accname order, and announces nothing.
    const explicit = this.ariaLabel();
    if (explicit) return explicit;
    return null;
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

  /**
   * Show a clear (×) button while the field holds text and is neither disabled
   * nor read-only. Clearing sets `value` to `null`, emits `touch` and puts focus
   * back in the field. It is a pointer control: from the keyboard, emptying the
   * field clears the value. @default false
   */
  readonly clearable = input(false, { transform: coerceBooleanProperty });

  /** Clear (×) button aria-label. Falls back to `common.clear`. */
  readonly clearLabel = input<string | null>(null);

  /**
   * Show a spinner after the field and mark the field `aria-busy`. The field
   * stays editable. @default false
   */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /** Disable interaction. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Read-only — values cannot be changed (steppers + typing disabled). @default false */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  /**
   * The value, `null` when empty: a `number` in `'number'` mode, a canonical
   * decimal string in `'decimal'` mode. Bound by `[formField]`, or two-way via
   * `[(value)]`.
   */
  readonly value = model<WrInputNumberValue<M>>(null);

  /** Emitted on blur, and by the clear (×) button, so a bound field can mark itself touched. */
  readonly touch = output<void>();

  private readonly locale = inject(LOCALE_ID);
  private readonly separators = resolveSeparators(this.locale);
  private readonly numerals = resolveNumerals(this.locale);
  private readonly group = groupPattern(this.separators.group);

  /** Text currently in the input (may be partial / invalid mid-type). */
  protected readonly text = signal<string>('');

  /** Whether the input is focused. While true, the input handlers own `text`. */
  protected readonly focused = signal(false);

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected readonly interactive = computed(() => !this.disabled() && !this.readonly());

  /** The value as the decimal core reads it; `null` when empty or unreadable. */
  private readonly decimalValue = computed(() => {
    const v = this.value();
    return v === null ? null : wrDecimal(v);
  });

  protected readonly atMin = computed(() => {
    if (this.decimal()) return this.atDecimalBound(this.minValue(), -1);
    const v = this.value() as number | null;
    return v !== null && v <= this.minValue();
  });

  protected readonly atMax = computed(() => {
    if (this.decimal()) return this.atDecimalBound(this.maxValue(), 1);
    const v = this.value() as number | null;
    return v !== null && v >= this.maxValue();
  });

  private atDecimalBound(bound: number, side: -1 | 1): boolean {
    const v = this.decimalValue();
    const limit = decimalBound(bound);
    if (v === null || limit === null) return false;
    const order = wrDecimalCompare(v, limit);
    return order !== null && order * side >= 0;
  }

  /**
   * The size and pill modifiers mirror what is bound down to the chrome, because
   * the stepper column belongs to neither half of it: the field carries
   * `wr-input--<size>`, the column is its SIBLING, and the group carries no size
   * at all. Without a modifier of its own the column drew one 10x6 chevron at
   * every size and ran its dividers into a pill's rounded end.
   */
  protected readonly classes = computed(() => {
    const parts: string[] = [];
    const size = this.size();
    if (size !== 'md') parts.push(`wr-input-number--${size}`);
    if (this.rounded()) parts.push('wr-input-number--rounded');
    if (this.disabled()) parts.push('wr-input-number--disabled');
    return parts.join(' ');
  });

  /**
   * Fraction digits the stepper rounds its arithmetic to when `decimals` says
   * nothing. High enough to leave a real value alone, low enough to erase the
   * binary-float tail that repeated stepping accumulates.
   */
  private static readonly STEP_PRECISION = 10;

  /**
   * Above this, the anti-drift round is skipped — it would MANUFACTURE drift.
   *
   * `wrRound(v, 10)` is `Math.round((v + EPSILON) * 1e10) / 1e10`, and the scale
   * factor is only exact while `v * 1e10` stays inside 2^53, i.e. |v| under
   * about 900,720. In practice the round-trip still recovers up to ~9.2e8 and
   * then breaks: `wrRound(1000000001, 10)` is `1000000000.9999999`, and since
   * `format` prints up to 20 fraction digits that tail reaches the screen —
   * and compounds, because the next press starts from it. Integer stepping at
   * that magnitude is exact in IEEE754 and needed no help; the only thing this
   * rounding exists to defend is `0.1 + 0.1 + 0.1`.
   */
  private static readonly SAFE_ROUND_MAGNITUDE = 1e6;

  /** Steps finer than this would be rounded away by {@link STEP_PRECISION}. */
  private static readonly SAFE_ROUND_STEP = 1e-9;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('input-number');
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
      // SHOW WHAT THE MODEL HOLDS. It used to format `constrain(v)`, so a
      // `[max]="10"` field handed 500 drew "10" over a model that still said
      // 500 — the display was the thing lying, not the model.
      //
      // The tempting repair is to write the clamp back so the two agree, and
      // that is worse: under `[formField]` the bounds arrive ONLY through the
      // schema's `min()` / `max()` rules (binding `[min]` next to `[formField]`
      // is an NG8022 compile error), so overwriting the value ERASES the very
      // error those rules exist to raise — and the write marks a pristine form
      // dirty, tripping unsaved-changes guards and opening every other
      // validator's message on first paint.
      //
      // So: `min` / `max` bound what this component's own edits may produce,
      // and a value written from outside is displayed as it is and left for
      // validation to judge.
      this.text.set(this.format(v));
    });
  }

  /**
   * Focus the text field — what Signal Forms calls to focus this control, from
   * `focusBoundControl()`. The host is a plain element, so without this the
   * call landed on something that cannot take focus and nothing moved.
   */
  focus(options?: FocusOptions): void {
    this.field().nativeElement.focus(options);
  }

  // Template handlers

  protected onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.text.set(raw);
    if (!raw.trim()) {
      this.commit(null);
      return;
    }
    if (this.decimal()) {
      const parsed = this.parseDecimal(raw);
      if (parsed === null) return; // partial or unreadable - the committed value stays
      this.commit(this.constrainDecimal(parsed));
      return;
    }
    const parsed = this.parse(raw);
    if (parsed === null) return; // partial input — wait for more
    const next = this.constrain(parsed);
    this.commit(next);
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

  /** The one write to `value`: what a mode holds is decided above, not here. */
  private commit(next: number | string | null): void {
    this.value.set(next as WrInputNumberValue<M>);
  }

  private bump(units: number): void {
    const stepSize = this.step() || 1;
    if (this.decimal()) {
      const base = this.decimalValue() ?? wrDecimal(this.fallbackBase()) ?? '0';
      const next = this.constrainDecimal(wrDecimalAdd(base, wrDecimalMultiply(stepSize, units)) ?? base);
      this.commit(next);
      this.text.set(this.format(next));
      return;
    }
    const current = this.value() as number | null;
    // A non-finite value gives no number to step from, so it steps like an empty field.
    const base = current !== null && Number.isFinite(current) ? current : this.fallbackBase();
    // `wrRound` before `constrain`, and only on the stepped ARITHMETIC. Binary
    // floats do not add: three presses of a `step="0.1"` stepper produced
    // 0.30000000000000004, `constrain` only rounds when `decimals` is set, and
    // `format` prints up to 20 fraction digits — so the drift went into the
    // model AND onto the screen. Ten digits erases IEEE noise without
    // quantising a value the user typed (0.15000000000000002 stays 0.15, it
    // does not snap to the step grid).
    //
    // Guarded on BOTH ends, because outside them the correction is the thing
    // that corrupts: see SAFE_ROUND_MAGNITUDE, and a step finer than 1e-9 would
    // simply be rounded away to nothing.
    const raw = base + units * stepSize;
    const correctable =
      Math.abs(raw) < WrInputNumber.SAFE_ROUND_MAGNITUDE && Math.abs(stepSize) >= WrInputNumber.SAFE_ROUND_STEP;
    const next = this.constrain(correctable ? wrRound(raw, WrInputNumber.STEP_PRECISION) : raw);
    this.commit(next);
    this.text.set(this.format(next));
  }

  /** Choose a sensible starting point when bumping from `null`. */
  private fallbackBase(): number {
    if (Number.isFinite(this.minValue()) && this.minValue() > 0) return this.minValue();
    if (Number.isFinite(this.maxValue()) && this.maxValue() < 0) return this.maxValue();
    return 0;
  }

  private constrain(v: number): number {
    let next = wrClamp(v, this.minValue(), this.maxValue());
    const d = this.decimals();
    if (d !== null) next = wrRound(next, d);
    return next;
  }

  /** `constrain` for a decimal string: the bounds and `decimals` through the decimal core. */
  private constrainDecimal(v: string): string {
    let next = v;
    const min = decimalBound(this.minValue());
    const max = decimalBound(this.maxValue());
    if (min !== null && wrDecimalCompare(next, min) === -1) next = min;
    if (max !== null && wrDecimalCompare(next, max) === 1) next = max;
    const d = this.decimals();
    if (d !== null) next = wrDecimalRound(next, d) ?? next;
    return next;
  }

  /**
   * The locale's digits to ASCII, its minus sign (U+2212 in sv, fi, …) to a
   * hyphen, and the bidi marks it puts around a negative number dropped — every
   * one of them is in the text this field formats, and neither `Number()` nor
   * `wrDecimal` reads them.
   */
  private toAscii(text: string): string {
    return [...text]
      .map(ch => {
        const digit = this.numerals.indexOf(ch);
        return digit < 0 ? ch : String(digit);
      })
      .join('')
      .replace(/[\u200e\u200f\u061c]/g, '')
      .replace(/\u2212/g, '-');
  }

  /**
   * Decimal-mode parse: a canonical decimal string, or `null` for partial or
   * unreadable text. Spaces of every width and the Swiss apostrophe are
   * grouping; `.` and `,` are read by the rule on `mode`, and a separator read
   * as grouping has to come in threes, so `1.2.3` is unreadable rather than 123.
   */
  private parseDecimal(raw: string): string | null {
    // fa and ar-EG write U+066B and U+066C, which the `.` and `,` rule never sees.
    const { decimal, group } = this.separators;
    const ownMarks = decimal !== '.' && decimal !== ',';
    let text = this.toAscii(raw.trim()).replace(/[\s'\u2019]/g, '');
    if (ownMarks) text = text.replaceAll(group, '').replaceAll(decimal, '.');
    const separators = [...text.matchAll(/[.,]/g)];
    if (separators.length) {
      const last = separators[separators.length - 1];
      let point: number | null = last.index;
      if (separators.length === 1) {
        // Three digits after the locale's grouping character is grouping,
        // unless nothing or a lone zero precedes it: `0,125` is a fraction.
        const after = text.length - last.index - 1;
        const lead = text.slice(0, last.index);
        if (last[0] !== (ownMarks ? '.' : decimal) && after === 3 && !/^-?0?$/.test(lead)) point = null;
      } else if (separators.every(s => s[0] === last[0])) {
        point = null;
      }
      const groups = (point === null ? text : text.slice(0, point)).split(/[.,]/);
      if (groups.slice(1).some(group => group.length !== 3)) return null;
      text = point === null ? groups.join('') : `${groups.join('')}.${text.slice(point + 1)}`;
    }
    if (/^-?\.?$/.test(text) || text.endsWith('.')) return null;
    return wrDecimal(text);
  }

  /** Parse a locale-formatted string. Returns `null` for partial / not-yet-numeric input. */
  private parse(raw: string): number | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    let normalised = this.toAscii(trimmed);
    // Strip group separators, normalise the decimal separator to `.`.
    if (this.group) {
      normalised = normalised.replace(this.group, '');
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
  private format(v: number | string): string {
    const d = this.decimals();
    if (this.decimal()) {
      const canonical = wrDecimal(v);
      if (canonical === null) return String(v);
      // The string's own places, so `'1.50'` shows as typed; `decimals` fixes them.
      const point = canonical.indexOf('.');
      const places = d ?? Math.min(100, point < 0 ? 0 : canonical.length - point - 1);
      const formatter = new Intl.NumberFormat(this.locale, {
        minimumFractionDigits: places,
        maximumFractionDigits: places,
        useGrouping: true,
      });
      // ES2023 formats a decimal string exactly; the lib typings here stop at ES2022.
      return formatter.format(canonical as unknown as number);
    }
    const formatter = new Intl.NumberFormat(this.locale, {
      minimumFractionDigits: d ?? 0,
      maximumFractionDigits: d ?? 20,
      useGrouping: true,
    });
    return formatter.format(v as number);
  }
}
