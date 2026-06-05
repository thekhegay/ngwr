/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import type { ElementRef } from '@angular/core';
import { Component, ViewEncapsulation, computed, forwardRef, input, output, signal, viewChild } from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { noop } from 'ngwr/utils';

/** Validator predicate. Return `true` to accept, `false` to silently reject. */
export type WrChipsValidator = (value: string, existing: readonly string[]) => boolean;

/**
 * Type-to-add tag input. Each typed value becomes a chip; backspace at
 * empty input removes the last chip. Configurable separators decide
 * what commits the current draft (default: `Enter` and `,`). Paste
 * containing any separator splits into multiple chips.
 *
 * Implements `ControlValueAccessor` — the value type is `readonly
 * string[]`. Bind with `[(ngModel)]` or `[formControl]`.
 *
 * @deprecated Prefer `<wr-select mode="tag">` — the unified combobox
 * primitive ships the same feature surface (separators, allowDuplicates,
 * validate, maxItems, Backspace-removes-last). This component will be
 * removed in v8.
 *
 *     // Before
 *     <wr-chips-input [(ngModel)]="tags" [separators]="[' ', ',']" />
 *     // After
 *     <wr-select mode="tag" [(ngModel)]="tags" [separators]="[' ', ',']" />
 *
 * @example
 * ```html
 * <wr-chips-input
 *   [(ngModel)]="recipients"
 *   placeholder="Enter emails"
 *   [validate]="isEmail"
 *   [maxItems]="20"
 * />
 * ```
 *
 * @see https://ngwr.dev/components/select
 */
@Component({
  selector: 'wr-chips-input',
  templateUrl: './chips-input.html',
  styleUrl: './chips-input.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '(click)': 'focusInput()',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrChipsInput),
      multi: true,
    },
  ],
})
export class WrChipsInput implements ControlValueAccessor {
  /** Input placeholder. */
  readonly placeholder = input<string>('');

  /** Disable the entire control. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Keys / characters that commit the current draft into a chip.
   * `'Enter'` is recognised as the key name; anything else is treated as
   * a character to watch for in keypresses and pastes. @default ['Enter', ',']
   */
  readonly separators = input<readonly string[]>(['Enter', ',']);

  /** Maximum number of chips. `0` = unlimited. @default 0 */
  readonly maxItems = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /** Allow the same value to appear more than once. @default false */
  readonly allowDuplicates = input(false, { transform: coerceBooleanProperty });

  /**
   * Custom validator — return `true` to accept the value, `false` to
   * silently reject. Receives the trimmed draft + the existing chips.
   */
  readonly validate = input<WrChipsValidator | null>(null);

  /** Fired whenever a chip is added or removed. */
  readonly chipsChange = output<readonly string[]>();

  protected readonly inputEl = viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected readonly chips = signal<readonly string[]>([]);
  protected readonly draft = signal<string>('');
  private readonly disabledFromCva = signal(false);

  protected readonly effectiveDisabled = computed(() => this.disabled() || this.disabledFromCva());

  protected readonly classes = computed(() => {
    const parts = ['wr-chips-input'];
    if (this.effectiveDisabled()) parts.push('wr-chips-input--disabled');
    return parts.join(' ');
  });

  protected readonly atCapacity = computed(() => {
    const max = this.maxItems();
    return max > 0 && this.chips().length >= max;
  });

  private onChange: (v: readonly string[]) => void = noop;
  protected onTouched: () => void = noop;

  // ──────── Template handlers ────────

  protected onInput(event: Event): void {
    if (this.effectiveDisabled()) return;
    const target = event.target as HTMLInputElement;
    this.draft.set(target.value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) return;

    const seps = this.separators();
    if (seps.includes(event.key)) {
      event.preventDefault();
      this.commitDraft();
      return;
    }

    if (event.key === 'Backspace' && this.draft() === '' && this.chips().length > 0) {
      event.preventDefault();
      this.removeAt(this.chips().length - 1);
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    if (this.effectiveDisabled()) return;
    const text = event.clipboardData?.getData('text') ?? '';
    if (!text) return;

    const seps = this.separators().filter(s => s !== 'Enter');
    if (seps.length === 0) return; // Let the paste land as normal text.

    event.preventDefault();
    const splitRegex = new RegExp(`[${seps.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('')}\\n]+`);
    const parts = text.split(splitRegex);
    for (const part of parts) this.tryAdd(part);
  }

  protected onBlur(): void {
    if (this.draft().trim()) this.commitDraft();
    this.onTouched();
  }

  protected removeAt(index: number): void {
    if (this.effectiveDisabled()) return;
    const next = this.chips().slice();
    next.splice(index, 1);
    this.chips.set(next);
    this.onChange(next);
    this.chipsChange.emit(next);
  }

  protected focusInput(): void {
    if (this.effectiveDisabled()) return;
    this.inputEl().nativeElement.focus();
  }

  // ──────── Internals ────────

  private commitDraft(): void {
    const v = this.draft().trim();
    this.draft.set('');
    this.inputEl().nativeElement.value = '';
    if (v) this.tryAdd(v);
  }

  private tryAdd(raw: string): void {
    if (this.atCapacity()) return;
    const value = raw.trim();
    if (!value) return;

    const existing = this.chips();
    if (!this.allowDuplicates() && existing.includes(value)) return;

    const validator = this.validate();
    if (validator && !validator(value, existing)) return;

    const next = [...existing, value];
    this.chips.set(next);
    this.onChange(next);
    this.chipsChange.emit(next);
  }

  // ──────── ControlValueAccessor ────────

  writeValue(value: unknown): void {
    if (Array.isArray(value)) {
      this.chips.set(value.filter((v): v is string => typeof v === 'string'));
    } else {
      this.chips.set([]);
    }
  }

  registerOnChange(fn: (v: readonly string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledFromCva.set(coerceBooleanProperty(isDisabled));
  }
}
