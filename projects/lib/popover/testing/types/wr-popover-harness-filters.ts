/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `[wrPopover]` trigger a harness query matches. */
export interface WrPopoverHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the trigger's own visible text — the label of the button (or link, or
   * whatever the directive sits on), not the panel's content. A string is an
   * exact match, a RegExp is tested.
   */
  readonly triggerText?: string | RegExp;
  /** Match only popovers (`'popover'`) or only tooltips (`'tooltip'`). */
  readonly mode?: 'popover' | 'tooltip';
  /** Match only showing (`true`) or only hidden (`false`) panels. */
  readonly open?: boolean;
}
