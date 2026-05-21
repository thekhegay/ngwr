/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken, type Signal } from '@angular/core';

/**
 * Contract a checkbox uses to talk to its parent `<wr-checkbox-group>`.
 *
 * @internal
 */
export type WrCheckboxGroupContext = {
  /** Is the given value currently selected? */
  isSelected(value: unknown): boolean;
  /** Toggle the given value in the group. */
  toggle(value: unknown): void;
  /** Whether the entire group is disabled. */
  readonly isDisabled: Signal<boolean>;
};

/**
 * Token a `<wr-checkbox>` injects to read selection state from — and
 * toggle values in — its parent `<wr-checkbox-group>` (when present).
 *
 * @internal
 */
export const WR_CHECKBOX_GROUP = new InjectionToken<WrCheckboxGroupContext>('WR_CHECKBOX_GROUP');
