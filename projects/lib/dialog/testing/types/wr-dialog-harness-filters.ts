/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which open dialog a harness query matches. */
export interface WrDialogHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the dialog's `[wrDialogTitle]` text — a string is an exact match, a
   * RegExp is tested. A dialog with no title never matches.
   */
  readonly title?: string | RegExp;
}
