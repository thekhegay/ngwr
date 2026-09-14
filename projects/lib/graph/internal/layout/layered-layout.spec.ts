/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { describe, expect, it } from 'vitest';

import { WrLayeredGraphLayout } from './layered-layout';
import type { WrLayeredGraphLayoutOptions } from './layered-layout';
import { countCrossings } from './order';
import type { WrGraphLayoutEdge, WrGraphLayoutInput, WrGraphLayoutResult, WrGraphPoint } from './types';

/**
 * The layout as pure logic: no TestBed, no DOM. Most cases run one shared
 * battery of invariants over the result — every number finite and never `-0`,
 * no two nodes closer than their gap, parents above children, cycles broken only
 * inside a strongly connected component, endpoints on the right borders, every
 * sideways stretch of a route inside one inter-layer gap and every vertical one
 * clear of the nodes, and a bounding box that starts at the origin and holds
 * everything. Coordinates are compared with a tolerance only where the layout
 * itself does floating-point sums; identity and determinism are compared exactly.
 */

interface Gaps {
  readonly nodeGap: number;
  readonly layerGap: number;
}

interface Rect {
  readonly id: string;
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface Band {
  readonly top: number;
  readonly bottom: number;
}

const DEFAULT_GAPS: Gaps = { nodeGap: 24, layerGap: 48 };
const EPSILON = 1e-6;
/** The component's arrowhead: the last stretch of a drawn edge ends on a straight lead-in this long. */
const ARROW_SIZE = 6;

function graph(
  ids: readonly string[],
  edges: readonly (readonly [string, string])[],
  size: { readonly width: number; readonly height: number } = { width: 120, height: 40 }
): WrGraphLayoutInput {
  return {
    nodes: ids.map(id => ({ id, ...size })),
    edges: edges.map(([from, to], i) => ({ id: `e${i}`, from, to })),
  };
}

function run(input: WrGraphLayoutInput, options?: WrLayeredGraphLayoutOptions): WrGraphLayoutResult {
  return new WrLayeredGraphLayout(options).layout(input);
}

/** mulberry32 — a seeded PRNG, so the large fixture is the same graph on every machine. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    /* eslint-disable no-bitwise -- mulberry32 is defined in 32-bit integer arithmetic */
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    /* eslint-enable no-bitwise */
  };
}

function randomGraph(seed: number, nodeCount: number, edgeCount: number): WrGraphLayoutInput {
  const random = mulberry32(seed);
  const pick = (n: number): number => Math.floor(random() * n);
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `n${i}`,
    width: 64 + pick(96),
    height: 28 + pick(28),
  }));
  const edges: WrGraphLayoutEdge[] = [];
  for (let i = 0; i < edgeCount; i++) {
    // Every 50th edge repeats the one before it and every 97th is a self-loop,
    // so the large graph exercises parallel edges and loops, not only cycles.
    const previous = edges[edges.length - 1];
    const from = i % 50 === 49 ? previous.from : nodes[pick(nodeCount)].id;
    const to = i % 50 === 49 ? previous.to : i % 97 === 0 ? from : nodes[pick(nodeCount)].id;
    edges.push({ id: `e${i}`, from, to });
  }
  return { nodes, edges };
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Renames every id without changing any order — `'n0'` becomes a numeric string. */
function renameIds(input: WrGraphLayoutInput, rename: (id: string, index: number) => string): WrGraphLayoutInput {
  const names = new Map(input.nodes.map((node, i) => [node.id, rename(node.id, i)]));
  const name = (id: string): string => names.get(id) ?? `missing:${id}`;
  return {
    nodes: input.nodes.map(node => ({ ...node, id: name(node.id) })),
    edges: input.edges.map(edge => ({ ...edge, from: name(edge.from), to: name(edge.to) })),
  };
}

/** The result without its ids — what has to be identical when only the names change. */
function geometry(result: WrGraphLayoutResult): unknown {
  return {
    nodes: result.nodes.map(({ x, y }) => ({ x, y })),
    edges: result.edges.map(({ points }) => points),
    width: result.width,
    height: result.height,
  };
}

