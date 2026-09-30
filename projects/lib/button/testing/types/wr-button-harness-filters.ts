/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-btn>` a harness query matches. */
export interface WrButtonHarnessFilters extends BaseHarnessFilters {
  /** Match the button's visible label — a string is an exact match, a RegExp is tested. */
  readonly text?: string | RegExp;
  /** Match only enabled (`false`) or only disabled (`true`) buttons. */
  readonly disabled?: boolean;
}
