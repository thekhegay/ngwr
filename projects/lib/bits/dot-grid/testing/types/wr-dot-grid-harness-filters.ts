/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-dot-grid>` a harness query matches. */
export interface WrDotGridHarnessFilters extends BaseHarnessFilters {
  /**
   * Match only grids whose canvas has drawn (`true`) or only grids still showing the
   * stand-in dots (`false`). A dot grid has no name of its own, so this is the one
   * state that tells two of them apart — see `WrDotGridHarness.isPainted`, which
   * explains why the answer is always `false` in a unit test.
   */
  readonly painted?: boolean;
}
