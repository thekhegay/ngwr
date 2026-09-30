/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-falling-text>` a harness query matches. */
export interface WrFallingTextHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the rendered sentence — the only thing that tells two of these apart, the
   * component having no name, id or role of its own. A string is an exact match, a
   * RegExp is tested.
   *
   * Compared against `WrFallingTextHarness.getText()`, so the non-breaking spaces the
   * component types between the words are already back to plain ones: pass the sentence
   * as it was written.
   */
  readonly text?: string | RegExp;
}
