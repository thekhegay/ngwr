/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-typewriter>` a harness query matches. */
export interface WrTypewriterHarnessFilters extends BaseHarnessFilters {
  /**
   * Match what the machine has typed SO FAR — a prefix while it is still going, the
   * whole sentence once it settles, and the empty string before the first tick. A
   * string is an exact match, a RegExp is tested.
   *
   * There is nothing steadier to match on: the component holds no copy of the phrase
   * it is working towards, so a filter cannot address a typewriter by what it is
   * going to say. Pin the clock first — `vi.useFakeTimers` and an explicit advance —
   * or match a RegExp loose enough to survive whichever frame the query lands on.
   */
  readonly text?: string | RegExp;
  /**
   * Match typewriters showing a caret (`true`) or none at all (`false`).
   *
   * The cursor is REMOVED from the DOM rather than hidden, so this changes mid-run on
   * anything with `hideCursorWhileTyping` — see `WrTypewriterHarness.hasCursor`. On a
   * default typewriter it is stable, and it is the one way to tell two otherwise
   * identical machines apart.
   */
  readonly hasCursor?: boolean;
}
