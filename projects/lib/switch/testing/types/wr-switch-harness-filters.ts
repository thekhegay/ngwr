/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-switch>` a harness query matches. */
export interface WrSwitchHarnessFilters extends BaseHarnessFilters {
  /** Match the projected label — a string is an exact match, a RegExp is tested. */
  readonly label?: string | RegExp;
  /** Match only switches that are on (`true`) or off (`false`). */
  readonly on?: boolean;
  /** Match only enabled (`false`) or only disabled (`true`) switches. */
  readonly disabled?: boolean;
}
