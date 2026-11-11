/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-copy-value>` a harness query matches. */
export interface WrCopyValueHarnessFilters extends BaseHarnessFilters {
  /** Match the value shown — a string is an exact match, a RegExp is tested. An empty one matches neither. */
  readonly value?: string | RegExp;
  /** Match only empty (`true`) or only filled (`false`) ones. */
  readonly empty?: boolean;
}