/** Tarjan's algorithm, as the oracle for which edges a cycle break may reverse. */
function stronglyConnected(ids: readonly string[], edges: readonly WrGraphLayoutEdge[]): Map<string, number> {
  const out = new Map<string, string[]>(ids.map(id => [id, []]));
  for (const edge of edges) out.get(edge.from)?.push(edge.to);
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const component = new Map<string, number>();
  const stack: string[] = [];
  let counter = 0;
  let components = 0;

  const visit = (node: string): void => {
    index.set(node, counter);
    low.set(node, counter);
    counter++;
    stack.push(node);
    for (const next of out.get(node) ?? []) {
      if (!index.has(next)) {
        visit(next);
        low.set(node, Math.min(low.get(node) ?? 0, low.get(next) ?? 0));
      } else if (!component.has(next)) {
        low.set(node, Math.min(low.get(node) ?? 0, index.get(next) ?? 0));
      }
    }
    if (low.get(node) === index.get(node)) {
      for (let member = stack.pop(); member !== undefined; member = stack.pop()) {
        component.set(member, components);
        if (member === node) break;
      }
      components++;
    }
  };
  for (const id of ids) if (!index.has(id)) visit(id);
  return component;
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPSILON;
}

function strictlyOutside(point: WrGraphPoint, rect: Rect): boolean {
  return point.x < rect.left || point.x > rect.right || point.y < rect.top || point.y > rect.bottom;
}

function onSide(point: WrGraphPoint, rect: Rect, side: 'top' | 'bottom'): boolean {
  return (
    near(point.y, side === 'top' ? rect.top : rect.bottom) &&
    point.x >= rect.left - EPSILON &&
    point.x <= rect.right + EPSILON
  );
}

function rectsOf(input: WrGraphLayoutInput, result: WrGraphLayoutResult): Map<string, Rect> {
  const sizes = new Map<string, { width: number; height: number }>();
  for (const node of input.nodes) if (!sizes.has(node.id)) sizes.set(node.id, node);
  const rects = new Map<string, Rect>();
  for (const { id, x, y } of result.nodes) {
    const size = sizes.get(id);
    if (!size) throw new Error(`the layout placed "${id}", which is not in the input`);
    rects.set(id, { id, left: x, top: y, right: x + size.width, bottom: y + size.height });
  }
  return rects;
}

function rect(rects: Map<string, Rect>, id: string): Rect {
  const found = rects.get(id);
  if (!found) throw new Error(`no placement for "${id}"`);
  return found;
}

/** True when an edge's route starts on the TOP of its `from` node — the cycle break turned it around. */
function isReversed(rects: Map<string, Rect>, edge: WrGraphLayoutEdge, result: WrGraphLayoutResult): boolean {
  const route = result.edges.find(candidate => candidate.id === edge.id);
  if (!route) throw new Error(`no route for "${edge.id}"`);
  return near(route.points[0].y, rect(rects, edge.from).top);
}

/** True when a point is inside a node's box, its border excluded. */
function strictlyInside(point: WrGraphPoint, box: Rect): boolean {
  return (
    point.x > box.left + EPSILON &&
    point.x < box.right - EPSILON &&
    point.y > box.top + EPSILON &&
    point.y < box.bottom - EPSILON
  );
}

/**
 * Per node id, the layer bands of its connected component, top to bottom. A
 * layer is the nodes sharing one centre, and its band runs from the top to the
 * bottom of the tallest of them — derived from the result alone, so the check
 * does not trust the layout's own idea of where a band is.
 */
