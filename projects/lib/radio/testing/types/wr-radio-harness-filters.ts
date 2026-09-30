/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-radio-group>` a harness query matches. */
export interface WrRadioGroupHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the `name` the group shares with its radios — a string is an exact
   * match, a RegExp is tested. Left unset, the group generates a random name, so
   * this only identifies a group whose `name` the consumer wrote.
   */
  readonly name?: string | RegExp;
  /** Match only groups that refuse every option (`true`) or offer at least one (`false`). */
  readonly disabled?: boolean;
}

/** Narrows which `<wr-radio>` a harness query matches. */
export interface WrRadioHarnessFilters extends BaseHarnessFilters {
  /** Match the projected label — a string is an exact match, a RegExp is tested. */
  readonly label?: string | RegExp;
  /**
   * Match the option's `value`, which only works for a value the template wrote
   * literally (`value="sm"`). A bound `[value]` never reaches the DOM, so no
   * pattern matches it — see `WrRadioHarness.getValue`.
   */
  readonly value?: string | RegExp;
  /** Match only the selected option (`true`) or only the others (`false`). */
  readonly checked?: boolean;
  /** Match only enabled (`false`) or only disabled (`true`) options. */
  readonly disabled?: boolean;
}
