/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { ComponentEdge } from './prepare';
import type { LayeredGraph } from './rank';
import type { WrGraphPoint } from './types';

/** Room between a node's right border and the ends of its self-loops, where the arrowhead lands. */
const LOOP_CLEARANCE = 4;

interface Port {
  readonly edge: number;
  /** The item at the other end of the first or last segment — a dummy or a node. */
  readonly toward: number;
}

/**
 * Spreads k ports along one side of each node, ordered by where each edge
 * heads next so that ports on one side never cross each other; ties go to the
 * earlier edge. Without the spread, parallel edges between adjacent layers
 * would draw as one line. The inset shrinks to a quarter of the width on a
 * narrow node, so any node wider than zero keeps half its side for the spread
 * instead of stacking every port on its centre.
 */
function assignPorts(
  sides: readonly (readonly Port[])[],
  geometry: RouteGeometry,
  portGap: number,
  inset: number,
  into: number[]
): void {
  sides.forEach((ports, node) => {
    const sorted = ports.slice().sort((a, b) => {
      const ax = geometry.x[a.toward];
      const bx = geometry.x[b.toward];
      return ax < bx ? -1 : ax > bx ? 1 : a.edge - b.edge;
    });
    const room = geometry.width[node] - 2 * Math.min(inset, geometry.width[node] / 4);
    const spread = Math.max(0, Math.min(room, (sorted.length - 1) * portGap));
    const step = sorted.length > 1 ? spread / (sorted.length - 1) : 0;
    sorted.forEach((port, j) => (into[port.edge] = geometry.x[node] - spread / 2 + j * step));
  });
}

/** Everything routing reads: anchors per item, centres and band half-heights per rank, real sizes per node. */
export interface RouteGeometry {
  readonly x: readonly number[];
  readonly centreY: readonly number[];
  /** Half of each rank's tallest node: the rank's band spans `centreY ± halfBand`. */
  readonly halfBand: readonly number[];
  readonly width: readonly number[];
  readonly height: readonly number[];
}

/** How far right a node's layout box grows to hold its self-loops. */
export function loopReserve(loops: number, step: number): number {
  return loops === 0 ? 0 : LOOP_CLEARANCE + loops * step;
}

/**
 * Stage 8. Out of the bottom side, through each dummy, into the top side — as
 * vertical stretches inside the layer bands joined by exactly one stretch per
 * inter-layer gap: straight down from the port to the bottom of its node's band,
 * straight through every intermediate band at the dummy's x (a point on the
 * band's top and one on its bottom), and straight down from the top of the
 * child's band to its port.
 *
 * Why bands and not a bend at each dummy's centre: the component draws a
 * stretch as a cubic whose control points sit at the stretch's middle height,
 * so a stretch that ended inside a band swept sideways at card height and cut
 * straight through whatever unrelated card stood between its ends. Now every
 * stretch that moves sideways starts and ends on the two boundaries of one gap,
 * so its y never leaves the gap, where no node lives; and every vertical one
 * keeps the x of a port (inside its own node's width) or of a dummy (half an
 * edge gap plus half a node gap clear of any neighbour).
 *
 * A reversed edge is routed the way the layout sees it and then turned around,
 * so its points still start at the real parent: it leaves the parent's top and
 * enters the child's bottom, which is itself the visual cue that the edge
 * closes a cycle.
 */
export function routeEdges(
  graph: LayeredGraph,
  geometry: RouteGeometry,
  portGap: number,
  inset: number
): WrGraphPoint[][] {
  const outgoing: Port[][] = geometry.width.map(() => []);
  const incoming: Port[][] = geometry.width.map(() => []);
  graph.edges.forEach(({ chain }, edge) => {
    outgoing[chain[0]].push({ edge, toward: chain[1] });
    incoming[chain[chain.length - 1]].push({ edge, toward: chain[chain.length - 2] });
  });
  const start = graph.edges.map(() => 0);
  const end = graph.edges.map(() => 0);
  assignPorts(outgoing, geometry, portGap, inset, start);
  assignPorts(incoming, geometry, portGap, inset, end);

  const centre = (item: number): number => geometry.centreY[graph.rank[item]];
  const half = (item: number): number => geometry.halfBand[graph.rank[item]];
  return graph.edges.map(({ chain, reversed }, edge) => {
    const upper = chain[0];
    const lower = chain[chain.length - 1];
    const points: WrGraphPoint[] = [];
    // A node as tall as its band, or a band with no height, would repeat a point.
    const add = (x: number, y: number): void => {
      const last = points[points.length - 1];
      if (last?.x !== x || last.y !== y) points.push({ x, y });
    };
    add(start[edge], centre(upper) + geometry.height[upper] / 2);
    add(start[edge], centre(upper) + half(upper));
    for (let i = 1; i < chain.length - 1; i++) {
      add(geometry.x[chain[i]], centre(chain[i]) - half(chain[i]));
      add(geometry.x[chain[i]], centre(chain[i]) + half(chain[i]));
    }
    add(end[edge], centre(lower) - half(lower));
    add(end[edge], centre(lower) - geometry.height[lower] / 2);
    return reversed ? points.reverse() : points;
  });
}

/**
 * Self-loops as fixed rectangles beside the node's right side, nested outward
 * one `step` apart, each a little taller than the one inside it. Every point is
 * strictly outside the node, and the space is already reserved in the node's
 * layout box, so a loop can never run into a neighbour. The side is a layout
 * side: under RTL the whole drawing mirrors, loop included.
 */
export function routeLoops(
  loops: readonly ComponentEdge[],
  geometry: RouteGeometry,
  rank: readonly number[],
  step: number
): WrGraphPoint[][] {
  const total = geometry.width.map(() => 0);
  for (const loop of loops) total[loop.from]++;
  const drawn = geometry.width.map(() => 0);

  return loops.map(({ from }) => {
    const nth = drawn[from]++;
    const inner = geometry.x[from] + geometry.width[from] / 2 + LOOP_CLEARANCE;
    const outer = inner + (nth + 1) * step;
    const centre = geometry.centreY[rank[from]];
    const reach = ((geometry.height[from] / 2) * (nth + 1)) / (total[from] + 1);
    return [
      { x: inner, y: centre - reach },
      { x: outer, y: centre - reach },
      { x: outer, y: centre + reach },
      { x: inner, y: centre + reach },
    ];
  });
}
