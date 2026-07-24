/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Context of one rendered row group — passed to a `[wrTableGroupHeader]`
 * template and used to build the built-in band. One is produced per group on
 * the current page (grouping runs after pagination).
 */
export interface WrTableGroupContext {
  /** The group value returned by `groupBy` (alias of `value`). Use as `let-group`. */
  readonly $implicit: unknown;
  /** The group value. Also the identity stored in `collapsedGroups`. */
  readonly value: unknown;
  /** Default label — `String(value)`, or `'—'` for `null` / `undefined` / `''`. */
  readonly label: string;
  /** The group's rows on the current page, in page order. */
  readonly rows: readonly Record<string, unknown>[];
  /** `rows.length` — the group's row count on the current page. */
  readonly count: number;
  /** Whether the group is currently collapsed. */
  readonly collapsed: boolean;
  /** 0-based index of the group on the current page. */
  readonly index: number;
  /** Collapse / expand this group — wire it to a custom header's own control. */
  readonly toggle: () => void;
}
