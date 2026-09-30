/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `[wrDropdown]` trigger a harness query matches. */
export interface WrDropdownHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the trigger's visible text — the label of whatever element the
   * consumer put `[wrDropdown]` on. A string is an exact match, a RegExp is
   * tested.
   */
  readonly text?: string | RegExp;
  /** Match only open (`true`) or only closed (`false`) dropdowns. */
  readonly open?: boolean;
}

/** Narrows which item inside a dropdown's menu a harness query matches. */
export interface WrDropdownItemHarnessFilters extends BaseHarnessFilters {
  /** Match the item's label — a string is an exact match, a RegExp is tested. */
  readonly text?: string | RegExp;
  /** Match only enabled (`false`) or only disabled (`true`) items. */
  readonly disabled?: boolean;
}
