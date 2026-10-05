/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-marquee>` a harness query matches. */
export interface WrMarqueeHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the region's accessible name — the only thing telling two strips on one page
   * apart. A string is an exact match, a RegExp is tested.
   *
   * Every marquee has one: with no `[ariaLabel]` and no catalog it is the literal
   * `'Marquee'`, so this never matches on absence.
   */
  readonly ariaLabel?: string | RegExp;
}

/** Narrows which `.wr-marquee__item` a harness query matches. */
export interface WrMarqueeItemHarnessFilters extends BaseHarnessFilters {
  /** Match what the entry announces — see `WrMarqueeItemHarness.getAccessibleName()`. */
  readonly name?: string | RegExp;
  /** Match only linked (`true`) or only plain (`false`) entries. */
  readonly link?: boolean;
}

/** One linked entry of the strip, as it announces itself and as it navigates. */
export interface WrMarqueeLink {
  /** The `href` exactly as the item declared it, unresolved. */
  readonly href: string | null;
  /**
   * The link's accessible name. Never `null` in practice — an entry with nothing to call
   * itself falls back to the catalog's `marquee.link`, because a bare "link" was what a
   * screen reader used to announce for every unlabelled logo in the strip.
   */
  readonly name: string | null;
}
