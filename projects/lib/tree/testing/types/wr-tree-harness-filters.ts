/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-tree>` a harness query matches. */
export interface WrTreeHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the trigger's selection text — the selected label, or the chip labels joined
   * by `', '` (without the `+N more` count a `maxTagCount` adds); `''` while the
   * placeholder is showing. A string is an exact match, a RegExp is tested. Only an
   * `openOn="overlay"` tree has a trigger; an inline one never matches.
   */
  readonly text?: string | RegExp;
  /**
   * Match a tree that is SHOWING a node with this label — the readable way to tell
   * two trees apart when neither has a trigger. A node inside a collapsed branch is
   * not rendered and does not count, and neither does anything in an overlay tree
   * whose panel is closed.
   */
  readonly nodeLabel?: string | RegExp;
  /** Match only enabled (`false`) or only disabled (`true`) trees. */
  readonly disabled?: boolean;
  /**
   * Match only open (`true`) or only closed (`false`) trees. An inline tree is
   * always open — its rows are part of the host — so it only matches `true`.
   */
  readonly open?: boolean;
}

/** Narrows which node inside a tree a harness query matches. */
export interface WrTreeNodeHarnessFilters extends BaseHarnessFilters {
  /** Match the node's label — a string is an exact match, a RegExp is tested. */
  readonly label?: string | RegExp;
  /** Match only selected (`true`) or only unselected (`false`) nodes. */
  readonly selected?: boolean;
  /**
   * Match only enabled (`false`) or only disabled (`true`) nodes. Every node of a
   * disabled TREE is disabled, so `false` matches nothing there.
   */
  readonly disabled?: boolean;
  /**
   * Match only open (`true`) or only closed (`false`) BRANCHES. A leaf announces no
   * expanded state at all and matches neither — which is what makes
   * `{ expanded: false }` mean "a branch waiting to be opened" rather than "every
   * row that is not open".
   */
  readonly expanded?: boolean;
  /** Match the node's 1-based `aria-level`, i.e. its depth in the tree. */
  readonly level?: number;
}
