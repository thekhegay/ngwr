/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-pagination>` a harness query matches. */
export interface WrPaginationHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the `role="navigation"` landmark's accessible name — the `label` input,
   * the `pagination.label` catalog entry, or the built-in fallback. A string is an
   * exact match, a RegExp is tested. This is how two pagers on one page are told
   * apart, which is also why each of them should be named.
   */
  readonly label?: string | RegExp;
  /**
   * Match the page the pager announces as current via `aria-current="page"`. A
   * pager announcing none — `page` set below 1 — matches no value here
   * rather than throwing, so one broken pager cannot fail a query for its
   * neighbour.
   */
  readonly page?: number;
  /** Match only enabled (`false`) or only disabled (`true`) pagers. */
  readonly disabled?: boolean;
}
