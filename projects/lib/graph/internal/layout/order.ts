/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { LayeredGraph } from './rank';

/** Gansner's cap. Counted in sweeps, never in time, so a slow machine draws the same picture. */
const MAX_SWEEPS = 24;
const MAX_STALE_SWEEPS = 4;

interface Candidate {
  readonly item: number;
  readonly sum: number;
  readonly count: number;
  readonly slot: number;
}

/**
 * Depth-first from every item in rank order, placing each item as it is first
 * reached. A tree comes out with no crossings before a single sweep runs, and
 * the sweeps only ever keep a strictly better order, so a tree stays that way.
 */
function initialOrder(graph: LayeredGraph): number[][] {
  const layers: number[][] = Array.from({ length: graph.rankCount }, () => []);
  const byRank: number[][] = Array.from({ length: graph.rankCount }, () => []);
  graph.rank.forEach((rank, item) => byRank[rank].push(item));
  const visited = graph.rank.map(() => false);

  for (const bucket of byRank) {
    for (const start of bucket) {
      const stack = [start];
      for (let item = stack.pop(); item !== undefined; item = stack.pop()) {
        if (visited[item]) continue;
        visited[item] = true;
        layers[graph.rank[item]].push(item);
        // Pushed in reverse so the first child is visited first, as a recursive DFS would.
        const below = graph.down[item];
        for (let i = below.length - 1; i >= 0; i--) if (!visited[below[i]]) stack.push(below[i]);
      }
    }
  }
  return layers;
}

/**
 * Re-sorts one layer by the barycenter of each item's neighbours on the
 * reference layer. Items with no such neighbour are lifted out BEFORE the sort
 * and keep their slot: a comparator asked to rank "no barycenter" against a
 * number has no consistent answer, and an inconsistent comparator sorts
 * differently in different engines.
 *
 * Barycenters are compared exactly. They are means of integer slot indices, so
 * `sumA / countA < sumB / countB` becomes `sumA * countB < sumB * countA`, which
 * stays in exact integer arithmetic at any size this component draws. Ties fall
 * back to the current slot, so the comparator is total.
 */
function reorder(layer: number[], neighbours: LayeredGraph['up'], slotOf: number[]): void {
  const candidates: Candidate[] = [];
  layer.forEach((item, slot) => {
    const adjacent = neighbours[item];
    if (adjacent.length === 0) return;
    let sum = 0;
    for (const other of adjacent) sum += slotOf[other];
    candidates.push({ item, sum, count: adjacent.length, slot });
  });
  const slots = candidates.map(candidate => candidate.slot);
  candidates.sort((a, b) => a.sum * b.count - b.sum * a.count || a.slot - b.slot);
  candidates.forEach((candidate, k) => {
    layer[slots[k]] = candidate.item;
    slotOf[candidate.item] = slots[k];
  });
}

/**
 * Crossings between adjacent layers, counted pairwise. Quadratic in the
 * segments between one pair of layers, which at the few hundred edges this
 * component is meant for is cheaper to trust than an accumulator tree.
 * Two segments sharing an end never count: their product is zero.
 */
export function countCrossings(layers: readonly (readonly number[])[], down: readonly (readonly number[])[]): number {
  const slotOf: number[] = down.map(() => 0);
  for (const layer of layers) layer.forEach((item, slot) => (slotOf[item] = slot));

  let crossings = 0;
  for (let r = 0; r + 1 < layers.length; r++) {
    const top: number[] = [];
    const bottom: number[] = [];
    for (const item of layers[r]) {
      for (const next of down[item]) {
        top.push(slotOf[item]);
        bottom.push(slotOf[next]);
      }
    }
    for (let i = 0; i < top.length; i++) {
      for (let j = i + 1; j < top.length; j++) {
        if ((top[i] - top[j]) * (bottom[i] - bottom[j]) < 0) crossings++;
      }
    }
  }
  return crossings;
}

/**
 * Stage 5. Alternating down and up barycenter sweeps, keeping the best order
 * seen. "Best" moves only on a strict improvement, so an equally good later
 * order never displaces an earlier one.
 */
export function orderLayers(graph: LayeredGraph): number[][] {
  const layers = initialOrder(graph);
  const slotOf: number[] = graph.rank.map(() => 0);
  for (const layer of layers) layer.forEach((item, slot) => (slotOf[item] = slot));

  let best = layers.map(layer => layer.slice());
  let fewest = countCrossings(layers, graph.down);
  for (let sweep = 0, stale = 0; sweep < MAX_SWEEPS && stale < MAX_STALE_SWEEPS && fewest > 0; sweep++) {
    if (sweep % 2 === 0) {
      for (let r = 1; r < layers.length; r++) reorder(layers[r], graph.up, slotOf);
    } else {
      for (let r = layers.length - 2; r >= 0; r--) reorder(layers[r], graph.down, slotOf);
    }
    const crossings = countCrossings(layers, graph.down);
    if (crossings < fewest) {
      fewest = crossings;
      best = layers.map(layer => layer.slice());
      stale = 0;
    } else {
      stale++;
    }
  }
  return best;
}
