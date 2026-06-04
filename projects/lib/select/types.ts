/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Behavior mode for `<wr-select>`. The component is the unified
 * combobox primitive — every shape (single, multi, type-to-search,
 * free-text-tags) is the same component with a different `mode`.
 *
 * Modes shipped in v7:
 *
 * - `'single'` — one value, no input field. The classic dropdown.
 * - `'multi'`  — array value, chips on the trigger, options toggle on click.
 *
 * Modes planned for follow-up releases (NOT yet wired — picking them
 * today will fall through to `'single'`):
 *
 * - `'search'` — type-ahead with sync filter or async loader (replaces
 *   the standalone `<wr-autocomplete>`).
 * - `'tag'`    — free-text + chips, with optional `allowCreate` /
 *   `createValidator` for typed lists (replaces `<wr-chips-input>`).
 */
export type WrSelectMode = 'single' | 'multi' | 'search' | 'tag';
