/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken, type Signal } from '@angular/core';

/**
 * Contract a radio uses to talk to its parent `<wr-radio-group>`.
 *
 * @internal
 */
export type WrRadioGroupContext = {
  /** Shared `name` attribute applied to every native input in the group. */
  readonly name: Signal<string>;
  /** Currently selected value. */
  readonly value: Signal<unknown>;
  /** Whether the entire group is disabled. */
  readonly isDisabled: Signal<boolean>;
  /** Select the given value. */
  select(value: unknown): void;
  /** Mark the group as touched (called on blur from any child). */
  touch(): void;
};

/**
 * Token a `<wr-radio>` injects to participate in its parent `<wr-radio-group>`
 * — reads the selected value, shares the `name` attribute, and signals
 * selection / blur back up.
 *
 * @internal
 */
export const WR_RADIO_GROUP = new InjectionToken<WrRadioGroupContext>('WR_RADIO_GROUP');
