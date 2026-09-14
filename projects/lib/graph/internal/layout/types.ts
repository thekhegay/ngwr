/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** A point in graph space: origin top-left, y grows downward. */
export interface WrGraphPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * What a layout reads about a node: resolved, plain and serialisable. The
 * consumer's `data` never reaches a layout, and neither does the DOM — sizes
 * arrive as finite numbers the component already resolved.
 */
export interface WrGraphLayoutNode {
  readonly id: string;
  readonly width: number;
  readonly height: number;
}

/** A layout edge. `from` is the parent, `to` the child; `id` is unique per edge. */
export interface WrGraphLayoutEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
}

/**
 * The whole graph a layout works on. Input order IS the tie-break order, so the
 * same arrays always produce the same picture. Parallel edges and self-loops
 * are legal here; an edge naming a missing node is dropped silently, because
 * the component has already warned about it.
 */
export interface WrGraphLayoutInput {
  readonly nodes: readonly WrGraphLayoutNode[];
  readonly edges: readonly WrGraphLayoutEdge[];
}

/**
 * Per-call context. An object from day one so later fields are additive. The
 * signal aborts when the input changes before an asynchronous layout settles —
 * an engine that cannot stop its work can still discard the result.
 */
export interface WrGraphLayoutContext {
  readonly signal: AbortSignal;
}

/** Where a node goes: its TOP-LEFT corner in graph space, which maps straight onto a CSS translate. */
export interface WrGraphNodePlacement {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/** The polyline of one edge, from the `from` end to the `to` end — at least two points. */
export interface WrGraphEdgeRoute {
  readonly id: string;
  readonly points: readonly WrGraphPoint[];
}

/**
 * A finished layout. The bounding box starts at (0, 0) and measures
 * `width` × `height`. Direction-free: RTL is applied after the layout, so these
 * numbers never depend on `dir`.
 */
export interface WrGraphLayoutResult {
  readonly nodes: readonly WrGraphNodePlacement[];
  readonly edges: readonly WrGraphEdgeRoute[];
  readonly width: number;
  readonly height: number;
}

/**
 * The seam a layout engine plugs into. Used as both the type and the DI token,
 * the way `WrDateAdapter` is.
 *
 * The return type admits a Promise from the first release, even though the
 * built-in engine is synchronous: an asynchronous engine (elk runs in a worker)
 * has to fit without a breaking change, and widening a synchronous return type
 * later would break every caller that reads the result directly.
 */
export abstract class WrGraphLayout {
  abstract layout(
    input: WrGraphLayoutInput,
    context: WrGraphLayoutContext
  ): WrGraphLayoutResult | Promise<WrGraphLayoutResult>;
}
