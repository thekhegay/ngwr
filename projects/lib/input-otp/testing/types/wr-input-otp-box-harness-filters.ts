/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which box of a `<wr-input-otp>` a harness query matches. */
export interface WrInputOtpBoxHarnessFilters extends BaseHarnessFilters {
  /** Match the character in the box — a string is an exact match, a RegExp is tested. */
  readonly value?: string | RegExp;
  /** Match only empty (`true`) or only filled (`false`) boxes. */
  readonly empty?: boolean;
  /** Match the box's accessible name (`aria-label`, e.g. `'Digit 3'`). */
  readonly label?: string | RegExp;
}
