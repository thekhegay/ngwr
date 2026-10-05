/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-rotating-text>` a harness query matches. */
export interface WrRotatingTextHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the string showing right now — the readable copy, not the animated pieces.
   * A string is an exact match, a RegExp is tested.
   *
   * It matches a MOMENT, not a rotator: the component cycles, so a filter that hits today
   * misses two seconds later. Use it to address the one that is currently showing a known
   * word, and prefer `selector` for a rotator you need to hold on to.
   */
  readonly text?: string | RegExp;
  /**
   * Match on how many word groups the split produced. Word boundaries survive every
   * granularity — three words stay three groups even when each is exploded into
   * characters — so this is stable across the split, unlike the piece count.
   */
  readonly wordCount?: number;
}