function bandsOf(rects: Map<string, Rect>, edges: readonly WrGraphLayoutEdge[]): Map<string, Band[]> {
  const parent = new Map([...rects.keys()].map(id => [id, id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root) ?? root;
    return root;
  };
  for (const edge of edges) parent.set(find(edge.from), find(edge.to));

  const members = new Map<string, Rect[]>();
  for (const box of rects.values()) members.set(find(box.id), [...(members.get(find(box.id)) ?? []), box]);
  const bands = new Map<string, Band[]>();
  for (const boxes of members.values()) {
    const layers: Band[] = [];
    for (const box of boxes.slice().sort((a, b) => a.top + a.bottom - b.top - b.bottom)) {
      const previous = layers[layers.length - 1];
      if (previous && near(previous.top + previous.bottom, box.top + box.bottom)) {
        layers[layers.length - 1] = {
          top: Math.min(previous.top, box.top),
          bottom: Math.max(previous.bottom, box.bottom),
        };
      } else {
        layers.push({ top: box.top, bottom: box.bottom });
      }
    }
    for (const box of boxes) bands.set(box.id, layers);
  }
  return bands;
}

/**
 * Points along a route as the component draws it: every stretch one cubic with
 * both control points at the stretch's middle height, straight above or below
 * its own ends, and the last `ARROW_SIZE` pixels a straight lead-in.
 */
function drawnSamples(points: readonly WrGraphPoint[]): WrGraphPoint[] {
  const samples: WrGraphPoint[] = [];
  points.slice(1).forEach((to, i) => {
    const from = points[i];
    const lead = i === points.length - 2 ? Math.min(ARROW_SIZE, Math.abs(to.y - from.y) / 2) : 0;
    const toY = to.y < from.y ? to.y + lead : to.y - lead;
    const middle = (from.y + toY) / 2;
    for (let s = 0; s <= 16; s++) {
      const t = s / 16;
      const u = 1 - t;
      samples.push(
        {
          x: u * u * u * from.x + 3 * u * u * t * from.x + 3 * u * t * t * to.x + t * t * t * to.x,
          y: u * u * u * from.y + 3 * u * u * t * middle + 3 * u * t * t * middle + t * t * t * toY,
        },
        { x: to.x, y: toY + (to.y - toY) * t }
      );
    }
  });
  return samples;
}

/** No drawn line — self-loops aside, which have their own check — passes through the inside of any node. */
function expectNoLineThroughNodes(input: WrGraphLayoutInput, result: WrGraphLayoutResult): void {
  const boxes = [...rectsOf(input, result).values()];
  const ends = new Map(input.edges.map(edge => [edge.id, edge]));
  const hits = new Set<string>();
  for (const route of result.edges) {
    if (ends.get(route.id)?.from === ends.get(route.id)?.to) continue;
    for (const point of drawnSamples(route.points)) {
      for (const box of boxes) if (strictlyInside(point, box)) hits.add(`${route.id} through ${box.id}`);
    }
  }
  expect([...hits]).toEqual([]);
}

function geometricCrossings(result: WrGraphLayoutResult): number {
  const segments = result.edges.map(edge => edge.points);
  let crossings = 0;
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const [a0, a1] = segments[i];
      const [b0, b1] = segments[j];
      if (segments[i].length !== 2 || segments[j].length !== 2) continue;
      if (!near(a0.y, b0.y) || !near(a1.y, b1.y)) continue;
      if ((a0.x - b0.x) * (a1.x - b1.x) < 0) crossings++;
    }
  }
  return crossings;
}

