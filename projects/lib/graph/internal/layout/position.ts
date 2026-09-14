/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { LayeredGraph } from './rank';

/** Four down passes and four up passes, alternating, ending on up so parents settle over their children. */
const COORDINATE_PASSES = 8;

function separation(extents: ItemExtents, a: number, b: number): number {
  return extents.right[a] + extents.halfGap[a] + extents.halfGap[b] + extents.left[b];
}

/**
 * Moves one layer toward the mean x of each item's neighbours on the reference
 * layer, without reordering it and without letting two items come closer than
 * their separation.
 *
 * Why the result never overlaps: F is built left to right as
 * `F[i] = max(desired[i], F[i-1] + sep[i])`, so `F[i] - F[i-1] >= sep[i]`; B is
 * built right to left as `B[i] = min(desired[i], B[i+1] - sep[i+1])`, so
 * `B[i+1] - B[i] >= sep[i+1]`. Both are feasible on their own, and the average
 * of two feasible placements is feasible, because
 * `(F[i] + B[i]) / 2 - (F[i-1] + B[i-1]) / 2` is half of a sum of two terms that
 * are each at least `sep[i]`. That holds whatever the desired positions are,
 * which is why no pass needs to repair a previous one. Averaging the two is also
 * what keeps a crowded layer centred on what it wants instead of piled to one
 * side.
 */
function align(layer: readonly number[], neighbours: LayeredGraph['up'], x: number[], extents: ItemExtents): void {
  const desired = layer.map(item => {
    const adjacent = neighbours[item];
    if (adjacent.length === 0) return x[item];
    let sum = 0;
    for (const other of adjacent) sum += x[other];
    return sum / adjacent.length;
  });
  const forward = desired.slice();
  for (let i = 1; i < layer.length; i++) {
    forward[i] = Math.max(desired[i], forward[i - 1] + separation(extents, layer[i - 1], layer[i]));
  }
  const backward = desired.slice();
  for (let i = layer.length - 2; i >= 0; i--) {
    backward[i] = Math.min(desired[i], backward[i + 1] - separation(extents, layer[i], layer[i + 1]));
  }
  layer.forEach((item, i) => (x[item] = (forward[i] + backward[i]) / 2));
}

/**
 * Per item, the room it needs around its anchor x. The two sides differ for a
 * node with a self-loop, whose right side also holds the loop.
 */
export interface ItemExtents {
  readonly left: readonly number[];
  readonly right: readonly number[];
  /** Half the gap the item keeps to a neighbour: half of `nodeGap` for a node, half of `edgeGap` for a dummy. */
  readonly halfGap: readonly number[];
  /** What the item contributes to its layer's height — zero for a dummy. */
  readonly height: readonly number[];
}

/** Stage 6, horizontal: the anchor x of every item, starting packed and relaxing toward neighbours. */
export function placeItems(
  layers: readonly (readonly number[])[],
  graph: LayeredGraph,
  extents: ItemExtents
): number[] {
  const x: number[] = graph.rank.map(() => 0);
  for (const layer of layers) {
    layer.forEach((item, i) => {
      x[item] = i === 0 ? extents.left[item] : x[layer[i - 1]] + separation(extents, layer[i - 1], item);
    });
  }
  for (let pass = 0; pass < COORDINATE_PASSES; pass++) {
    if (pass % 2 === 0) {
      for (let r = 1; r < layers.length; r++) align(layers[r], graph.up, x, extents);
    } else {
      for (let r = layers.length - 2; r >= 0; r--) align(layers[r], graph.down, x, extents);
    }
  }
  return x;
}

/**
 * Stage 6, vertical: a layer is as tall as its tallest node, layers are
 * `layerGap` apart, and every item is centred in its layer — so a short node
 * beside a tall one still lines up with it. The layer's band is
 * `centre ± half`, written the way a node's border is (`centre ± height / 2`),
 * so the tallest node's border and the band's edge are the same number.
 */
export function layerCentres(
  layers: readonly (readonly number[])[],
  extents: ItemExtents,
  layerGap: number
): { readonly centre: readonly number[]; readonly half: readonly number[]; readonly height: number } {
  const centre: number[] = [];
  const half: number[] = [];
  let top = 0;
  layers.forEach((layer, r) => {
    let tallest = 0;
    for (const item of layer) tallest = Math.max(tallest, extents.height[item]);
    if (r > 0) top += layerGap;
    half.push(tallest / 2);
    centre.push(top + tallest / 2);
    top += tallest;
  });
  return { centre, half, height: top };
}
