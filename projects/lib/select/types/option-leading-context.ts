/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Where a `wrOptionLeading` template is being drawn:
 *
 * - `'option'` — the row in the open panel.
 * - `'chip'` — a selected chip on a `mode="multi"` trigger.
 * - `'value'` — the selected value on a single-mode trigger: beside the label on
 *   a button trigger, and before the input on a search-shaped one while that
 *   input is showing the label. One placement rather than two, because it is one
 *   surface — the same size is right on both, and splitting it would ask every
 *   consumer to name a case they do not have.
 */
export type WrOptionLeadingPlacement = 'option' | 'chip' | 'value';

/** Template context of `<ng-template wrOptionLeading>`. */
export interface WrOptionLeadingContext<T = unknown, I = T> {
  /** The option's value — `let-value`. Under `valueWith` it is the id, not the item. */
  readonly $implicit: T;
  /**
   * The item behind the option — `let-item="item"`. With `[options]` it is the
   * item itself, so under `valueWith` it carries the fields the id leaves out.
   * Without `valueWith` it equals `$implicit`. On a `<wr-option>` you declare
   * yourself there is no item, so it is the value too; so it is for a selected
   * value no row carries any more, such as a loader result since replaced.
   */
  readonly item: I;
  /** Where this copy is drawn, so one template can size itself per surface. */
  readonly placement: WrOptionLeadingPlacement;
}
