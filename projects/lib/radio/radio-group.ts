/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  Component,
  HostAttributeToken,
  ViewEncapsulation,
  computed,
  forwardRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { useFormFieldAria } from 'ngwr/form';
import { randomId } from 'ngwr/utils';

import { WR_RADIO_GROUP } from './tokens';
import type { WrRadioGroupContext } from './types';

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
    // `aria-labelledby` is how a `role="radiogroup"` gets its name from a
    // `<wr-form-field label="…">`: `<label for>` binds only to a LABELABLE
    // element, and this host is a `div` with a role, so the field's visible
    // label pointed at nothing and the group announced unnamed. This is the
    // case `useFormFieldAria().labelledBy()` exists for, and `wr-rating`
    // already reads it.
    //
    // The consumer's OWN attribute wins, and has to: the component ships no
    // label input on purpose — the question above a radio group is the
    // consumer's heading — so a binding that always wrote the field's id
    // would delete a hand-written `aria-labelledby` on every group that is
    // not inside a field, which is most of them.
    '[attr.aria-labelledby]': 'labelledBy()',
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
  /**
   * Whatever the consumer wrote on the host, read once at construction.
   *
   * `HostAttributeToken` rather than a DOM read: it resolves from the
   * element's attributes through DI, so it works under SSR, where a
   * constructor-time `getAttribute` would not.
   */
  private readonly ownLabelledBy = inject(new HostAttributeToken('aria-labelledby'), { optional: true });

  protected readonly fieldAria = useFormFieldAria();

  protected readonly labelledBy = computed(() => this.ownLabelledBy ?? this.fieldAria.labelledBy());

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
