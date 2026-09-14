/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrGraphLayoutEdge, WrGraphLayoutInput, WrGraphLayoutNode } from './types';

/** An edge inside one component, its ends as LOCAL node indices. `slot` is its place in the result. */
export interface ComponentEdge {
  readonly slot: number;
  readonly from: number;
  readonly to: number;
}

/** One weakly connected component. A node's position in `nodes` is its local index. */
export interface GraphComponent {
  /** Indices into `PreparedGraph.nodes`, ascending — so local order is still input order. */
  readonly nodes: readonly number[];
  /** Edges between two different nodes, in input order. Parallel edges are kept. */
  readonly edges: readonly ComponentEdge[];
  /** Self-loops, in input order. They take no part in ranking or ordering. */
  readonly loops: readonly ComponentEdge[];
}

export interface PreparedGraph {
  /** Unique nodes in input order. */
  readonly nodes: readonly WrGraphLayoutNode[];
  /** Kept edges in input order; an edge's index here is its `slot`. */
  readonly edges: readonly WrGraphLayoutEdge[];
  /** Ordered by each component's smallest node index. */
  readonly components: readonly GraphComponent[];
}

/**
 * Stage 1. Ids become integer indices in input order and everything after this
 * works on arrays: a plain object keyed by id would enumerate `'2'` before
 * `'10'` whatever order the consumer gave, which is exactly the trap that makes
 * one graph draw two ways.
 *
 * A duplicate id keeps its first occurrence and an edge naming a missing node is
 * dropped. Both are the component's to warn about; the layout only has to
 * survive them.
 */
export function prepareGraph(input: WrGraphLayoutInput): PreparedGraph {
  const index = new Map<string, number>();
  const nodes: WrGraphLayoutNode[] = [];
  for (const node of input.nodes) {
    if (index.has(node.id)) continue;
    index.set(node.id, nodes.length);
    nodes.push(node);
  }

  const edges: WrGraphLayoutEdge[] = [];
  const ends: (readonly [number, number])[] = [];
  for (const edge of input.edges) {
    const from = index.get(edge.from);
    const to = index.get(edge.to);
    if (from === undefined || to === undefined) continue;
    edges.push(edge);
    ends.push([from, to]);
  }

  // Weakly connected components by BFS, started from each unassigned node in
  // input order — so component numbers already follow the smallest index.
  const neighbours: number[][] = nodes.map(() => []);
  for (const [from, to] of ends) {
    neighbours[from].push(to);
    neighbours[to].push(from);
  }
  const componentOf: number[] = nodes.map(() => -1);
  const components: { nodes: number[]; edges: ComponentEdge[]; loops: ComponentEdge[] }[] = [];
  for (let start = 0; start < nodes.length; start++) {
    if (componentOf[start] !== -1) continue;
    componentOf[start] = components.length;
    const queue = [start];
    // `for...of` over an array that grows while it is read visits the appended nodes too.
    for (const current of queue) {
      for (const next of neighbours[current]) {
        if (componentOf[next] !== -1) continue;
        componentOf[next] = components.length;
        queue.push(next);
      }
    }
    components.push({ nodes: [], edges: [], loops: [] });
  }

  const local: number[] = [];
  nodes.forEach((_, node) => {
    const component = components[componentOf[node]];
    local.push(component.nodes.length);
    component.nodes.push(node);
  });
  ends.forEach(([from, to], slot) => {
    const component = components[componentOf[from]];
    const edge = { slot, from: local[from], to: local[to] };
    (from === to ? component.loops : component.edges).push(edge);
  });

  return { nodes, edges, components };
}
