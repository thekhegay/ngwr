/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  LOCALE_ID,
  ViewEncapsulation,
  computed,
  contentChild,
  effect,
  inject,
  input,
  isDevMode,
} from '@angular/core';

import { WrI18n, useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { numAttr } from 'ngwr/utils';

import { WrGraphNodeTemplate } from './graph-node-template';
import type { WrGraphEdge, WrGraphNode } from './interfaces';
import { WrLayeredGraphLayout } from './internal/layout/layered-layout';
import { WrGraphLayout } from './internal/layout/types';
import type { WrGraphLayoutInput, WrGraphLayoutResult, WrGraphPoint } from './internal/layout/types';

/** What a size falls back to when neither the node nor the graph supplies a usable one. */
const DEFAULT_NODE_WIDTH = 160;
const DEFAULT_NODE_HEIGHT = 48;

/**
 * The arrowhead's size in pixels, and the length of the straight lead-in under it.
 * A fixed user-space size rather than a multiple of the stroke, so a thinner or
 * thicker `--wr-graph-edge-width` never shrinks the arrow off its lead-in.
 */
const ARROW_SIZE = 6;

/**
 * Instance counter for the arrowhead marker id. Several graphs share one page
 * under `ViewEncapsulation.None`, so the id has to be per instance — and
 * counted rather than `randomId()`, so the prerendered id is the one the
 * browser renders again.
 */
let graphUid = 0;

/** A node the component keeps: the consumer's object, where it came in, and its resolved size. */
interface PreparedNode<TData> {
  readonly node: WrGraphNode<TData>;
  readonly index: number;
  readonly width: number;
  readonly height: number;
}

/** A kept edge. `id` is `e${inputIndex}`, so it never shifts when an earlier edge is dropped. */
interface PreparedEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
}

/** The inputs, cleaned: everything the layout reads, plus what dev mode reports. */
interface PreparedGraph<TData> {
  readonly nodes: readonly PreparedNode<TData>[];
  readonly edges: readonly PreparedEdge[];
  readonly input: WrGraphLayoutInput;
  readonly duplicates: readonly string[];
  readonly dangling: readonly string[];
  readonly badSizes: readonly string[];
}

/** A placed node in layout coordinates, before any mirroring. */
interface PlacedNode<TData> extends PreparedNode<TData> {
  readonly x: number;
  readonly y: number;
}

/** The finished layout joined back to the consumer's data, nodes in READING order. */
interface PlacedGraph<TData> {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly PlacedNode<TData>[];
  readonly edges: readonly { readonly edge: PreparedEdge; readonly points: readonly WrGraphPoint[] }[];
}

interface DrawnNode<TData> {
  readonly node: WrGraphNode<TData>;
  readonly width: number;
  readonly height: number;
  readonly transform: string;
}

interface DrawnEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly d: string;
}

/** What the template binds: physical pixels, already mirrored for RTL. */
interface GraphView<TData> {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly DrawnNode<TData>[];
  readonly edges: readonly DrawnEdge[];
}

function isSize(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as { then?: unknown }).then === 'function';
}

/** Two decimals are below anything a screen can show, and keep a 5 000-bend path short. `+ 0` drops a `-0`. */
function px(value: number): number {
  return Math.round(value * 100) / 100 + 0;
}

function prepare<TData>(
  nodes: readonly WrGraphNode<TData>[],
  edges: readonly WrGraphEdge[],
  nodeWidth: number,
  nodeHeight: number
): PreparedGraph<TData> {
  // A `Map` built in input order, never an object keyed by id: an object lists
  // index-like keys (`'2'`, `'10'`) first, so the order would depend on the ids.
  const kept = new Map<string, PreparedNode<TData>>();
  const duplicates: string[] = [];
  const badSizes: string[] = [];
  nodes.forEach((node, index) => {
    if (kept.has(node.id)) {
      duplicates.push(node.id);
      return;
    }
    if ((node.width != null && !isSize(node.width)) || (node.height != null && !isSize(node.height))) {
      badSizes.push(node.id);
    }
    kept.set(node.id, {
      node,
      index,
      width: isSize(node.width) ? node.width : nodeWidth,
      height: isSize(node.height) ? node.height : nodeHeight,
    });
  });

  const keptEdges: PreparedEdge[] = [];
  const dangling: string[] = [];
  edges.forEach((edge, index) => {
    if (kept.has(edge.from) && kept.has(edge.to)) keptEdges.push({ id: `e${index}`, from: edge.from, to: edge.to });
    else dangling.push(`#${index} (from "${edge.from}" to "${edge.to}")`);
  });

  const list = [...kept.values()];
  return {
    nodes: list,
    edges: keptEdges,
    input: { nodes: list.map(({ node, width, height }) => ({ id: node.id, width, height })), edges: keptEdges },
    duplicates,
    dangling,
    badSizes,
  };
}

