/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Observable } from 'rxjs';

/** A single node in a {@link WrTree}. Nodes are immutable. */
export interface WrTreeNode<TId = string> {
  readonly id: TId;
  readonly label: string;
  readonly children?: readonly WrTreeNode<TId>[];
  /**
   * The node has children it has not loaded. With `children` left undefined the
   * row draws a toggle, and its first expand calls the tree's `loadChildren`.
   */
  readonly hasChildren?: boolean;
  readonly disabled?: boolean;
}

/**
 * Loads the children of a node that set `hasChildren`. Called once, on the
 * first expand; the answer is cached by node id. An array, a Promise or an
 * Observable (its first value is taken), as `wr-select`'s search loader.
 */
export type WrTreeChildrenLoader<TId = string> = (
  node: WrTreeNode<TId>
) => Observable<readonly WrTreeNode<TId>[]> | Promise<readonly WrTreeNode<TId>[]> | readonly WrTreeNode<TId>[];

/** Decides whether a node matches the tree's `filter` text. */
export type WrTreeFilterFn<TId = string> = (node: WrTreeNode<TId>, query: string) => boolean;

/** Trigger size for an overlay {@link WrTree} — shares the `--wr-control-*` contract. */
export type WrTreeSize = 'sm' | 'md' | 'lg';

/** Selection mode for {@link WrTree}. */
export type WrTreeSelectionMode = 'none' | 'single' | 'multi';
