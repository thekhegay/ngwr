/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-blur-text>` a harness query matches. */
export interface WrBlurTextHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the string the component announces — the readable copy, not the pieces.
   * A string is an exact match, a RegExp is tested.
   *
   * Matching on the accessible copy rather than on the host's text is deliberate:
   * the host also holds a span per character, so its text reads back as the string
   * twice over, and a filter written against that would depend on the split.
   */
  readonly text?: string | RegExp;
  /**
   * Match on how many animated pieces the split produced — one per word, or one per
   * character. The blunt way to tell two otherwise identical reveals apart, and the
   * only number about the animation that is present in the DOM at all.
   */
  readonly pieceCount?: number;
}
