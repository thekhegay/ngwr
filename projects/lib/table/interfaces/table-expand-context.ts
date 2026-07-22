/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Context passed to a `[wrTableExpand]` detail template.
 */
export interface WrTableExpandContext {
  /** The expanded row. Use as `let-row`. */
  readonly $implicit: Record<string, unknown>;
  /** The expanded row (alias of `$implicit`). */
  readonly row: Record<string, unknown>;
}
