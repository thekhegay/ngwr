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
export interface WrCheckboxGroupContext {
  /** Is the given value currently selected? */
  isSelected(value: unknown): boolean;
  /** Toggle the given value in the group. */
  toggle(value: unknown): void;
  /**
   * A child lost focus.
   *
   * The group is the control a form binds to, so it is the group that has to
   * report touched — and a child's own `touch` output goes nowhere, since the
   * group never listens to it. Without this channel the only way to mark a
   * group touched was to CHANGE it: tabbing through every box and picking none
   * left the field pristine, so a `required` group showed no error until the
   * user toggled something, which is the one thing they had decided not to do.
   */
  blurred(): void;
  /** Whether the entire group is disabled. */
  readonly isDisabled: Signal<boolean>;
  /** Whether the entire group refuses edits while staying focusable. */
  readonly isReadonly: Signal<boolean>;
}

/**
 * Token a `<wr-checkbox>` injects to read selection state from — and
 * toggle values in — its parent `<wr-checkbox-group>` (when present).
 *
 * @internal
 */
export const WR_CHECKBOX_GROUP = new InjectionToken<WrCheckboxGroupContext>('WR_CHECKBOX_GROUP');
