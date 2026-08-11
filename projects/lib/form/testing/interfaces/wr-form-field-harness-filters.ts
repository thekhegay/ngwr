/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-form-field>` a harness query matches. */
export interface WrFormFieldHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the label text, with the `*` / `(optional)` markers left out of it — a
   * string is an exact match, a RegExp is tested. `null` matches a field that
   * renders no label at all.
   */
  readonly label?: string | RegExp | null;
  /**
   * Match the hint text. A field showing an error has NO hint in the DOM — the
   * error block takes its place — so this never matches an invalid field.
   */
  readonly hint?: string | RegExp;
  /** Match only fields marked required (`true`) or not (`false`). */
  readonly required?: boolean;
  /** Match only fields currently showing an error (`true`) or not (`false`). */
  readonly invalid?: boolean;
  /**
   * Match a field one of whose VISIBLE messages is this text — a string is an
   * exact match, a RegExp is tested. Suppressed messages (a projected
   * `<wr-form-error key>` whose key is not failing) are not considered.
   */
  readonly errorText?: string | RegExp;
}

/** Narrows which `<wr-form-item>` a harness query matches. */
export interface WrFormItemHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the text of the item's own `<label>` child — a string is an exact
   * match, a RegExp is tested. The label is the consumer's, not the item's.
   */
  readonly label?: string | RegExp;
  /** Match only items the consumer put in the error state (`true`) or not (`false`). */
  readonly invalid?: boolean;
  /** Match an item one of whose `<wr-form-error>` messages is this text. */
  readonly errorText?: string | RegExp;
}
