/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

import type { WrActionSheetAction } from 'ngwr/action-sheet';

/** Narrows which open `<wr-action-sheet>` a harness query matches. */
export interface WrActionSheetHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the sheet's VISIBLE heading — a string is an exact match, a RegExp is
   * tested. A sheet with no `title` has none and matches nothing here; filter on
   * `accessibleName` to reach one by the name it announces instead.
   */
  readonly title?: string | RegExp;
  /** Match the muted sub-heading under the title. */
  readonly message?: string | RegExp;
  /**
   * Match the name the dialog announces — the visible title when there is one, and
   * otherwise the screen-reader-only fallback, which is the only name an untitled
   * sheet has.
   */
  readonly accessibleName?: string | RegExp;
}

/** Narrows which row inside an action sheet a harness query matches. */
export interface WrActionSheetActionHarnessFilters extends BaseHarnessFilters {
  /** Match the row's label — a string is an exact match, a RegExp is tested. */
  readonly label?: string | RegExp;
  /**
   * Match the row's visual role. `default` covers every row the caller left
   * unroled, which is what the component itself does with the value.
   */
  readonly role?: NonNullable<WrActionSheetAction['role']>;
  /** Match only enabled (`false`) or only disabled (`true`) rows. */
  readonly disabled?: boolean;
}
