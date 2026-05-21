/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { provideWrIcons, WrIconComponent, eye, eyeOff } from 'ngwr/icon';
import { noop } from 'ngwr/utils';

import type { WrInputType } from './types';

/**
 * Single-line text input with optional prefix/suffix and password reveal.
 *
 * Implements `ControlValueAccessor` — usable with `[(ngModel)]`,
 * `formControlName`, or `[formControl]`.
 *
 * @example
 * ```html
 * <wr-input placeholder="Email" type="email" [(ngModel)]="email" />
 * <wr-input prefix="$" suffix="USD" type="number" />
 * <wr-input type="password" passwordToggle />
 * ```
 *
 * @see https://ngwr.dev/docs/components/input
 */
@Component({
  selector: 'wr-input',
  templateUrl: './input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrIconComponent],
  providers: [
    provideWrIcons([eye, eyeOff]),
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrInputComponent),
      multi: true,
    },
  ],
})
export class WrInputComponent implements ControlValueAccessor {
  /**
   * Native input type.
   *
   * @default 'text'
   */
  readonly type = input<WrInputType>('text');

  /**
   * Native placeholder text.
   *
   * @default ''
   */
  readonly placeholder = input<string>('');

  /**
   * Static text shown before the input value.
   *
   * @default null
   */
  readonly prefix = input<string | null>(null);

  /**
   * Static text shown after the input value.
   *
   * @default null
   */
  readonly suffix = input<string | null>(null);

  /**
   * Read-only state.
   *
   * @default false
   */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  /**
   * Pill-shaped corners.
   *
   * @default false
   */
  readonly rounded = input(false, { transform: coerceBooleanProperty });

  /**
   * Adds an eye toggle that flips `type` between `password` and `text`.
   * Has no effect when `type` is not `password`.
   *
   * @default false
   */
  readonly passwordToggle = input(false, { transform: coerceBooleanProperty });

  /**
   * Disable the input. Also set automatically by Angular forms via
   * `setDisabledState` (e.g. `formControl.disable()`).
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  protected readonly value = signal<string>('');
  protected readonly disabledFromCva = signal(false);
  protected readonly focused = signal(false);
  protected readonly passwordRevealed = signal(false);

  /** Effective disabled — true if either the `disabled` input or CVA says so. */
  protected readonly effectiveDisabled = computed(() => this.disabled() || this.disabledFromCva());

  /**
   * Effective input type — flips when the password toggle is active.
   *
   * @internal
   */
  protected readonly effectiveType = computed<WrInputType>(() => {
    return this.type() === 'password' && this.passwordRevealed() ? 'text' : this.type();
  });

  protected readonly classes = computed(() => {
    const parts = ['wr-input'];
    if (this.rounded()) parts.push('wr-input--rounded');
    if (this.focused()) parts.push('wr-input--focused');
    if (this.effectiveDisabled()) parts.push('wr-input--disabled');
    if (this.prefix()) parts.push('wr-input--has-prefix');
    if (this.suffix() || (this.type() === 'password' && this.passwordToggle())) {
      parts.push('wr-input--has-suffix');
    }
    return parts.join(' ');
  });

  private onChange: (value: string) => void = noop;
  private onTouched: () => void = noop;

  // ──────── ControlValueAccessor ────────

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledFromCva.set(isDisabled);
  }

  // ──────── Template handlers ────────

  protected onInput(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    this.value.set(next);
    this.onChange(next);
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.onTouched();
  }

  protected togglePassword(): void {
    this.passwordRevealed.update(v => !v);
  }
}
