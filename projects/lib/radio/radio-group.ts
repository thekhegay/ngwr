/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, forwardRef, input, model, output } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { useFormFieldAria } from 'ngwr/form';
import { randomId } from 'ngwr/utils';

import { WR_RADIO_GROUP, type WrRadioGroupContext } from './tokens';

/**
 * Hosts a group of `<wr-radio>` children as a single-value selection.
 *
 * A signal-forms native control: it implements `FormValueControl<unknown>`, so
 * `[formField]` binds to its `value` model — the currently selected radio's
 * `value`. `[(value)]` works standalone. Classic `[(ngModel)]` / reactive forms
 * keep working through Angular's bridge.
 *
 * @example
 * ```html
 * <wr-radio-group [formField]="form.size">
 *   <wr-radio value="sm">Small</wr-radio>
 *   <wr-radio value="md">Medium</wr-radio>
 *   <wr-radio value="lg">Large</wr-radio>
 * </wr-radio-group>
 * ```
 *
 * @see https://ngwr.dev/reference/components/radio
 */
@Component({
  selector: 'wr-radio-group',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-radio-group',
    role: 'radiogroup',
    '[attr.aria-readonly]': 'readonly() || null',
    '[attr.aria-invalid]': 'fieldAria.ariaInvalid()',
    '[attr.aria-describedby]': 'fieldAria.describedBy()',
  },
  providers: [
    {
      provide: WR_RADIO_GROUP,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrRadioGroup),
    },
  ],
})
export class WrRadioGroup implements FormValueControl<unknown>, WrRadioGroupContext {
  /**
   * Shared `name` attribute. Defaults to a random id so multiple groups
   * on the same page don't collide. (Also the `FormUiControl.name` slot.)
   */
  readonly name = input<string>(randomId('wr-radio-group'));

  /**
   * Disable the whole group. Bound automatically from the field's disabled
   * state when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Refuse selection changes while every option stays focusable and the value
   * still submits. Bound automatically from the field's readonly state when used
   * with `[formField]`.
   *
   * Native radios ignore the `readonly` attribute, so the group cancels the
   * activation instead and mirrors the state as `aria-readonly`, which role
   * `radiogroup` supports.
   *
   * @default false
   */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  /** The surrounding `<wr-form-field>`'s error state. @internal */
  protected readonly fieldAria = useFormFieldAria();

  /** The selected radio's value. Bound by `[formField]`, or two-way via `[(value)]`. */
  readonly value = model<unknown>(null);

  /** Emitted on blur from any child so a bound field can mark itself touched. */
  readonly touch = output<void>();

  /** Effective disabled state (WrRadioGroupContext). */
  readonly isDisabled = computed(() => this.disabled());

  /** Effective readonly state (WrRadioGroupContext). */
  readonly isReadonly = computed(() => this.readonly());

  // WrRadioGroupContext

  select(value: unknown): void {
    if (this.isDisabled() || this.isReadonly()) return;
    this.value.set(value);
  }

  markTouched(): void {
    this.touch.emit();
  }
}
