/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-sidebar>` a harness query matches. */
export interface WrSidebarHarnessFilters extends BaseHarnessFilters {
  /** Match the landmark's accessible name: a string is an exact match, a RegExp is tested. */
  readonly label?: string | RegExp;
}

/** Narrows which sidebar row a harness query matches. */
export interface WrSidebarItemHarnessFilters extends BaseHarnessFilters {
  /** Match the row's title: a string is an exact match, a RegExp is tested. */
  readonly title?: string | RegExp;
  /** Match only the current page (`true`) or only the other rows (`false`). */
  readonly current?: boolean;
  /** Match only disabled (`true`) or only enabled (`false`) rows. */
  readonly disabled?: boolean;
}

/** Narrows which sidebar group a harness query matches. */
export interface WrSidebarGroupHarnessFilters extends BaseHarnessFilters {
  /** Match the group's title: a string is an exact match, a RegExp is tested. */
  readonly title?: string | RegExp;
  /** Match only open (`true`) or only closed (`false`) groups, as the toggle announces it. */
  readonly open?: boolean;
}
