/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-threads>` a harness query matches. */
export interface WrThreadsHarnessFilters extends BaseHarnessFilters {
  /**
   * Match only backgrounds whose canvas has drawn (`true`) or only those still showing
   * the stand-in threads (`false`). A background has no name of its own, so this is the
   * one state that tells two of them apart. With no 2D context — plain jsdom — every
   * background is still `false`; see `WrThreadsHarness.isPainted` for when it turns
   * `true`.
   */
  readonly painted?: boolean;
}
