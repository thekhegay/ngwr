/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-waves>` a harness query matches. */
export interface WrWavesHarnessFilters extends BaseHarnessFilters {
  /**
   * Match only fields whose canvas has drawn (`true`) or only fields still showing the
   * stand-in grid (`false`). A wave field has no name of its own, so this is the one
   * state that tells two of them apart — see `WrWavesHarness.isPainted`, which explains
   * why the answer is always `false` in a unit test.
   */
  readonly painted?: boolean;
}
