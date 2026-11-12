/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-sortable-list>` a harness query matches. */
export interface WrSortableListHarnessFilters extends BaseHarnessFilters {
  /** Match the list's `ariaLabel`. A string is an exact match, a RegExp is tested. */
  readonly ariaLabel?: string | RegExp;
  /** Match a list holding a row with this text. A string is an exact match, a RegExp is tested. */
  readonly item?: string | RegExp;
}
