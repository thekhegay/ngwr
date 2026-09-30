/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-select>` a harness query matches. */
export interface WrSelectHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the trigger's visible text — the selected label, the chip labels
   * joined by `', '`, or the placeholder when nothing is selected. A string is
   * an exact match, a RegExp is tested.
   */
  readonly text?: string | RegExp;
  /** Match only enabled (`false`) or only disabled (`true`) selects. */
  readonly disabled?: boolean;
  /** Match only open (`true`) or only closed (`false`) selects. */
  readonly open?: boolean;
}

/** Narrows which option inside a select's panel a harness query matches. */
export interface WrOptionHarnessFilters extends BaseHarnessFilters {
  /** Match the option's label — a string is an exact match, a RegExp is tested. */
  readonly text?: string | RegExp;
  /** Match only selected (`true`) or only unselected (`false`) options. */
  readonly selected?: boolean;
  /** Match only enabled (`false`) or only disabled (`true`) options. */
  readonly disabled?: boolean;
}
