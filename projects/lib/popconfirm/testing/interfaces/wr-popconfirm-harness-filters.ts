/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `[wrPopconfirm]` trigger a harness query matches. */
export interface WrPopconfirmHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the trigger's own visible text — the label of the button the directive
   * sits on, not the question in the panel. A string is an exact match, a RegExp
   * is tested.
   */
  readonly triggerText?: string | RegExp;
  /** Match only open (`true`) or only closed (`false`) popconfirms. */
  readonly open?: boolean;
}