function expectValidLayout(input: WrGraphLayoutInput, result: WrGraphLayoutResult, gaps: Gaps = DEFAULT_GAPS): void {
  // Validity: finite, and never a negative zero.
  const numbers = [
    result.width,
    result.height,
    ...result.nodes.flatMap(node => [node.x, node.y]),
    ...result.edges.flatMap(edge => edge.points.flatMap(point => [point.x, point.y])),
  ];
  expect(numbers.filter(value => !Number.isFinite(value) || Object.is(value, -0))).toEqual([]);

  // One placement per unique id, in input order.
  const uniqueIds = [...new Set(input.nodes.map(node => node.id))];
  expect(result.nodes.map(node => node.id)).toEqual(uniqueIds);
  const rects = rectsOf(input, result);
  const all = [...rects.values()];

  // No overlap, gaps included: two nodes are a nodeGap apart side by side or a layerGap apart vertically.
  const overlaps: string[] = [];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i];
      const b = all[j];
      const apart =
        a.right + gaps.nodeGap <= b.left + EPSILON ||
        b.right + gaps.nodeGap <= a.left + EPSILON ||
        a.bottom + gaps.layerGap <= b.top + EPSILON ||
        b.bottom + gaps.layerGap <= a.top + EPSILON;
      if (!apart) overlaps.push(`${a.id} / ${b.id}`);
    }
  }
  expect(overlaps).toEqual([]);

  // Edges: only those naming two placed nodes, in input order.
  const kept = input.edges.filter(edge => rects.has(edge.from) && rects.has(edge.to));
  expect(result.edges.map(edge => edge.id)).toEqual(kept.map(edge => edge.id));
  const scc = stronglyConnected(uniqueIds, kept);
  const acyclic = new Set(scc.values()).size === uniqueIds.length && kept.every(edge => edge.from !== edge.to);
  const bands = bandsOf(rects, kept);

  const problems: string[] = [];
  const routes = new Set<string>();
  result.edges.forEach((route, k) => {
    const edge = kept[k];
    const { points } = route;
    const from = rect(rects, edge.from);
    const to = rect(rects, edge.to);
    if (points.length < 2) problems.push(`${route.id}: fewer than two points`);
    const key = JSON.stringify(points);
    if (routes.has(key)) problems.push(`${route.id}: the same route as another edge`);
    routes.add(key);

    if (edge.from === edge.to) {
      for (const point of points) {
        if (!all.every(other => strictlyOutside(point, other))) problems.push(`${route.id}: loop point inside a node`);
      }
      return;
    }

    const first = points[0];
    const last = points[points.length - 1];
    const reversed = near(first.y, from.top);
    const fromCentre = (from.top + from.bottom) / 2;
    const toCentre = (to.top + to.bottom) / 2;
    if (reversed) {
      if (acyclic) problems.push(`${route.id}: reversed in an acyclic graph`);
      if (scc.get(edge.from) !== scc.get(edge.to)) problems.push(`${route.id}: reversed across two SCCs`);
      if (!onSide(first, from, 'top') || !onSide(last, to, 'bottom'))
        problems.push(`${route.id}: ends off the borders`);
      if (!(fromCentre > toCentre)) problems.push(`${route.id}: reversed but not drawn upward`);
    } else {
      if (!onSide(first, from, 'bottom') || !onSide(last, to, 'top'))
        problems.push(`${route.id}: ends off the borders`);
      if (!(toCentre > fromCentre)) problems.push(`${route.id}: child not below its parent`);
    }
    for (let i = 1; i < points.length; i++) {
      const step = points[i].y - points[i - 1].y;
      if (reversed ? step >= 0 : step <= 0) problems.push(`${route.id}: route doubles back`);
    }

    // The component bends a stretch between its ends at the stretch's middle
    // height, so a stretch may move sideways only across one inter-layer gap,
    // where no node lives. Anything else has to be vertical and clear of every node.
    const layers = bands.get(edge.from) ?? [];
    for (let i = 1; i < points.length; i++) {
      const [a, b] = [points[i - 1], points[i]];
      const [low, high] = [Math.min(a.y, b.y), Math.max(a.y, b.y)];
      if (near(a.x, b.x)) {
        const through = all.find(
          box =>
            a.x > box.left + EPSILON &&
            a.x < box.right - EPSILON &&
            Math.max(low, box.top) + EPSILON < Math.min(high, box.bottom)
        );
        if (through) problems.push(`${route.id}: runs straight through ${through.id}`);
      } else if (
        !layers.some(
          (band, r) =>
            r + 1 < layers.length &&
            band.bottom < layers[r + 1].top &&
            near(low, band.bottom) &&
            near(high, layers[r + 1].top)
        )
      ) {
        problems.push(`${route.id}: moves sideways outside an inter-layer gap`);
      }
    }
  });
  expect(problems).toEqual([]);

  // The bounding box starts at the origin and contains every node and every point.
  const xs = [...all.flatMap(r => [r.left, r.right]), ...result.edges.flatMap(e => e.points.map(p => p.x))];
  const ys = [...all.flatMap(r => [r.top, r.bottom]), ...result.edges.flatMap(e => e.points.map(p => p.y))];
  if (xs.length === 0) {
    expect([result.width, result.height]).toEqual([0, 0]);
    return;
  }
  expect(xs.reduce((a, b) => Math.min(a, b))).toBe(0);
  expect(ys.reduce((a, b) => Math.min(a, b))).toBe(0);
  expect(xs.reduce((a, b) => Math.max(a, b))).toBeLessThanOrEqual(result.width + EPSILON);
  expect(ys.reduce((a, b) => Math.max(a, b))).toBeLessThanOrEqual(result.height + EPSILON);
}

