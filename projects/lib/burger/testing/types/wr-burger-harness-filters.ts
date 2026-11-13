/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-burger>` a harness query matches. */
export interface WrBurgerHarnessFilters extends BaseHarnessFilters {
  /** Match the button's accessible name: a string is an exact match, a RegExp is tested. */
  readonly label?: string | RegExp;
  /** Match only open (`true`) or only closed (`false`) toggles, as the button announces it. */
  readonly open?: boolean;
  /** Match only enabled (`false`) or only disabled (`true`) toggles. */
  readonly disabled?: boolean;
}
