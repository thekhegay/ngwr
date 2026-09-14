/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { ComponentEdge } from './prepare';

interface Frame {
  readonly node: number;
  next: number;
}

/**
 * Stage 2. Depth-first search from the sources in input order, then from
 * whatever is left; an edge into the current stack closes a cycle and is
 * reversed. A back edge points at an ancestor on the current path, so both of
 * its ends are in one strongly connected component by construction — no SCC
 * pass is needed here. The stack is explicit because a long chain would
 * otherwise recurse once per node.
 */
function findBackEdges(count: number, edges: readonly ComponentEdge[]): boolean[] {
  const out: number[][] = Array.from({ length: count }, () => []);
  const indegree: number[] = new Array<number>(count).fill(0);
  edges.forEach((edge, k) => {
    out[edge.from].push(k);
    indegree[edge.to]++;
  });

  const reversed = edges.map(() => false);
  const visited: boolean[] = new Array<boolean>(count).fill(false);
  const onStack: boolean[] = new Array<boolean>(count).fill(false);
  const nodes = Array.from({ length: count }, (_, node) => node);
  const starts = [...nodes.filter(node => indegree[node] === 0), ...nodes.filter(node => indegree[node] !== 0)];

  for (const start of starts) {
    if (visited[start]) continue;
    visited[start] = onStack[start] = true;
    const stack: Frame[] = [{ node: start, next: 0 }];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      if (frame.next === out[frame.node].length) {
        onStack[frame.node] = false;
        stack.pop();
        continue;
      }
      const k = out[frame.node][frame.next++];
      const to = edges[k].to;
      if (onStack[to]) {
        reversed[k] = true;
      } else if (!visited[to]) {
        visited[to] = onStack[to] = true;
        stack.push({ node: to, next: 0 });
      }
    }
  }
  return reversed;
}

/**
 * Stage 3. Longest path from the sources: a node sits one rank below its
 * deepest parent, so an org chart keeps a leaf directly under its manager
 * rather than sinking every leaf to the bottom rank the way a sink-based
 * longest path does. Network simplex would be more compact and is several
 * times the code; this is the simplest ranking that reads well.
 *
 * The one tightening pass fixes the cost this ranking is known for: a root
 * whose only child is deep would otherwise sit on rank 0 and draw a long edge
 * through every rank in between. Only a node with no incoming edge moves, and it
 * moves to just above its highest child — so no other node's rank changes and
 * every rank stays occupied.
 */
function assignRanks(count: number, from: readonly number[], to: readonly number[]): number[] {
  const out: number[][] = Array.from({ length: count }, () => []);
  const indegree: number[] = new Array<number>(count).fill(0);
  from.forEach((node, k) => {
    out[node].push(to[k]);
    indegree[to[k]]++;
  });

  // Kahn's algorithm with a FIFO queue seeded in input order.
  const rank: number[] = new Array<number>(count).fill(0);
  const remaining = indegree.slice();
  const order: number[] = [];
  for (let node = 0; node < count; node++) if (indegree[node] === 0) order.push(node);
  // `for...of` over an array that grows while it is read visits the appended nodes too.
  for (const node of order) {
    for (const child of out[node]) {
      rank[child] = Math.max(rank[child], rank[node] + 1);
      if (--remaining[child] === 0) order.push(child);
    }
  }

  for (let i = order.length - 1; i >= 0; i--) {
    const node = order[i];
    if (indegree[node] !== 0 || out[node].length === 0) continue;
    let highest = rank[out[node][0]];
    for (const child of out[node]) highest = Math.min(highest, rank[child]);
    if (highest - 1 > rank[node]) rank[node] = highest - 1;
  }

  let lowest = rank[0];
  for (const value of rank) lowest = Math.min(lowest, value);
  return rank.map(value => value - lowest);
}

/** An edge after cycle removal and dummy insertion. */
export interface LayeredEdge {
  readonly slot: number;
  /** Whether the edge runs child-to-parent in the layout. Its route is reversed at the end. */
  readonly reversed: boolean;
  /** Items from the upper end to the lower end, one per rank: real node, dummies, real node. */
  readonly chain: readonly number[];
}

/**
 * A proper layered graph: every edge segment spans exactly one rank. Items
 * `0..n-1` are the real nodes in local input order, dummies are appended after
 * them — integer indices rather than generated names, so nothing depends on a
 * counter that outlives the call.
 */
export interface LayeredGraph {
  readonly rank: readonly number[];
  readonly rankCount: number;
  /** Per item, its neighbours one rank up, in edge order (a parallel edge appears twice). */
  readonly up: readonly (readonly number[])[];
  /** Per item, its neighbours one rank down, in edge order. */
  readonly down: readonly (readonly number[])[];
  readonly edges: readonly LayeredEdge[];
}

/**
 * Stages 2–4 for one connected component: break cycles, rank, and give every
 * edge that spans k ranks its own chain of k − 1 zero-size dummies, so parallel
 * long edges stay apart instead of sharing one.
 */
export function layerGraph(count: number, edges: readonly ComponentEdge[]): LayeredGraph {
  const reversed = findBackEdges(count, edges);
  const upper = edges.map((edge, k) => (reversed[k] ? edge.to : edge.from));
  const lower = edges.map((edge, k) => (reversed[k] ? edge.from : edge.to));
  const rank = assignRanks(count, upper, lower);

  const up: number[][] = Array.from({ length: count }, () => []);
  const down: number[][] = Array.from({ length: count }, () => []);
  const layered = edges.map((edge, k): LayeredEdge => {
    const chain = [upper[k]];
    for (let r = rank[upper[k]] + 1; r < rank[lower[k]]; r++) {
      chain.push(rank.length);
      rank.push(r);
      up.push([]);
      down.push([]);
    }
    chain.push(lower[k]);
    for (let i = 1; i < chain.length; i++) {
      down[chain[i - 1]].push(chain[i]);
      up[chain[i]].push(chain[i - 1]);
    }
    return { slot: edge.slot, reversed: reversed[k], chain };
  });

  let rankCount = 0;
  for (const value of rank) rankCount = Math.max(rankCount, value + 1);
  return { rank, rankCount, up, down, edges: layered };
}
