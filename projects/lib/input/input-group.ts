/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import { useConfigValue } from 'ngwr/config';

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
 * @see https://ngwr.dev/reference/components/input
 */
@Component({
  selector: 'wr-input-group',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrInputGroup {
  /**
   * Pill-shaped corners. Unset, it falls back to
   * `provideWrConfig({ input: { rounded } })` — the same key the inner `[wrInput]`
   * reads. @default false
   */
  readonly rounded = input<boolean | null, BooleanInput>(null, {
    // Null-preserving, like `[wrInput]`'s: the plain `coerceBooleanProperty` folds
    // `null` into `false`, which would make "not set" and "set to false" the same
    // value — and a config default nothing could ever supply.
    transform: (v: BooleanInput): boolean | null => (v == null ? null : coerceBooleanProperty(v)),
  });

  // `input.rounded`, and deliberately not a key of its own: the group owns the visible
  // border once it wraps an input, which drops its own chrome. Resolving one and not
  // the other would put a pill radius on the element nobody can see and leave the
  // corner the user does see square.
  protected readonly resolvedRounded = useConfigValue(this.rounded, c => c.input?.rounded, false);

  protected readonly classes = computed(() => {
    const parts = ['wr-input-group'];
    if (this.resolvedRounded()) parts.push('wr-input-group--rounded');
    return parts.join(' ');
  });
}
