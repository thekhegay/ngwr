/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-border-glow>` a harness query matches. */
export interface WrBorderGlowHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the card's projected text — a string is an exact match, a RegExp is tested.
   * The component names itself nothing, so the content it wraps is the only readable
   * way to tell two cards on a page apart.
   */
  readonly text?: string | RegExp;
  /**
   * Match only cards that are mid mount-sweep (`true`) or only cards that are not
   * (`false`) — see `WrBorderGlowHarness.isSweeping`, where the four-second window
   * this is true for is explained.
   */
  readonly sweeping?: boolean;
}
