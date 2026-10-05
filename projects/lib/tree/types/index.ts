/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** A single node in a {@link WrTree}. Nodes are immutable. */
export interface WrTreeNode<TId = string> {
  readonly id: TId;
  readonly label: string;
  readonly children?: readonly WrTreeNode<TId>[];
  readonly disabled?: boolean;
}

/** Selection mode for {@link WrTree}. */
export type WrTreeSelectionMode = 'none' | 'single' | 'multi';
