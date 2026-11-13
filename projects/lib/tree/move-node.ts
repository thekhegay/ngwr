/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrTreeMoveEvent, WrTreeNode } from './types';

type Nodes<TId> = readonly WrTreeNode<TId>[];

function without<TId>(list: Nodes<TId>, id: TId): Nodes<TId> {
  let changed = false;
  const out: WrTreeNode<TId>[] = [];
  for (const node of list) {
    if (node.id === id) {
      changed = true;
      continue;
    }
    const children = node.children && without(node.children, id);
    if (children !== node.children) {
      changed = true;
      out.push({ ...node, children });
    } else {
      out.push(node);
    }
  }
  return changed ? out : list;
}

function insert<TId>(list: Nodes<TId>, parentId: TId | null, index: number, node: WrTreeNode<TId>): Nodes<TId> {
  if (parentId === null) {
    const out = list.slice();
    out.splice(index, 0, node);
    return out;
  }
  let changed = false;
  const out = list.map(item => {
    let next = item.children;
    if (item.id === parentId) next = insert(item.children ?? [], null, index, node);
    else if (item.children) next = insert(item.children, parentId, index, node);
    if (next === item.children) return item;
    changed = true;
    return { ...item, children: next };
  });
  return changed ? out : list;
}

/**
 * Applies a `nodeMove` to a node array and returns the new one. `wr-tree`
 * never writes to `nodes`, so this is the line a `(nodeMove)` handler needs.
 * Nothing is mutated, a branch the move does not touch keeps its identity, and
 * a move into a parent the array does not hold returns the array as it was.
 *
 * @example
 * ```ts
 * onMove(move: WrTreeMoveEvent): void {
 *   this.nodes.update(nodes => wrMoveTreeNode(nodes, move));
 * }
 * ```
 */
export function wrMoveTreeNode<TId = string>(
  nodes: readonly WrTreeNode<TId>[],
  move: WrTreeMoveEvent<TId>
): readonly WrTreeNode<TId>[] {
  const rest = without(nodes, move.node.id);
  const moved = insert(rest, move.to.parentId, move.to.index, move.node);
  // A parent that is not in `nodes` would otherwise swallow the node.
  return moved === rest ? nodes : moved;
}
