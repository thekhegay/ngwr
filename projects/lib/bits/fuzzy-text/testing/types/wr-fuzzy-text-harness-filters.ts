/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-fuzzy-text>` a harness query matches. */
export interface WrFuzzyTextHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the headline — a string is an exact match, a RegExp is tested.
   *
   * The only filter, and the only one possible: everything else this component is told
   * ends up as a canvas font string or a fill style and never reaches the DOM, so the
   * readable copy of the text is the sole thing that tells two headlines apart. Matched
   * through `WrFuzzyTextHarness.getText`, which reads the screen-reader span rather than
   * the pixels.
   */
  readonly text?: string | RegExp;
}
