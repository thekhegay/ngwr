/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-compare>` a harness query matches. */
export interface WrCompareHarnessFilters extends BaseHarnessFilters {
  /** Match the divider's accessible name: a string is an exact match, a RegExp is tested. */
  readonly label?: string | RegExp;
  /** Match the axis the divider moves along. */
  readonly orientation?: 'horizontal' | 'vertical';
  /** Match only enabled (`false`) or only disabled (`true`) sliders. */
  readonly disabled?: boolean;
}
