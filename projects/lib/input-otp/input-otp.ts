/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import {
  Component,
  type ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { useConfigValue } from 'ngwr/config';
import { useFormFieldAria } from 'ngwr/form';
import { useI18nFormatter, useI18nText } from 'ngwr/i18n';

import type { WrInputOtpMode, WrInputOtpSize } from './interfaces';

/**
 * Fixed-length one-time-code input. Renders one `<input>` per character,
 * auto-advances focus on typing, handles paste of a full code, and supports
 * masking like a password field.
 *
 * A signal-forms native control: it implements `FormValueControl<string>`, so
 * `[formField]` binds straight to its `value` model — no
 * `ControlValueAccessor` in between. `[(value)]` works standalone. Emits
 * `completed` once all cells are filled (useful for auto-submission).
 *
 * @example
 * ```html
 * <!-- signal forms -->
 * <wr-input-otp [formField]="form.code" length="6" (completed)="verify($event)" />
 *
 * <!-- standalone two-way binding -->
 * <wr-input-otp [(value)]="code" length="6" (completed)="verify($event)" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/input-otp
 */
@Component({
  selector: 'wr-input-otp',
  templateUrl: './input-otp.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()', role: 'group', '[attr.aria-label]': 'resolvedAriaLabel()' },
})
export class WrInputOtp implements FormValueControl<string> {
  private readonly dir = inject(Directionality, { optional: true });

  /** Accessible name of the whole strip. Falls back to `inputOtp.label`. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'inputOtp.label', 'Verification code');

  /** Number of cells to render. Clamped to `[1, 20]`. @default 6 */
  readonly length = input(6, {
    transform: (v: unknown): number => Math.max(1, Math.min(20, coerceNumberProperty(v, 6))),
  });

  /** Character set per cell. @default 'numeric' */
  readonly mode = input<WrInputOtpMode>('numeric');

  /**
   * Control size — shares the `--wr-control-*` contract. Unset falls back to the
   * `inputOtp.size` app default from `provideWrConfig()`. @default 'md'
   */
  readonly size = input<WrInputOtpSize | null>(null);

  /**
   * `size`, then the app config, then `md`.
   *
   * Read ONCE, here: a box carries no size of its own — the host modifier sets
   * `--wr-input-otp-size` / `-font` / `-radius` / `-gap` and every box reads them
   * from the cascade — so one resolution sizes the whole strip however many boxes
   * `length` renders.
   */
  protected readonly resolvedSize = useConfigValue(this.size, c => c.inputOtp?.size, 'md');

  /** Mask the typed characters like a password. @default false */
  readonly mask = input(false, { transform: coerceBooleanProperty });

  /**
   * Disable interaction. Bound automatically from the field's disabled state
   * when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Refuse edits while every box stays focusable and the code still submits.
   * Bound automatically from the field's readonly state when used with
   * `[formField]`.
   *
   * Each box is a real text input, so this is the native `readonly` attribute —
   * arrow keys, Home / End and selection keep working, which is the whole
   * difference from `disabled`. Paste is cancelled too, since a `paste` still
   * reaches a read-only input even though typing does not.
   *
   * @default false
   */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  /**
   * The surrounding `<wr-form-field>`'s error state — bound per BOX rather than
   * on the `role="group"` host, because the box is what takes focus and a reader
   * queries the focused element.
   *
   * @internal
   */
  protected readonly fieldAria = useFormFieldAria();

  /** Character shown in empty cells. @default '•' */
  readonly placeholder = input<string>('•');

  /** The entered code. Bound by `[formField]`, or two-way via `[(value)]`. */
  readonly value = model<string>('');

  /** Fires once when every cell holds a character. */
  readonly completed = output<string>();

  /** Emitted on blur so a bound field can mark itself touched. */
  readonly touch = output<void>();

  protected readonly cells = signal<readonly string[]>(Array.from({ length: 6 }, () => ''));

  protected readonly classes = computed(() => {
    const parts = ['wr-input-otp'];
    const size = this.resolvedSize();
    if (size !== 'md') parts.push(`wr-input-otp--${size}`);
    if (this.disabled()) parts.push('wr-input-otp--disabled');
    else if (this.readonly()) parts.push('wr-input-otp--readonly');
    return parts.join(' ');
  });

  protected readonly cellType = computed<'password' | 'text'>(() => (this.mask() ? 'password' : 'text'));
  protected readonly cellInputMode = computed(() => (this.mode() === 'numeric' ? 'numeric' : 'text'));

  private readonly digitLabel = useI18nFormatter('inputOtp.digit', 'Digit {{index}}');
  private readonly characterLabel = useI18nFormatter('inputOtp.character', 'Character {{index}}');

  protected readonly cellRefs = viewChildren<ElementRef<HTMLInputElement>>('cell');

