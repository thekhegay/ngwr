/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, input } from '@angular/core';
import { NgControl, type ValidationErrors } from '@angular/forms';
import type { Field } from '@angular/forms/signals';

import { wrCheckStyles } from 'ngwr/utils';

/**
 * Hands an `array` field's own state to the `<wr-form-field>` around it.
 *
 * `<wr-form-field>` reads its errors off the `NgControl` in its content, which
 * `[formField]` provides for a control. A repeating group has no control, so
 * without this its own errors (`minLength`, a `validate` on the array) had
 * nowhere to show, and they would have needed a second copy of the rules for
 * where an error's words come from.
 *
 * @internal
 */
@Directive({
  selector: '[wrSchemaFormArrayState]',
  providers: [{ provide: NgControl, useExisting: WrSchemaFormArrayState }],
})
export class WrSchemaFormArrayState {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('schema-form');
  }

  readonly wrSchemaFormArrayState = input.required<Field<never>>();

  /** Not an `AbstractControl`, which is what tells the field to read the getters below. */
  readonly control = null;

  get touched(): boolean {
    return this.wrSchemaFormArrayState()().touched();
  }

  get dirty(): boolean {
    return this.wrSchemaFormArrayState()().dirty();
  }

  /** The array's OWN errors, keyed by kind. An item's errors show beside the item's control. */
  get errors(): ValidationErrors | null {
    const errors = this.wrSchemaFormArrayState()().errors();
    return errors.length ? Object.fromEntries(errors.map(error => [error.kind, error])) : null;
  }
}
