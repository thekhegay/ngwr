/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

/**
 * Container for `<input wrInput>` + `[wrInputPrefix]` / `[wrInputSuffix]` /
 * `<wr-password-toggle>` siblings. Renders the border and focus ring; the
 * inner native input drops its own border so it visually melts into the
 * group.
 *
 * Pure layout — no signals shared with the inner directive, focus styling is
 * driven entirely by `:focus-within` so any focusable child counts.
 *
 * @example
 * ```html
 * <wr-input-group>
 *   <span wrInputPrefix>$</span>
 *   <input wrInput [(ngModel)]="amount" type="number" />
 *   <span wrInputSuffix>USD</span>
 * </wr-input-group>
 * ```
 *
 * @see https://ngwr.dev/docs/components/input
 */
@Component({
  selector: 'wr-input-group',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrInputGroup {
  /** Pill-shaped corners. @default false */
  readonly rounded = input(false, { transform: coerceBooleanProperty });

  protected readonly classes = computed(() => {
    const parts = ['wr-input-group'];
    if (this.rounded()) parts.push('wr-input-group--rounded');
    return parts.join(' ');
  });
}
