/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-circular-text>` a harness query matches. */
export interface WrCircularTextHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the string the ring announces — the readable copy, not the characters.
   * A string is an exact match, a RegExp is tested.
   *
   * Matched against the accessible copy rather than the host's text because the host
   * carries both: one readable span AND one span per character, so its text reads back
   * as the string twice over and a filter written against it would depend on the split.
   */
  readonly text?: string | RegExp;
  /**
   * Match on how many characters the ring was laid out from — the divisor every angle is
   * derived from, and the blunt way to address one of two rings without spelling their
   * strings out.
   */
  readonly characterCount?: number;
}
