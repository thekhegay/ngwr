/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken, type Signal } from '@angular/core';

/**
 * Contract a `<wr-option>` uses to talk to its parent `<wr-select>`.
 *
 * @internal
 */
export type WrSelectContext = {
  /** Currently selected value. */
  readonly value: Signal<unknown>;
  /** Whether the select is disabled. */
  readonly isDisabled: Signal<boolean>;
  /** Called when a child option is clicked. */
  selectOption(value: unknown, label: string): void;
};

/**
 * Token a `<wr-option>` injects to register itself with and notify its
 * parent `<wr-select>`.
 *
 * @internal
 */
export const WR_SELECT = new InjectionToken<WrSelectContext>('WR_SELECT');
