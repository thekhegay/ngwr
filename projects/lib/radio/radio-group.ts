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

import { WR_RADIO_GROUP, type WrRadioGroupContext } from './tokens';

/**
 * Hosts a group of `<wr-radio>` children as a single-value selection.
 *
 * Implements `ControlValueAccessor` — the group's `value` is the
 * currently selected radio's `value`.
 *
 * @example
 * ```html
 * <wr-radio-group [(ngModel)]="size">
 *   <wr-radio value="sm">Small</wr-radio>
 *   <wr-radio value="md">Medium</wr-radio>
 *   <wr-radio value="lg">Large</wr-radio>
 * </wr-radio-group>
 * ```
 *
 * @see https://ngwr.dev/docs/components/radio-group
 */
@Component({
  selector: 'wr-radio-group',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-radio-group', role: 'radiogroup' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrRadioGroup),
      multi: true,
    },
    {
      provide: WR_RADIO_GROUP,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrRadioGroup),
    },
  ],
})
export class WrRadioGroup implements ControlValueAccessor, WrRadioGroupContext {
  /**
   * Shared `name` attribute. Defaults to a random id so multiple groups
   * on the same page don't collide.
   */
  readonly name = input<string>(randomId('wr-radio-group'));

  /**
   * Disable the whole group. Also set by Angular forms via `setDisabledState`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  readonly value = signal<unknown>(null);

  private readonly disabledFromCva = signal(false);

  /** Effective disabled state — true if either source disables. */
  readonly isDisabled = computed(() => this.disabled() || this.disabledFromCva());

  private onChange: (value: unknown) => void = noop;
  private onTouched: () => void = noop;

  // WrRadioGroupContext

  select(value: unknown): void {
    if (this.isDisabled()) return;
    this.value.set(value);
    this.onChange(value);
  }

  touch(): void {
    this.onTouched();
  }

  // ControlValueAccessor

  writeValue(value: unknown): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledFromCva.set(coerceBooleanProperty(isDisabled));
  }
}
