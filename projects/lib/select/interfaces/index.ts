/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Observable } from 'rxjs';

/**
 * Behavior mode for `<wr-select>`. The component is the unified
 * combobox primitive — every shape (single, multi, type-to-search,
 * free-text-tags) is the same component with a different `mode`.
 *
 * - `'single'` — one value, no input field. The classic dropdown.
 * - `'multi'`  — array value, chips on the trigger, options toggle on click.
 * - `'search'` — type-ahead with sync filter or async loader (replaces
 *   the standalone `<wr-autocomplete>`).
 * - `'tag'`    — free-text + chips, with `separators` / `validate` /
 *   `allowDuplicates` (replaces `<wr-chips-input>`).
 */
export type WrSelectMode = 'single' | 'multi' | 'search' | 'tag';

/**
 * Tag-mode validator. Return `true` to accept the value, `false` to
 * silently reject (e.g. shape check, dedupe against a custom set).
 */
export type WrSelectTagValidator = (value: string, existing: readonly string[]) => boolean;

/**
 * Search-mode async loader. Receives the current query, returns matching
 * items as an array, Observable, or Promise. Cancellation: `switchMap`
 * inside `WrSelect` cancels in-flight calls when a new keystroke lands,
 * so stale responses can't clobber fresh ones.
 */
export type WrSelectSearchLoader<T> = (
  query: string
) => Observable<readonly T[]> | Promise<readonly T[]> | readonly T[];

/** Control size for `<wr-select>` — shares the `--wr-control-*` contract. */
export type WrSelectSize = 'sm' | 'md' | 'lg';

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
export interface WrOptionLeadingContext<T = unknown> {
  /** The option's value — `let-value`. */
  readonly $implicit: T;
  /** Where this copy is drawn, so one template can size itself per surface. */
  readonly placement: WrOptionLeadingPlacement;
}
