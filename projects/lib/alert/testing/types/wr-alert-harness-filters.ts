/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

import type { WrAlertType } from 'ngwr/alert';

/** Narrows which `<wr-alert>` a harness query matches. */
export interface WrAlertHarnessFilters extends BaseHarnessFilters {
  /** Match the headline: a string is an exact match, a RegExp is tested. */
  readonly title?: string | RegExp;
  /** Match the whole text of the alert: a string is an exact match, a RegExp is tested. */
  readonly text?: string | RegExp;
  /** Match the variant. */
  readonly type?: WrAlertType;
  /** Match only alerts with (`true`) or without (`false`) a close button. */
  readonly closable?: boolean;
}
