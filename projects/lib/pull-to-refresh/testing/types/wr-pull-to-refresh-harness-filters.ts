/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-pull-to-refresh>` a harness query matches. */
export interface WrPullToRefreshHarnessFilters extends BaseHarnessFilters {
  /** Match only wrappers that are (`true`) or are not (`false`) showing a refresh in flight. */
  readonly refreshing?: boolean;
}