/**
 * Names joined the way the locale joins a list, or the way `'en'` does when the
 * runtime has no list data for that locale — never the host default.
 *
 * `new Intl.ListFormat('zz')` does not throw: a well-formed tag the runtime
 * cannot serve silently resolves to whatever locale the machine runs in, which
 * is one thing on the prerendering server and another in the browser. So the
 * support is asked first, and only a malformed tag reaches the `catch`
 * (`supportedLocalesOf` throws a `RangeError` for it).
 */
function listFormat(locale: string): Intl.ListFormat {
  try {
    if (Intl.ListFormat.supportedLocalesOf(locale).length) return new Intl.ListFormat(locale, { type: 'conjunction' });
  } catch {
    // Not a valid language tag at all; handled by the fallback below.
  }
  return new Intl.ListFormat('en', { type: 'conjunction' });
}

function warn(message: string): void {
  // eslint-disable-next-line no-console -- dev-mode validation
  console.warn(`[NGWR] <wr-graph>: ${message}`);
}

/** What a layout returned that the component cannot draw faithfully. */
function layoutProblems(graph: PreparedGraph<unknown>, result: WrGraphLayoutResult): string[] {
  const problems: string[] = [];
  const placed = new Set(result.nodes.map(node => node.id));
  const unplaced = graph.nodes.filter(({ node }) => !placed.has(node.id)).map(({ node }) => `"${node.id}"`);
  if (unplaced.length) problems.push(`no position for ${unplaced.join(', ')}`);

  const numbers = [
    result.width,
    result.height,
    ...result.nodes.flatMap(node => [node.x, node.y]),
    ...result.edges.flatMap(edge => edge.points.flatMap(point => [point.x, point.y])),
  ];
  if (!numbers.every(Number.isFinite)) problems.push('a coordinate or the size is not a finite number');
  return problems;
}

/**
 * A graph of blocks joined by parent-child links, laid out in layers from top to
 * bottom. Display only: nothing is selectable, and the graph scrolls inside its
 * own viewport rather than the page.
 *
 * The layout runs in a `computed` with no DOM and no measuring, so the sizes are
 * the consumer's: `nodeWidth` / `nodeHeight` for every node, or `width` /
 * `height` on one. A prerender therefore ships the finished picture.
 *
 * What the lines show is also written out: every node carries visually hidden
 * text naming its parents and children, and the lines themselves are hidden
 * from assistive technology.
 *
 * @example
 * ```html
 * <wr-graph [nodes]="nodes" [edges]="edges" ariaLabel="Team structure" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/graph
 */
@Component({
  selector: 'wr-graph',
  templateUrl: './graph.html',
  imports: [NgTemplateOutlet],
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-graph',
  },
})
export class WrGraph<TData = unknown> {
  /**
   * The nodes, in any order. Input order breaks layout ties, so the same arrays
   * always produce the same picture. Never mutated.
   *
   * @default []
   */
  readonly nodes = input<readonly WrGraphNode<TData>[]>([]);

  /**
   * Parent-child links, `from` the parent and `to` the child. Never mutated.
   *
   * @default []
   */
  readonly edges = input<readonly WrGraphEdge[]>([]);

  /**
   * Width in pixels of a node that sets none of its own.
   *
   * @default 160
   */
  readonly nodeWidth = input(160, { transform: numAttr(160) });

  /**
   * Height in pixels of a node that sets none of its own.
   *
   * @default 48
   */
  readonly nodeHeight = input(48, { transform: numAttr(48) });

  /** Accessible name of the scrolling viewport. Falls back to `graph.label`, then `'Graph'`. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly label = useI18nText(this.ariaLabel, 'graph.label', 'Graph');
  // Each value is a whole sentence, terminator included, so the punctuation is the
  // catalog's to choose — `。` in Japanese, `।` in Hindi.
  private readonly parentsText = useI18nFormatter('graph.parents', 'Parents: {{names}}.');
  private readonly childrenText = useI18nFormatter('graph.children', 'Children: {{names}}.');

  protected readonly nodeTemplate = contentChild(WrGraphNodeTemplate);

  /** `url(#…)` for every edge's `marker-end`. */
  protected readonly markerId = `wr-graph-${graphUid++}-arrow`;
  protected readonly markerUrl = `url(#${this.markerId})`;
  protected readonly arrowSize = ARROW_SIZE;

