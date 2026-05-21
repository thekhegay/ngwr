/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

/**
 * Wraps a label + control + error message into a single field row.
 *
 * Toggle `hasError` to apply error styling to the projected label and
 * any descendant input / textarea / checkbox.
 *
 * @example
 * ```html
 * <wr-form-item [hasError]="form.controls.email.invalid">
 *   <label>Email</label>
 *   <wr-input formControlName="email" />
 *   <wr-form-error>Invalid email</wr-form-error>
 * </wr-form-item>
 * ```
 *
 * @see https://ngwr.dev/docs/components/form
 */
@Component({
  selector: 'wr-form-item',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrFormItemComponent {
  /**
   * When `true`, applies error coloring to the projected label and inputs.
   *
   * @default false
   */
  readonly hasError = input(false, { transform: coerceBooleanProperty });

  protected readonly classes = computed(() => {
    const parts = ['wr-form-item'];
    if (this.hasError()) parts.push('wr-form-item--error');
    return parts.join(' ');
  });
}
