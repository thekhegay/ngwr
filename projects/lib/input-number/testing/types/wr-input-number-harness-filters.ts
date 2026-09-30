/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-input-number>` a harness query matches. */
export interface WrInputNumberHarnessFilters extends BaseHarnessFilters {
  /** Match the text in the field — a string is an exact match, a RegExp is tested. */
  readonly text?: string | RegExp;
  /**
   * Match the number the field is showing.
   *
   * Parsed with the test runtime's locale, since a harness predicate has no place
   * to pass one; an app on a different `LOCALE_ID` should narrow by `text`
   * instead. A field showing text that is not a number — empty, or mid-typed —
   * matches no number at all.
   */
  readonly value?: number;
  /** Match the placeholder — a string is an exact match, a RegExp is tested. */
  readonly placeholder?: string | RegExp;
  /** Match only enabled (`false`) or only disabled (`true`) fields. */
  readonly disabled?: boolean;
}
