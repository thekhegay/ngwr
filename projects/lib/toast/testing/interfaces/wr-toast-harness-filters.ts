/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

import type { WrToastType } from 'ngwr/toast';

/** Narrows which toast a harness query matches. */
export interface WrToastHarnessFilters extends BaseHarnessFilters {
  /** Match the toast's message — a string is an exact match, a RegExp is tested. */
  readonly message?: string | RegExp;
  /** Match the toast's title. A toast with no title never matches. */
  readonly title?: string | RegExp;
  /** Match the intent: `info`, `success`, `warning` or `danger`. */
  readonly type?: WrToastType;
}
