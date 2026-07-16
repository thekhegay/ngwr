/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, contentChild, input } from '@angular/core';
import { NgControl } from '@angular/forms';

let uid = 0;

/**
 * Wraps a label + control + hint + error messages into a single block —
 * the layout primitive every form ends up reinventing.
 *
 * - Auto-binds `label[for]` to the projected control via a generated id
 *   (or use the form-control's `[id]` if you set one).
 * - Reads the projected control's `NgControl` to surface validation
 *   errors only when the control has been touched / submitted.
 * - Optional `[required]` / `[optional]` markers next to the label.
 *
 * @example
 * ```html
 * <wr-form-field label="Email" hint="We'll never share it.">
 *   <input wrInput [formControl]="email" type="email" />
 *   <wr-form-error key="required">Email is required.</wr-form-error>
 *   <wr-form-error key="email">Not a valid email.</wr-form-error>
 * </wr-form-field>
 * ```
 *
 * @see https://ngwr.dev/reference/components/form-field
 */
@Component({
  selector: 'wr-form-field',
  templateUrl: './form-field.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrFormField {
  /** Label text shown above the control. */
  readonly label = input<string>('');

  /** Hint text shown below the control. Hidden when an error is visible. */
  readonly hint = input<string>('');

  /** Show a `*` next to the label. @default false */
  readonly required = input(false, { transform: coerceBooleanProperty });

  /** Show `(optional)` next to the label. Mutually exclusive with `required`. @default false */
  readonly optional = input(false, { transform: coerceBooleanProperty });

  /** Force a specific id on the label's `for` attribute. Auto-generated otherwise. */
  readonly controlId = input<string>(`wr-form-field-${++uid}`);

  /** Projected `NgControl` — used to read touched / dirty / errors. */
  protected readonly ngControl = contentChild(NgControl);

  protected readonly errors = computed(() => {
    const c = this.ngControl();
    if (!c) return null;
    if (!c.touched && !c.dirty) return null;
    return c.errors;
  });

  protected readonly hasError = computed(() => {
    const errs = this.errors();
    return !!errs && Object.keys(errs).length > 0;
  });

  protected readonly classes = computed(() => {
    const parts = ['wr-form-field'];
    if (this.hasError()) parts.push('wr-form-field--invalid');
    if (this.required()) parts.push('wr-form-field--required');
    return parts.join(' ');
  });
}

/**
 * One error message tied to a validator key. Renders only when the
 * parent form-field has a matching error in `control.errors`.
 *
 * @example
 * ```html
 * <wr-form-error key="required">This field is required.</wr-form-error>
 * <wr-form-error key="email">That doesn't look right.</wr-form-error>
 * ```
 */
@Component({
  selector: 'wr-form-error',
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-form-error wr-form-field__error',
    role: 'alert',
    '[attr.data-key]': 'key() ?? null',
  },
})
export class WrFormError {
  /**
   * Validator key this message corresponds to (e.g. `'required'`).
   * Optional — without a key the message always renders, which is the
   * plain inline-error usage inside `<wr-form-item>`.
   */
  readonly key = input<string>();
}