  private readonly engine: WrGraphLayout = inject(WrGraphLayout, { optional: true }) ?? new WrLayeredGraphLayout();
  // Optional on purpose: `Directionality` is root-provided, so a consumer never has
  // to supply it — and a bare `TestBed` does not either.
  private readonly dir = inject(Directionality, { optional: true });
  private readonly i18n = inject(WrI18n, { optional: true });
  private readonly localeId = inject(LOCALE_ID);

  private readonly isRtl = computed(() => this.dir?.valueSignal() === 'rtl');
  private readonly locale = computed(() => this.i18n?.locale() ?? this.localeId);

  /**
   * The size of a node that sets none of its own. Each dimension falls back on its
   * own, and the dev warning reads this same value, so it cannot name a size the
   * layout did not use.
   */
  private readonly defaultSize = computed(() => {
    const width = this.nodeWidth();
    const height = this.nodeHeight();
    return {
      width: isSize(width) ? width : DEFAULT_NODE_WIDTH,
      height: isSize(height) ? height : DEFAULT_NODE_HEIGHT,
    };
  });

  private readonly prepared = computed(() => {
    const { width, height } = this.defaultSize();
    return prepare(this.nodes(), this.edges(), width, height);
  });

  /** The engine's answer, as returned. A fresh signal per run: nothing aborts a synchronous layout. */
  private readonly raw = computed(() =>
    this.engine.layout(this.prepared().input, { signal: new AbortController().signal })
  );

  /**
   * The drawable result. An asynchronous layout is declared by the interface and
   * not supported by this release: a thenable draws nothing, and dev mode says so.
   */
  private readonly result = computed(() => {
    const raw = this.raw();
    return isThenable(raw) ? null : raw;
  });

  /** Layout joined to the nodes and edges, direction-free, nodes in reading order. */
  private readonly placed = computed((): PlacedGraph<TData> => {
    const graph = this.prepared();
    const result = this.result();
    if (!result) return { width: 0, height: 0, nodes: [], edges: [] };

    const positions = new Map(result.nodes.map(placement => [placement.id, placement]));
    const nodes = graph.nodes.flatMap(prepared => {
      const at = positions.get(prepared.node.id);
      return at ? [{ ...prepared, x: at.x, y: at.y }] : [];
    });
    // Reading order is layer, then inline position. A layer centres nodes of
    // different heights on one line, so the layer is the vertical CENTRE, taken to
    // two decimals so float noise cannot split one layer in two.
    const layer = (node: PlacedNode<TData>): number => Math.round((node.y + node.height / 2) * 100);
    nodes.sort((a, b) => layer(a) - layer(b) || a.x - b.x || a.index - b.index);

    const routes = new Map(result.edges.map(route => [route.id, route.points]));
    const edges = graph.edges.flatMap(edge => {
      const points = routes.get(edge.id);
      return points && points.length >= 2 ? [{ edge, points }] : [];
    });

    return { width: result.width, height: result.height, nodes, edges };
  });

