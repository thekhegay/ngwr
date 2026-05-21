/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/**
 * Inline error message rendered below a form control.
 *
 * Use inside a {@link WrFormItemComponent}; the message is automatically
 * colored danger via the form-item's error styles.
 *
 * @see https://ngwr.dev/docs/components/form
 */
@Component({
  selector: 'wr-form-error',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-form-error', role: 'alert' },
})
export class WrFormErrorComponent {}
