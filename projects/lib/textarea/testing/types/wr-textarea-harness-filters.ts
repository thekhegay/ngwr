/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-textarea>` a harness query matches. */
export interface WrTextareaHarnessFilters extends BaseHarnessFilters {
  /** Match the current value — a string is an exact match, a RegExp is tested. */
  readonly value?: string | RegExp;
  /** Match the placeholder — a string is an exact match, a RegExp is tested. */
  readonly placeholder?: string | RegExp;
  /**
   * Match the accessible name the field answers to — the explicit `ariaLabel`,
   * or the `placeholder` it falls back to. A string is an exact match, a RegExp
   * is tested.
   */
  readonly label?: string | RegExp;
  /** Match only enabled (`false`) or only disabled (`true`) fields. */
  readonly disabled?: boolean;
}
