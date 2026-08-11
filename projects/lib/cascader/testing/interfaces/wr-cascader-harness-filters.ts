/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-cascader>` a harness query matches. */
export interface WrCascaderHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the trigger's displayed value — the selected labels joined by the
   * `separator`, e.g. `'Europe / Germany / Berlin'`. A string is an exact match,
   * a RegExp is tested. A cascader with nothing selected shows its placeholder
   * and matches `''`.
   */
  readonly text?: string | RegExp;
  /** Match the placeholder, which only shows while nothing is selected. */
  readonly placeholder?: string | RegExp;
  /** Match only enabled (`false`) or only disabled (`true`) cascaders. */
  readonly disabled?: boolean;
  /** Match only open (`true`) or only closed (`false`) cascaders. */
  readonly open?: boolean;
}

/** Narrows which column of an open cascader panel a harness query matches. */
export interface WrCascaderColumnHarnessFilters extends BaseHarnessFilters {
  /**
   * Match a column that offers an option with this label — the way to ask for
   * "the level Germany lives in" without counting columns. A string is an exact
   * match, a RegExp is tested.
   */
  readonly optionText?: string | RegExp;
}

/** Narrows which option inside a cascader column a harness query matches. */
export interface WrCascaderOptionHarnessFilters extends BaseHarnessFilters {
  /** Match the option's label — a string is an exact match, a RegExp is tested. */
  readonly text?: string | RegExp;
  /** Match only enabled (`false`) or only disabled (`true`) options. */
  readonly disabled?: boolean;
  /** Match only the expanded option of its column (`true`), or only the rest (`false`). */
  readonly active?: boolean;
  /** Match only branches (`true`) or only leaves (`false`). */
  readonly hasChildren?: boolean;
}