  /**
   * Physical pixels. Mirrored here rather than in CSS so nodes and lines get the
   * same numbers and cannot drift apart — and kept apart from the layout so a
   * direction change does not lay the graph out again.
   */
  protected readonly view = computed((): GraphView<TData> => {
    const { width, height, nodes, edges } = this.placed();
    const rtl = this.isRtl();
    const x = (value: number, size = 0): number => px(rtl ? width - value - size : value);
    const at = (point: WrGraphPoint): string => `${x(point.x)} ${px(point.y)}`;

    // A route as a smooth path. Every stretch between two route points is one cubic
    // Bézier with both control points at the stretch's middle height, so a line
    // leaves a parent vertically and runs through a bend without a corner — a
    // reversed edge too, whose stretches simply climb.
    //
    // The last `ARROW_SIZE` pixels are a straight lead-in. A marker takes its angle
    // from the tangent at the very end, but it covers several pixels of line, and on
    // a curve those already point elsewhere — the line came out of the side of the
    // arrowhead. On a straight piece the triangle and the line agree. A self-loop is
    // one cubic out to its reserved side with the same lead-in coming back level.
    //
    // Only `+`, `-`, `/`, `abs`, `min` and `max`, so the server and the browser
    // write the same numbers.
    const curve = (points: readonly WrGraphPoint[], loop: boolean): string => {
      const start = points[0];
      const end = points[points.length - 1];
      if (loop) {
        const right = Math.max(...points.map(point => point.x));
        const lead = Math.min(ARROW_SIZE, (right - end.x) / 2);
        const outer = x(right);
        return `M${at(start)} C${outer} ${px(start.y)} ${outer} ${px(end.y)} ${x(end.x + lead)} ${px(end.y)} L${at(end)}`;
      }
      const stretches = points.slice(1).map((to, i) => {
        const from = points[i];
        const last = i === points.length - 2;
        const lead = last ? Math.min(ARROW_SIZE, Math.abs(to.y - from.y) / 2) : 0;
        const toY = to.y < from.y ? to.y + lead : to.y - lead;
        const middle = px((from.y + toY) / 2);
        const bend = `C${x(from.x)} ${middle} ${x(to.x)} ${middle} ${x(to.x)} ${px(toY)}`;
        return last ? `${bend} L${at(to)}` : bend;
      });
      return [`M${at(start)}`, ...stretches].join(' ');
    };

    return {
      width: px(width),
      height: px(height),
      nodes: nodes.map(placed => ({
        node: placed.node,
        width: placed.width,
        height: placed.height,
        transform: `translate(${x(placed.x, placed.width)}px, ${px(placed.y)}px)`,
      })),
      edges: edges.map(({ edge, points }) => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        d: curve(points, edge.from === edge.to),
      })),
    };
  });

  /**
   * The visually hidden sentence per node id: its parents, then its children, as
   * name lists. Never a count — the catalogs have no plural forms. A neighbour
   * linked by several edges is named once, and names follow reading order.
   */
  protected readonly relations = computed(() => {
    const { nodes } = this.placed();
    const list = listFormat(this.locale());
    const order = new Map(nodes.map((placed, i) => [placed.node.id, i]));
    const parents = new Map<string, Set<string>>();
    const children = new Map<string, Set<string>>();
    const link = (map: Map<string, Set<string>>, id: string, neighbour: string): void => {
      const set = map.get(id) ?? new Set<string>();
      set.add(neighbour);
      map.set(id, set);
    };
    for (const { from, to } of this.prepared().edges) {
      if (!order.has(from) || !order.has(to)) continue;
      link(parents, to, from);
      link(children, from, to);
    }

    const names = (ids: Set<string> | undefined): string | null => {
      if (!ids?.size) return null;
      const sorted = [...ids].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
      return list.format(sorted.map(id => nodes[order.get(id) ?? 0].node.label));
    };

    const text = new Map<string, string>();
    for (const { node } of nodes) {
      const sentences: string[] = [];
      const parentNames = names(parents.get(node.id));
      const childNames = names(children.get(node.id));
      if (parentNames) sentences.push(this.parentsText({ names: parentNames }));
      if (childNames) sentences.push(this.childrenText({ names: childNames }));
      // Every mark of punctuation comes from the catalog. The one character the
      // component adds is the space between two sentences — a word boundary to a
      // screen reader, and silent in a script that sets none.
      if (sentences.length) text.set(node.id, sentences.join(' '));
    }
    return text;
  });

  constructor() {
    if (isDevMode()) {
      effect(() => {
        const graph = this.prepared();
        const raw = this.raw();
        if (graph.duplicates.length) {
          warn(
            `node id(s) ${graph.duplicates.map(id => `"${id}"`).join(', ')} appear more than once. ` +
              `The first occurrence of each is drawn and the rest are skipped.`
          );
        }
        if (graph.dangling.length) {
          warn(`edge(s) ${graph.dangling.join(', ')} name a node that does not exist and were skipped.`);
        }
        if (graph.badSizes.length) {
          warn(
            `node(s) ${graph.badSizes.map(id => `"${id}"`).join(', ')} have a width or height that is not a ` +
              `positive finite number, so nodeWidth / nodeHeight is used instead.`
          );
        }
        const width = this.nodeWidth();
        const height = this.nodeHeight();
        const invalid = [
          ...(isSize(width) ? [] : [`nodeWidth (${String(width)})`]),
          ...(isSize(height) ? [] : [`nodeHeight (${String(height)})`]),
        ];
        if (invalid.length) {
          const used = this.defaultSize();
          warn(
            `${invalid.join(' and ')} must be a positive finite number, so a node with no size of its own is ` +
              `drawn ${used.width} × ${used.height}.`
          );
        }
        if (isThenable(raw)) {
          warn(
            'the provided WrGraphLayout returned a Promise. Asynchronous layouts are not supported in this ' +
              'release, so nothing is drawn.'
          );
          return;
        }
        const problems = layoutProblems(graph, raw);
        if (problems.length) warn(`the layout result cannot be drawn faithfully: ${problems.join('; ')}.`);
      });
    }
  }
}
