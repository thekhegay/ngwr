/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-ripple-grid>` a harness query matches. */
export interface WrRippleGridHarnessFilters extends BaseHarnessFilters {
  /**
   * Match only grids whose canvas has drawn (`true`) or only grids still showing the
   * stand-in lines (`false`). A ripple grid has no name of its own, so this is the one
   * state that tells two of them apart — see `WrRippleGridHarness.isPainted`, which
   * explains why the answer is always `false` in a unit test.
   */
  readonly painted?: boolean;
}
