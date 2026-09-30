/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

import type { WrGradientTextDirection } from 'ngwr/gradient-text';

/** Narrows which `<wr-gradient-text>` a harness query matches. */
export interface WrGradientTextHarnessFilters extends BaseHarnessFilters {
  /** Match the projected text — a string is an exact match, a RegExp is tested. */
  readonly text?: string | RegExp;
  /**
   * Match the sweep direction. `'horizontal'` is the ABSENCE of a modifier rather than a
   * class of its own — see `WrGradientTextHarness.getDirection`, which resolves it.
   */
  readonly direction?: WrGradientTextDirection;
  /** Match only the pill variant (`true`) or only the bare one (`false`). */
  readonly border?: boolean;
}
