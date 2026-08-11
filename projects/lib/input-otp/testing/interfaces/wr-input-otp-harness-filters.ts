/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-input-otp>` a harness query matches. */
export interface WrInputOtpHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the assembled code — a string is an exact match, a RegExp is tested.
   *
   * The code is the boxes joined, so an emptied middle box is not a gap here: a
   * control showing `1 2 _ 4 5 6` matches `'12456'`.
   */
  readonly value?: string | RegExp;
  /** Match by how many boxes are rendered. */
  readonly length?: number;
  /** Match only enabled (`false`) or only disabled (`true`) controls. */
  readonly disabled?: boolean;
  /** Match only controls with every box filled (`true`), or with one still empty (`false`). */
  readonly complete?: boolean;
}
