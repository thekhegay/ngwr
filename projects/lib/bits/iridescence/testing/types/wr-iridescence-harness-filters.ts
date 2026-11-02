/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-iridescence>` a harness query matches. */
export interface WrIridescenceHarnessFilters extends BaseHarnessFilters {
  /**
   * Match only hosts whose canvas has drawn (`true`) or only hosts still showing the
   * stand-in alone (`false`). The background has no name of its own, so this is the one
   * state that tells two of them apart — see `WrIridescenceHarness.isPainted`, which
   * says when each answer is the right one in a unit test.
   */
  readonly painted?: boolean;
}
