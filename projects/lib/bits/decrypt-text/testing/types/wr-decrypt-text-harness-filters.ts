/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-decrypt-text>` a harness query matches. */
export interface WrDecryptTextHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the string the component ANNOUNCES — the readable copy, never the scramble.
   * A string is an exact match, a RegExp is tested.
   *
   * This is the only stable thing to address one of these by: the visible layer is a
   * fresh random draw on every tick, so a filter written against it would match a
   * different element each time it ran, or none at all.
   */
  readonly text?: string | RegExp;
  /**
   * Match only settled (`true`) or only scrambled (`false`) instances — the way to pick
   * out the one that has not been revealed yet on a page holding several.
   *
   * Read from the encrypted characters rather than from the glyphs, so it needs no
   * `Math.random` stub. An instance that rendered no characters at all matches NEITHER
   * value: "nothing is encrypted" is true of nothing, and a query is the last place that
   * vacuity should quietly hand back a match.
   */
  readonly revealed?: boolean;
}