describe('WrLayeredGraphLayout', () => {
  describe('degenerate input', () => {
    it('lays out an empty graph as an empty box', () => {
      const input = graph([], []);
      const result = run(input);
      expect(result).toEqual({ nodes: [], edges: [], width: 0, height: 0 });
      expectValidLayout(input, result);
    });

    it('puts a single node at the origin and sizes the box to it', () => {
      const result = run(graph(['solo'], []));
      expect(result).toEqual({ nodes: [{ id: 'solo', x: 0, y: 0 }], edges: [], width: 120, height: 40 });
    });

    it('drops an edge naming a missing node and still routes the rest', () => {
      const input = graph(
        ['a', 'b'],
        [
          ['a', 'ghost'],
          ['a', 'b'],
          ['ghost', 'b'],
        ]
      );
      const result = run(input);
      expect(result.edges.map(edge => edge.id)).toEqual(['e1']);
      expectValidLayout(input, result);
    });

    it('keeps the first of two nodes sharing an id', () => {
      const input: WrGraphLayoutInput = {
        nodes: [
          { id: 'a', width: 120, height: 40 },
          { id: 'a', width: 300, height: 90 },
        ],
        edges: [],
      };
      expect(run(input)).toEqual({ nodes: [{ id: 'a', x: 0, y: 0 }], edges: [], width: 120, height: 40 });
    });
  });

  describe('ranking', () => {
    it('reverses nothing in an acyclic graph', () => {
      const input = graph(
        ['core', 'parser', 'printer', 'cli', 'docs'],
        [
          ['core', 'parser'],
          ['core', 'printer'],
          ['parser', 'cli'],
          ['printer', 'cli'],
          ['core', 'docs'],
        ]
      );
      const result = run(input);
      expectValidLayout(input, result);
      const rects = rectsOf(input, result);
      expect(input.edges.filter(edge => isReversed(rects, edge, result))).toEqual([]);
    });

    it('draws a child with two parents below both, between them', () => {
      const input = graph(
        ['lead-a', 'lead-b', 'team'],
        [
          ['lead-a', 'team'],
          ['lead-b', 'team'],
        ]
      );
      const result = run(input);
      expectValidLayout(input, result);
      const rects = rectsOf(input, result);
      const centre = (id: string): number => (rect(rects, id).left + rect(rects, id).right) / 2;
      expect(rect(rects, 'team').top).toBe(rect(rects, 'lead-a').bottom + 48);
      expect(rect(rects, 'team').top).toBe(rect(rects, 'lead-b').bottom + 48);
      expect(centre('team')).toBeGreaterThanOrEqual(Math.min(centre('lead-a'), centre('lead-b')));
      expect(centre('team')).toBeLessThanOrEqual(Math.max(centre('lead-a'), centre('lead-b')));
    });

    it('pulls a root down to just above its highest child', () => {
      // Longest path alone puts `late` on the top layer with a three-layer edge to `end`.
      const input = graph(
        ['root', 'one', 'two', 'end', 'late'],
        [
          ['root', 'one'],
          ['one', 'two'],
          ['two', 'end'],
          ['late', 'end'],
        ]
      );
      const result = run(input);
      expectValidLayout(input, result);
      const rects = rectsOf(input, result);
      expect(rect(rects, 'late').top).toBe(rect(rects, 'two').top);
      expect(result.edges[3].points).toHaveLength(2);
    });

    it('breaks a 2-cycle by reversing the later edge, inside one SCC', () => {
      const input = graph(
        ['a', 'b'],
        [
          ['a', 'b'],
          ['b', 'a'],
        ]
      );
      const result = run(input);
      expectValidLayout(input, result);
      const rects = rectsOf(input, result);
      expect(input.edges.map(edge => isReversed(rects, edge, result))).toEqual([false, true]);
    });

    it('breaks a longer cycle entered from a source', () => {
      const input = graph(
        ['a', 'b', 'c', 'entry'],
        [
          ['a', 'b'],
          ['b', 'c'],
          ['c', 'a'],
          ['entry', 'a'],
        ]
      );
      const result = run(input);
      expectValidLayout(input, result);
      const rects = rectsOf(input, result);
      expect(input.edges.map(edge => isReversed(rects, edge, result))).toEqual([false, false, true, false]);
    });
  });

  describe('edges', () => {
    it('gives parallel edges distinct routes, between adjacent layers and across them', () => {
      const input = graph(
        ['a', 'b', 'c'],
        [
          ['a', 'b'],
          ['a', 'b'],
          ['a', 'b'],
          ['b', 'c'],
          ['a', 'c'],
          ['a', 'c'],
        ]
      );
      const result = run(input);
      expectValidLayout(input, result);
      // Port, the top and bottom of b's band at the dummy's x, port.
      expect(result.edges[4].points).toHaveLength(4);
      expect(result.edges[5].points).toHaveLength(4);
    });

    it('spreads parallel edges over distinct ports on a node narrower than two insets', () => {
      const input = graph(
        ['a', 'b'],
        [
          ['a', 'b'],
          ['a', 'b'],
          ['a', 'b'],
        ],
        { width: 12, height: 40 }
      );
      const result = run(input);
      expectValidLayout(input, result);
      expect(new Set(result.edges.map(edge => edge.points[0].x)).size).toBe(3);
      expect(new Set(result.edges.map(edge => edge.points[edge.points.length - 1].x)).size).toBe(3);
    });

    it('keeps every drawn line out of the cards it does not connect', () => {
      // `a -> e` passes the layer of b, c and d. Bent at its dummy's centre, the
      // curve swept sideways at card height and ran under the cards beside it.
      const input = graph(
        ['a', 'b', 'c', 'd', 'e'],
        [
          ['b', 'e'],
          ['a', 'e'],
          ['d', 'e'],
          ['c', 'e'],
          ['a', 'd'],
        ],
        { width: 160, height: 48 }
      );
      const result = run(input);
      expectValidLayout(input, result);
      expectNoLineThroughNodes(input, result);
    });

    it('keeps a long edge an edge gap from its neighbours, not a node gap', () => {
      const gaps = { nodeGap: 40, layerGap: 48, edgeGap: 20, componentGap: 48 };
      const input = graph(
        ['a', 'b', 'c'],
        [
          ['a', 'b'],
          ['b', 'c'],
          ['a', 'c'],
          ['a', 'c'],
        ]
      );
      const result = run(input, gaps);
      expectValidLayout(input, result, gaps);
      const b = rect(rectsOf(input, result), 'b');
      // Everything in b's layer wants to sit under `a`, so the layer packs tight:
      // each dummy's x is where its route crosses the top of b's band.
      const bends = [2, 3].map(k => result.edges[k].points.find(point => near(point.y, b.top))?.x ?? NaN);
      expect(bends[1] - bends[0]).toBeCloseTo(20, 6);
      expect(bends[0] - b.right).toBeCloseTo(40 / 2 + 20 / 2, 6);
    });

    it('draws self-loops outside their node without crowding a neighbour', () => {
      const input = graph(
        ['a', 'b', 'c'],
        [
          ['a', 'a'],
          ['a', 'b'],
          ['a', 'c'],
          ['b', 'b'],
          ['b', 'b'],
        ]
      );
      const result = run(input);
      expectValidLayout(input, result);
      const rects = rectsOf(input, result);
      for (const k of [0, 3, 4]) {
        const node = rect(rects, input.edges[k].from);
        for (const point of result.edges[k].points) expect(point.x).toBeGreaterThan(node.right);
      }
    });

    it('nests several self-loops on one node strictly outward', () => {
      const input = graph(
        ['a', 'b'],
        [
          ['a', 'b'],
          ['b', 'b'],
          ['b', 'b'],
          ['b', 'b'],
        ]
      );
      const result = run(input);
      expectValidLayout(input, result);
      const outer = [1, 2, 3].map(k => Math.max(...result.edges[k].points.map(point => point.x)));
      expect(outer[0]).toBeLessThan(outer[1]);
      expect(outer[1]).toBeLessThan(outer[2]);
    });

    it('grows the bounding box to hold a self-loop on the rightmost node', () => {
      const input = graph(
        ['a', 'b', 'c'],
        [
          ['a', 'b'],
          ['a', 'c'],
          ['c', 'c'],
        ]
      );
      const result = run(input);
      expectValidLayout(input, result);
      const rects = rectsOf(input, result);
      const c = rect(rects, 'c');
      expect(c.right).toBe(Math.max(...[...rects.values()].map(box => box.right)));
      expect(Math.max(...result.edges[2].points.map(point => point.x))).toBeGreaterThan(c.right);
    });

    it('draws a tree without a single crossing', () => {
      const random = mulberry32(7);
      const ids = Array.from({ length: 60 }, (_, i) => `unit-${i}`);
      const edges = ids.slice(1).map((id, i) => [ids[Math.floor(random() * (i + 1))], id] as const);
      // Scramble the input order so the picture cannot lean on it.
      const shuffled = ids.map((id, i) => ids[(i * 37) % ids.length]);
      const input = graph(shuffled, edges);
      const result = run(input);
      expectValidLayout(input, result);
      expect(geometricCrossings(result)).toBe(0);
    });

    it('sweeps away a crossing the initial order leaves behind', () => {
      // Depth-first from `hub` places `shared` before `own`, so `side -> shared`
      // crosses `hub -> own` until a sweep swaps the two.
      const input = graph(
        ['hub', 'side', 'shared', 'own'],
        [
          ['hub', 'shared'],
          ['hub', 'own'],
          ['side', 'shared'],
        ]
      );
      const result = run(input);
      expectValidLayout(input, result);
      expect(geometricCrossings(result)).toBe(0);
    });
  });

  describe('crossing count', () => {
    const complete = (m: number, n: number): { layers: number[][]; down: number[][] } => {
      const top = Array.from({ length: m }, (_, i) => i);
      const bottom = Array.from({ length: n }, (_, i) => m + i);
      return { layers: [top, bottom], down: [...top.map(() => bottom), ...bottom.map(() => [])] };
    };
    const choose2 = (k: number): number => (k * (k - 1)) / 2;

    it.each([
      [2, 2],
      [3, 3],
      [3, 4],
      [4, 5],
      [1, 6],
    ])('counts C(m,2)·C(n,2) crossings for K(%i,%i) in any order', (m, n) => {
      const { layers, down } = complete(m, n);
      expect(countCrossings(layers, down)).toBe(choose2(m) * choose2(n));
      expect(countCrossings([layers[0], layers[1].slice().reverse()], down)).toBe(choose2(m) * choose2(n));
    });

    it('does not count segments that share an end', () => {
      expect(countCrossings([[0], [1, 2]], [[1, 2], [], []])).toBe(0);
      expect(
        countCrossings(
          [
            [0, 1],
            [2, 3],
          ],
          [[3], [2], [], []]
        )
      ).toBe(1);
      expect(
        countCrossings(
          [
            [0, 1],
            [2, 3],
          ],
          [[2], [3], [], []]
        )
      ).toBe(0);
    });
  });

  describe('components', () => {
    it('packs unconnected parts in one top-aligned row, in the order of their first node', () => {
      const input = graph(
        ['a', 'x', 'b', 'y', 'lonely'],
        [
          ['a', 'b'],
          ['x', 'y'],
        ]
      );
      const result = run(input);
      expectValidLayout(input, result);
      const rects = rectsOf(input, result);
      expect(['a', 'x', 'lonely'].map(id => rect(rects, id).top)).toEqual([0, 0, 0]);
      expect(rect(rects, 'x').left).toBe(rect(rects, 'a').right + 48);
      expect(rect(rects, 'lonely').left).toBe(rect(rects, 'x').right + 48);
      expect(result.width).toBe(rect(rects, 'lonely').right);
    });
  });

  describe('options', () => {
    it('honours custom gaps', () => {
      const gaps = { nodeGap: 40, layerGap: 80, edgeGap: 20, componentGap: 100 };
      const input = graph(
        ['p', 'c1', 'c2', 'c3', 'island'],
        [
          ['p', 'c1'],
          ['p', 'c2'],
          ['p', 'c3'],
        ]
      );
      const result = run(input, gaps);
      expectValidLayout(input, result, gaps);
      const rects = rectsOf(input, result);
      expect(rect(rects, 'c1').top).toBe(rect(rects, 'p').bottom + 80);
      expect(rect(rects, 'c2').left).toBe(rect(rects, 'c1').right + 40);
      expect(rect(rects, 'island').left).toBe(rect(rects, 'c3').right + 100);
    });
  });

  describe('purity and determinism', () => {
    const fixture = graph(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'],
      [
        ['a', 'c'],
        ['b', 'c'],
        ['c', 'd'],
        ['c', 'e'],
        ['e', 'a'],
        ['b', 'f'],
        ['f', 'g'],
        ['g', 'g'],
        ['a', 'h'],
        ['h', 'e'],
        ['h', 'e'],
        ['i', 'j'],
        ['k', 'k'],
      ]
    );

    it('never writes to a deep-frozen input', () => {
      const frozen = deepFreeze(structuredClone(fixture));
      expect(() => run(frozen)).not.toThrow();
      expect(run(frozen)).toEqual(run(fixture));
    });

    it('returns equal results for two calls and for a structured clone', () => {
      const layout = new WrLayeredGraphLayout();
      expect(layout.layout(fixture)).toEqual(layout.layout(fixture));
      expect(run(structuredClone(fixture))).toEqual(run(fixture));
    });

    it('gives identical geometry after an order-preserving rename to numeric ids', () => {
      // A plain object keyed by id would enumerate '2' before '10'.
      const numeric = ['10', '2', '33', '4', '1', '0', '9', '100', '7', '21', '3'];
      const renamed = renameIds(fixture, (_, i) => numeric[i]);
      expect(geometry(run(renamed))).toEqual(geometry(run(fixture)));
    });
  });

  describe('a seeded graph of 200 nodes and 400 edges', () => {
    const input = randomGraph(20260913, 200, 400);

    it('passes every invariant', () => {
      expectValidLayout(input, run(input));
    });

    it('draws no line through a card it does not connect', () => {
      expectNoLineThroughNodes(input, run(input));
    });

    it('is deterministic across calls, clones, freezing and renames', () => {
      const result = run(input);
      expect(run(input)).toEqual(result);
      expect(run(deepFreeze(structuredClone(input)))).toEqual(result);
      const renamed = renameIds(input, (_, i) => String((i * 919) % 1000));
      expect(geometry(run(renamed))).toEqual(geometry(result));
    });
  });
});
