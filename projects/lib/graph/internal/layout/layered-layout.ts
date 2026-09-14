/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { orderLayers } from './order';
import { layerCentres, placeItems } from './position';
import type { ItemExtents } from './position';
import { prepareGraph } from './prepare';
import type { GraphComponent, PreparedGraph } from './prepare';
import { layerGraph } from './rank';
import { loopReserve, routeEdges, routeLoops } from './route';
import { WrGraphLayout } from './types';
import type { WrGraphLayoutInput, WrGraphLayoutResult, WrGraphPoint } from './types';

interface Gaps {
  readonly nodeGap: number;
  readonly layerGap: number;
  readonly edgeGap: number;
  readonly componentGap: number;
}

/** One component in its own coordinates: top-left per local node, routes by result slot. */
interface ComponentDrawing {
  readonly left: readonly number[];
  readonly top: readonly number[];
  readonly routes: readonly { readonly slot: number; readonly points: readonly WrGraphPoint[] }[];
  readonly minX: number;
  readonly width: number;
  readonly height: number;
}

function drawComponent(graph: PreparedGraph, component: GraphComponent, gaps: Gaps): ComponentDrawing {
  const width = component.nodes.map(node => graph.nodes[node].width);
  const height = component.nodes.map(node => graph.nodes[node].height);
  const loops = width.map(() => 0);
  for (const loop of component.loops) loops[loop.from]++;

  const layered = layerGraph(width.length, component.edges);
  const layers = orderLayers(layered);
  const real = (item: number): boolean => item < width.length;
  const extents: ItemExtents = {
    left: layered.rank.map((_, item) => (real(item) ? width[item] / 2 : 0)),
    right: layered.rank.map((_, item) => (real(item) ? width[item] / 2 + loopReserve(loops[item], gaps.edgeGap) : 0)),
    halfGap: layered.rank.map((_, item) => (real(item) ? gaps.nodeGap : gaps.edgeGap) / 2),
    height: layered.rank.map((_, item) => (real(item) ? height[item] : 0)),
  };

  const x = placeItems(layers, layered, extents);
  const { centre, half, height: total } = layerCentres(layers, extents, gaps.layerGap);
  const geometry = { x, centreY: centre, halfBand: half, width, height };
  const edges = routeEdges(layered, geometry, gaps.edgeGap, gaps.edgeGap / 2);
  const selfLoops = routeLoops(component.loops, geometry, layered.rank, gaps.edgeGap);

  // Every route point lies horizontally within some item's box — ports and the
  // band points straight above or below them inside a node's width, bends on
  // dummies, loops inside the reserve — so the items alone bound it.
  let minX = x[0] - extents.left[0];
  let maxX = x[0] + extents.right[0];
  x.forEach((anchor, item) => {
    minX = Math.min(minX, anchor - extents.left[item]);
    maxX = Math.max(maxX, anchor + extents.right[item]);
  });

  return {
    left: width.map((w, node) => x[node] - extents.left[node]),
    top: height.map((h, node) => centre[layered.rank[node]] - h / 2),
    routes: [
      ...layered.edges.map((edge, k) => ({ slot: edge.slot, points: edges[k] })),
      ...component.loops.map((loop, k) => ({ slot: loop.slot, points: selfLoops[k] })),
    ],
    minX,
    width: maxX - minX,
    height: total,
  };
}

/** Options for {@link WrLayeredGraphLayout}. Spacing lives here, not on the component: the names are engine-specific. */
export interface WrLayeredGraphLayoutOptions {
  /** Horizontal gap between two nodes in one layer. Default `24`. */
  readonly nodeGap?: number;
  /** Vertical gap between two layers. Default `48`. */
  readonly layerGap?: number;
  /** Gap between an edge's bend and its neighbours, and between ports on one side. Default `12`. */
  readonly edgeGap?: number;
  /** Horizontal gap between two unconnected parts of the graph. Default `48`. */
  readonly componentGap?: number;
}

/**
 * The built-in layered layout: parents above children, pure TypeScript, no DOM
 * and no dependency, so it runs the same under prerender as in the browser.
 *
 * It is deliberately the light version of the pipeline: DFS cycle breaking,
 * source-based longest-path ranking with one tightening pass, barycenter sweeps
 * with a pairwise crossing count, and averaged forward/backward compaction for
 * coordinates. Network simplex and Brandes–Köpf would draw some graphs more
 * compactly at several times the code.
 *
 * Deterministic by construction rather than by luck: ids are turned into indices
 * in input order before anything else, every loop is capped by a count, every
 * comparator is total with an integer tie-break, and the arithmetic is limited
 * to operations the language specifies exactly — so the server and the browser
 * agree to the last bit. Nothing is kept between calls and the input is never
 * written to.
 */
export class WrLayeredGraphLayout extends WrGraphLayout {
  private readonly gaps: Gaps;

  constructor(options: WrLayeredGraphLayoutOptions = {}) {
    super();
    this.gaps = {
      nodeGap: options.nodeGap ?? 24,
      layerGap: options.layerGap ?? 48,
      edgeGap: options.edgeGap ?? 12,
      componentGap: options.componentGap ?? 48,
    };
  }

  /** Synchronous — a narrowing of the base signature, so a caller holding this class needs no `await`. */
  override layout(input: WrGraphLayoutInput): WrGraphLayoutResult {
    const graph = prepareGraph(input);
    const placed: WrGraphPoint[] = graph.nodes.map(() => ({ x: 0, y: 0 }));
    const routes: (readonly WrGraphPoint[])[] = graph.edges.map(() => []);
    let width = 0;
    let height = 0;

    // Components go in one row, top-aligned, in the order of their first node.
    // `+ 0` turns a negative zero into a positive one: the two compare equal with
    // `===` and unequal everywhere a result is compared structurally.
    graph.components.forEach((component, c) => {
      const drawing = drawComponent(graph, component, this.gaps);
      const offset = c === 0 ? 0 : width + this.gaps.componentGap;
      const shift = offset - drawing.minX;
      component.nodes.forEach((node, local) => {
        placed[node] = { x: drawing.left[local] + shift + 0, y: drawing.top[local] + 0 };
      });
      for (const { slot, points } of drawing.routes) {
        routes[slot] = points.map(point => ({ x: point.x + shift + 0, y: point.y + 0 }));
      }
      width = offset + drawing.width;
      height = Math.max(height, drawing.height);
    });

    return {
      nodes: graph.nodes.map((node, i) => ({ id: node.id, x: placed[i].x, y: placed[i].y })),
      edges: graph.edges.map((edge, slot) => ({ id: edge.id, points: routes[slot] })),
      width: width + 0,
      height: height + 0,
    };
  }
}
