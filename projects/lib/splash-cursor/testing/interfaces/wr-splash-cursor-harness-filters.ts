/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-splash-cursor>` a harness query matches. */
export interface WrSplashCursorHarnessFilters extends BaseHarnessFilters {
  /**
   * Match only the page-wide overlay (`true`) or only a box-contained effect (`false`).
   * The component has no name and no content, so its layout mode is the only thing that
   * distinguishes two of them — see `WrSplashCursorHarness.isFullscreen`.
   */
  readonly fullscreen?: boolean;
}
