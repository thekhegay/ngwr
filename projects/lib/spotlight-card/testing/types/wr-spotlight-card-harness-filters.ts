/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-spotlight-card>` a harness query matches. */
export interface WrSpotlightCardHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the card's projected text — a string is an exact match, a RegExp is tested.
   *
   * The only filter offered, and deliberately: the card has no name of its own, no
   * disabled or open state, and its one piece of state — where the highlight last sat —
   * is a coordinate nobody would filter on. The content it wraps is what tells two cards
   * on a page apart.
   */
  readonly text?: string | RegExp;
}

/** Narrows which `[wrSpotlight]` host a harness query matches. */
export interface WrSpotlightHarnessFilters extends BaseHarnessFilters {
  /** Match the decorated element's text — a string is an exact match, a RegExp is tested. */
  readonly text?: string | RegExp;
  /**
   * Match a host carrying this class.
   *
   * The directive adds no class of its own — it writes custom properties and nothing
   * else — so unlike every component harness here there is no `.wr-*` hook to narrow by.
   * The consumer's own class is the stable discriminator, which is why this filter names
   * the HOST's class rather than the directive's.
   */
  readonly hostClass?: string;
}
