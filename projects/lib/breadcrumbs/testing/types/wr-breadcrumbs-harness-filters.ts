/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-breadcrumbs>` a harness query matches. */
export interface WrBreadcrumbsHarnessFilters extends BaseHarnessFilters {
  /** Match the landmark's accessible name: a string is an exact match, a RegExp is tested. */
  readonly label?: string | RegExp;
}

/** Narrows which `<wr-breadcrumbs-item>` a harness query matches. */
export interface WrBreadcrumbsItemHarnessFilters extends BaseHarnessFilters {
  /** Match the crumb's text: a string is an exact match, a RegExp is tested. */
  readonly text?: string | RegExp;
  /** Match only the current page (`true`) or only the links above it (`false`). */
  readonly current?: boolean;
}