  constructor() {
    // Resize the cell array whenever `length` changes — preserves existing values.
    effect(() => {
      const len = this.length();
      const current = this.cells();
      if (current.length === len) return;
      const next = Array.from({ length: len }, (_, i) => current[i] ?? '');
      this.cells.set(next);
    });

    // Split an external `value` write back into cells (mirrors the old
    // writeValue). Skipped when the value is merely the echo of an in-cell
    // edit, so re-splitting can never shift or clobber what the user typed.
    effect(() => {
      // Coerce null/undefined to '' — a classic-forms binding can write null,
      // which the old `writeValue(v: string | null)` accepted too.
      const v = this.value() ?? '';
      untracked(() => {
        if (this.cells().join('') === v) return;
        const len = this.length();
        const raw = v.slice(0, len);
        const next = Array.from({ length: len }, (_, i) => this.sanitiseChar(raw[i] ?? ''));
        this.cells.set(next);
      });
    });
  }

  // Template handlers

  protected onInput(event: Event, index: number): void {
    const target = event.target as HTMLInputElement;
    if (this.readonly()) {
      // A read-only input refuses typed characters on its own; this covers the
      // synthetic writes a script (or a spec) can still make.
      target.value = this.cells()[index] ?? '';
      return;
    }
    const char = this.sanitiseChar(target.value.slice(-1));
    target.value = char;
    this.update(index, char);
    if (char) this.focusCell(index + 1);
  }

  protected onKeyDown(event: KeyboardEvent, index: number): void {
    const target = event.target as HTMLInputElement;
    switch (this.inlineKey(event.key)) {
      case 'Backspace':
        if (this.readonly()) {
          // Backspace on an empty box is an EDIT (it clears the previous one),
          // so it goes; the pure navigation keys below stay.
          event.preventDefault();
          break;
        }
        if (target.value === '') {
          event.preventDefault();
          this.update(index - 1, '');
          this.focusCell(index - 1);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.focusCell(index - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.focusCell(index + 1);
        break;
      case 'Home':
        event.preventDefault();
        this.focusCell(0);
        break;
      case 'End':
        event.preventDefault();
        this.focusCell(this.length() - 1);
        break;
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    if (this.readonly()) return;
    const text = event.clipboardData?.getData('text') ?? '';
    const chars = text
      .split('')
      .map(c => this.sanitiseChar(c))
      .filter(c => c.length > 0);
    if (chars.length === 0) return;
    const trimmed = chars.slice(0, this.length());
    const next = Array.from({ length: this.length() }, (_, i) => trimmed[i] ?? '');
    this.cells.set(next);
    this.emitChange();
    this.focusCell(Math.min(trimmed.length, this.length() - 1));
  }

  protected onBlur(): void {
    this.touch.emit();
  }

  protected trackIndex(index: number): number {
    return index;
  }

  /**
   * A box's accessible name. It projects no text and carries no label of its own,
   * so this string IS the name a screen reader reads for it.
   *
   * Keyed off `mode`, not fixed: `sanitiseChar` passes any letter through in
   * `alphanumeric` and `text`, so the old literal announced "Digit 3" over a box
   * holding `A` — wrong in a way translating it would not have fixed.
   */
  protected cellLabel(index: number): string {
    const params = { index: index + 1 };
    return this.mode() === 'numeric' ? this.digitLabel(params) : this.characterLabel(params);
  }

  // Internals

  private update(index: number, char: string): void {
    if (index < 0 || index >= this.length()) return;
    const next = [...this.cells()];
    next[index] = char;
    this.cells.set(next);
    this.emitChange();
  }

  private emitChange(): void {
    const code = this.cells().join('');
    this.value.set(code);
    if (code.length === this.length() && code.split('').every(c => c.length === 1)) {
      this.completed.emit(code);
    }
  }

  private focusCell(i: number): void {
    if (i < 0 || i >= this.length()) return;
    const el = this.cellRefs()[i]?.nativeElement;
    if (!el) return;
    el.focus();
    el.select();
  }

  /** Drop a character that doesn't match the configured mode. */
  private sanitiseChar(c: string): string {
    if (!c) return '';
    const one = c.slice(0, 1);
    switch (this.mode()) {
      case 'numeric':
        return /\d/.test(one) ? one : '';
      case 'alphanumeric':
        return /[a-zA-Z0-9]/.test(one) ? one : '';
      case 'text':
      default:
        return one;
    }
  }

  /**
   * The key as the strip SEES it.
   *
   * The boxes run along the inline axis, so under `dir="rtl"` the box to the
   * visual right of the caret is the PREVIOUS one. Home/End stay semantic (first
   * and last box), and Backspace is not a direction at all.
   */
  private inlineKey(key: string): string {
    if (this.dir?.value !== 'rtl') return key;
    if (key === 'ArrowRight') return 'ArrowLeft';
    if (key === 'ArrowLeft') return 'ArrowRight';
    return key;
  }
}
