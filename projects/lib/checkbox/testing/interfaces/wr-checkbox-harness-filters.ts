/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-checkbox>` a harness query matches. */
export interface WrCheckboxHarnessFilters extends BaseHarnessFilters {
  /** Match the projected label — a string is an exact match, a RegExp is tested. */
  readonly label?: string | RegExp;
  /** Match only ticked (`true`) or only unticked (`false`) boxes. */
  readonly checked?: boolean;
  /** Match only enabled (`false`) or only disabled (`true`) boxes. */
  readonly disabled?: boolean;
}
