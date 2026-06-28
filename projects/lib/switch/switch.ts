/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, forwardRef, input, signal } from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { noop, randomId } from 'ngwr/utils';

/**
 * Boolean toggle with an iOS-style slider. Implements `ControlValueAccessor`.
 *
 * @example
 * ```html
 * <wr-switch [(ngModel)]="enabled">Notifications</wr-switch>
 * ```
 *
 * @see https://ngwr.dev/components/switch
 */
export type WrSwitchSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'wr-switch',
  templateUrl: './switch.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrSwitch),
      multi: true,
    },
  ],
})
export class WrSwitch implements ControlValueAccessor {
  /** Stable id used to associate the native input with its label. */
  readonly id = input<string>(randomId('wr-switch'));

  /**
   * Disable the switch. Also set by Angular forms via `setDisabledState`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Control size — shares the `--wr-control-*` contract. @default 'md' */
  readonly size = input<WrSwitchSize>('md');

  protected readonly checked = signal(false);
  private readonly disabledFromCva = signal(false);

  protected readonly effectiveDisabled = computed(() => this.disabled() || this.disabledFromCva());

  protected readonly classes = computed(() => {
    const parts = ['wr-switch'];
    const size = this.size();
    if (size !== 'md') parts.push(`wr-switch--${size}`);
    if (this.checked()) parts.push('wr-switch--checked');
    if (this.effectiveDisabled()) parts.push('wr-switch--disabled');
    return parts.join(' ');
  });

  private onChange: (value: boolean) => void = noop;
  private onTouched: () => void = noop;

  // ControlValueAccessor

  writeValue(value: boolean | null): void {
    this.checked.set(!!value);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledFromCva.set(coerceBooleanProperty(isDisabled));
  }

  // Template handlers

  protected onInputChange(event: Event): void {
    const next = (event.target as HTMLInputElement).checked;
    this.checked.set(next);
    this.onChange(next);
  }

  protected onInputBlur(): void {
    this.onTouched();
  }
}
