/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which star border a harness query matches. */
export interface WrStarBorderHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the projected content's text — the only thing telling two of these apart, since
   * the decoration carries no name of its own and the host has no role. A string is an
   * exact match, a RegExp is tested.
   */
  readonly text?: string | RegExp;
}
