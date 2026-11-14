/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  type ElementRef,
  LOCALE_ID,
  PLATFORM_ID,
  type Signal,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  contentChild,
  effect,
  inject,
  input,
  isDevMode,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { WrI18n, useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { WrPlatform } from 'ngwr/platform';
import { wrNumAttr, wrCheckStyles } from 'ngwr/utils';

import { WrGraphNodeTemplate } from './graph-node-template';
import { WrLayeredGraphLayout } from './internal/layout/layered-layout';
import { WrGraphLayout } from './internal/layout/types';
import type { WrGraphLayoutInput, WrGraphLayoutResult, WrGraphPoint } from './internal/layout/types';
import {
  type GraphFrame,
  type GraphTransform,
  IDENTITY,
  clampPan,
  clampZoom,
  fitTransform,
  zoomAround,
} from './internal/view';
import type { WrGraphEdge, WrGraphNode } from './types';

/** What a size falls back to when neither the node nor the graph supplies a usable one. */
const DEFAULT_NODE_WIDTH = 160;
const DEFAULT_NODE_HEIGHT = 48;

/**
 * The arrowhead's size in pixels, and the length of the straight lead-in under it.
 * A fixed user-space size rather than a multiple of the stroke, so a thinner or
 * thicker `--wr-graph-edge-width` never shrinks the arrow off its lead-in.
 */
const ARROW_SIZE = 6;

const DEFAULT_MIN_ZOOM = 0.25;
const DEFAULT_MAX_ZOOM = 4;
/** One press of a zoom button or key. */
const ZOOM_STEP = 1.25;
/** One press of an arrow key, in pixels. */
const PAN_STEP = 40;
/** How far a pointer travels before a press becomes a drag, so a click on a node stays a click. */
const DRAG_THRESHOLD = 3;
/** Zoom per wheel pixel, as an exponent, and the most one wheel event may count for. */
const WHEEL_RATE = 0.01;
const WHEEL_MAX = 24;
/** Pixels in one line of a wheel that reports lines. */
const WHEEL_LINE = 16;

/**
 * What a press must not start a pan on: anything that takes a click or focus of
 * its own inside a node. The viewport matches too, and is told apart at the call.
 */
const INTERACTIVE =
  'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable], [draggable="true"]';

/**
 * Instance counter for the arrowhead marker id. Several graphs share one page
 * under `ViewEncapsulation.None`, so the id has to be per instance — and
 * counted rather than `wrRandomId()`, so the prerendered id is the one the
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

/** One call to the engine: the graph it was given, its answer as returned, and what aborts it. */
interface LayoutRun<TData> {
  readonly graph: PreparedGraph<TData>;
  readonly raw: WrGraphLayoutResult | PromiseLike<WrGraphLayoutResult>;
  readonly controller: AbortController;
}

/** An asynchronous run that settled, and its result: `null` for a rejection. */
interface SettledRun<TData> {
  readonly run: LayoutRun<TData>;
  readonly result: WrGraphLayoutResult | null;
}

/**
 * A result with the graph it was computed for. The two travel together, so the
 * picture left on screen while a newer layout is pending is whole: its own
 * nodes, its own edges, its own sentences.
 */
interface Drawing<TData> {
  readonly graph: PreparedGraph<TData>;
  readonly result: WrGraphLayoutResult;
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

/** The viewport as measured: its box on screen, and where the stage starts inside it. */
interface MeasuredFrame extends GraphFrame {
  readonly left: number;
  readonly top: number;
}

const NO_FRAME: MeasuredFrame = { left: 0, top: 0, width: 0, height: 0, originX: 0, originY: 0 };

function sameTransform(a: GraphTransform, b: GraphTransform): boolean {
  return a.x === b.x && a.y === b.y && a.k === b.k;
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

function warn(message: string, ...detail: unknown[]): void {
  // eslint-disable-next-line no-console -- dev-mode validation
  console.warn(`[NGWR] <wr-graph>: ${message}`, ...detail);
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
 * own viewport rather than the page. With `zoomable` the viewport zooms and pans
 * instead of scrolling.
 *
 * The layout runs in a `computed` with no DOM and no measuring, so the sizes are
 * the consumer's: `nodeWidth` / `nodeHeight` for every node, or `width` /
 * `height` on one. A prerender therefore ships the finished picture.
 *
 * A provided `WrGraphLayout` may answer with a Promise. The last picture stays
 * on screen until it resolves, `layoutPending` is true meanwhile, and a newer
 * run or the graph's destruction aborts it through the `AbortSignal` it was
 * given. The server does not wait for it: a prerender ships an empty, pending
 * graph and the browser draws it.
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
    '[class.wr-graph--pending]': 'layoutPending()',
    '[class.wr-graph--zoomable]': 'zoomable()',
    '[class.wr-graph--panning]': 'panning()',
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
  readonly nodeWidth = input(160, { transform: wrNumAttr(160) });

  /**
   * Height in pixels of a node that sets none of its own.
   *
   * @default 48
   */
  readonly nodeHeight = input(48, { transform: wrNumAttr(48) });

  /** Accessible name of the scrolling viewport. Falls back to `graph.label`, then `'Graph'`. */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Lets the viewport zoom and pan instead of scrolling: `Ctrl` or `⌘` with the
   * wheel, a pinch, a drag on the field, the keyboard and three buttons. The
   * drawing is fitted on first draw and whenever the layout changes its size,
   * until the view is moved by hand. A touch drag on the graph then pans it
   * rather than scrolling the page.
   *
   * @default false
   */
  readonly zoomable = input(false, { transform: booleanAttribute });

  /**
   * Lets a plain wheel zoom, with no modifier key. The page then no longer
   * scrolls while the pointer is over the graph.
   *
   * @default false
   */
  readonly wheelZoom = input(false, { transform: booleanAttribute });

  /**
   * The zoom, where `1` is 100%. Two-way: it follows every gesture, and a value
   * written to it zooms around the middle of the viewport, kept inside
   * `minZoom` and `maxZoom`. Ignored unless `zoomable`.
   *
   * @default 1
   */
  readonly zoom = model(1);

  /**
   * The smallest zoom.
   *
   * @default 0.25
   */
  readonly minZoom = input(DEFAULT_MIN_ZOOM, { transform: wrNumAttr(DEFAULT_MIN_ZOOM) });

  /**
   * The largest zoom. Never below `minZoom`.
   *
   * @default 4
   */
  readonly maxZoom = input(DEFAULT_MAX_ZOOM, { transform: wrNumAttr(DEFAULT_MAX_ZOOM) });

  /** Accessible name of the zoom-in button. Falls back to `graph.zoomIn`, then `'Zoom in'`. */
  readonly zoomInLabel = input<string | null>(null);

  /** Accessible name of the zoom-out button. Falls back to `graph.zoomOut`, then `'Zoom out'`. */
  readonly zoomOutLabel = input<string | null>(null);

  /** Accessible name of the fit button. Falls back to `graph.fit`, then `'Fit to view'`. */
  readonly fitLabel = input<string | null>(null);

  /**
   * An asynchronous layout rejected. Carries the rejection as thrown. The last
   * picture stays on screen, and a run that was aborted never reports here.
   */
  readonly layoutError = output<unknown>();

  protected readonly label = useI18nText(this.ariaLabel, 'graph.label', 'Graph');
  // Each value is a whole sentence, terminator included, so the punctuation is the
  // catalog's to choose — `。` in Japanese, `।` in Hindi.
  private readonly parentsText = useI18nFormatter('graph.parents', 'Parents: {{names}}.');
  private readonly childrenText = useI18nFormatter('graph.children', 'Children: {{names}}.');

  protected readonly zoomInText = useI18nText(this.zoomInLabel, 'graph.zoomIn', 'Zoom in');
  protected readonly zoomOutText = useI18nText(this.zoomOutLabel, 'graph.zoomOut', 'Zoom out');
  protected readonly fitText = useI18nText(this.fitLabel, 'graph.fit', 'Fit to view');

  protected readonly nodeTemplate = contentChild(WrGraphNodeTemplate);
  private readonly viewportRef = viewChild<ElementRef<HTMLElement>>('viewport');
  private readonly stageRef = viewChild<ElementRef<HTMLElement>>('stage');

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
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly reducedMotion = inject(WrPlatform).prefersReducedMotion;

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

  /** One run per cleaned input. A controller of its own, so aborting a run never touches another. */
  private readonly run = computed((): LayoutRun<TData> => {
    const graph = this.prepared();
    const controller = new AbortController();
    return { graph, controller, raw: this.engine.layout(graph.input, { signal: controller.signal }) };
  });

  /** The asynchronous run that last settled. */
  private readonly settled = signal<SettledRun<TData> | null>(null);

  /**
   * What is drawn. A synchronous answer is drawn in the pass that computed it. A
   * Promise keeps the previous drawing until it resolves, and a rejected one
   * keeps it for good.
   */
  private readonly drawing = linkedSignal<
    { readonly run: LayoutRun<TData>; readonly settled: SettledRun<TData> | null },
    Drawing<TData> | null
  >({
    source: () => ({ run: this.run(), settled: this.settled() }),
    computation: ({ run, settled }, previous) => {
      if (!isThenable(run.raw)) return { graph: run.graph, result: run.raw };
      if (settled?.run === run && settled.result) return { graph: run.graph, result: settled.result };
      return previous?.value ?? null;
    },
  });

  /**
   * Whether an asynchronous layout is running for the current inputs. The host
   * carries `wr-graph--pending` and the viewport `aria-busy` while it is. Always
   * `false` with a synchronous layout.
   */
  readonly layoutPending = computed(() => {
    const run = this.run();
    return isThenable(run.raw) && this.settled()?.run !== run;
  });

  /** Layout joined to the nodes and edges, direction-free, nodes in reading order. */
  private readonly placed = computed((): PlacedGraph<TData> => {
    const drawing = this.drawing();
    if (!drawing) return { width: 0, height: 0, nodes: [], edges: [] };
    const { graph, result } = drawing;

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

  /** The zoom bounds, cleaned: a positive minimum, and a maximum never under it. */
  private readonly bounds = computed(() => {
    const min = isSize(this.minZoom()) ? this.minZoom() : DEFAULT_MIN_ZOOM;
    const max = isSize(this.maxZoom()) ? this.maxZoom() : DEFAULT_MAX_ZOOM;
    return { min, max: Math.max(min, max) };
  });

  /** Where the drawing is. The one write per frame that moves it. */
  private readonly at = signal<GraphTransform>(IDENTITY);

  /**
   * How far the drawing sits from its natural place, in pixels. Moves with every
   * pan and with a zoom around a point. `{ x: 0, y: 0 }` until the view is fitted
   * or moved.
   */
  readonly pan: Signal<WrGraphPoint> = computed(
    () => {
      const { x, y } = this.at();
      return { x, y };
    },
    { equal: (a, b) => a.x === b.x && a.y === b.y }
  );

  /** The size of the drawing, which a fit answers to. Equal sizes are one value. */
  private readonly size = computed(
    () => {
      const { width, height } = this.view();
      return { width, height };
    },
    { equal: (a, b) => a.width === b.width && a.height === b.height }
  );

  /** One `transform` on the stage. Absent at 100% in its natural place, which is also what a prerender ships. */
  protected readonly stageTransform = computed(() => {
    const at = this.at();
    if (!this.zoomable() || sameTransform(at, IDENTITY)) return null;
    return `translate(${px(at.x)}px, ${px(at.y)}px) scale(${at.k})`;
  });

  protected readonly atMinZoom = computed(() => this.at().k <= this.bounds().min);
  protected readonly atMaxZoom = computed(() => this.at().k >= this.bounds().max);

  /** A drag or a pinch is under way: the host carries `wr-graph--panning`. */
  protected readonly panning = signal(false);
  /** The move in flight came from a button or a key, so the stage eases to it. */
  protected readonly animated = signal(false);

  /** The view was moved by hand, so a new layout no longer fits it. */
  private moved = false;
  /** Pointer and wheel moves wait here for the next frame. */
  private queued: GraphTransform | null = null;
  private frameId: number | null = null;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private dragging = false;

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
    for (const { from, to } of this.drawing()?.graph.edges ?? []) {
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
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('graph');
    // Settles each asynchronous run. The cleanup runs when the inputs change and
    // when the graph is destroyed, so either one aborts the run in flight, and a
    // result that lands after it is dropped.
    effect(onCleanup => {
      const run = this.run();
      const { raw } = run;
      if (!isThenable(raw)) return;
      const { signal: aborted } = run.controller;
      onCleanup(() => run.controller.abort());
      raw.then(
        result => {
          if (!aborted.aborted) this.settled.set({ run, result });
        },
        (error: unknown) => {
          if (aborted.aborted) return;
          this.settled.set({ run, result: null });
          if (isDevMode()) warn('the layout rejected, so the last drawn result stays.', error);
          this.layoutError.emit(error);
        }
      );
    });

    // A zoom written from outside. The component's own moves write `zoom` and the
    // transform together, so they read as equal here and pass through.
    effect(() => {
      const zoom = this.zoom();
      const { min, max } = this.bounds();
      if (!this.zoomable()) return;
      untracked(() => {
        const from = this.current();
        const k = clampZoom(zoom, min, max);
        if (k !== from.k) {
          const frame = this.frame();
          this.moved = true;
          this.commit(this.bounded(zoomAround(from, k, frame.width / 2, frame.height / 2, frame), frame));
        } else if (k !== zoom) {
          this.zoom.set(k);
        }
      });
    });

    // Wheel, pointers and keys, bound by hand: only in a browser and only while
    // `zoomable`, so a graph that does not zoom carries no wheel listener to
    // hold up the page's scrolling.
    effect(onCleanup => {
      const viewport = this.viewportRef()?.nativeElement;
      if (!this.isBrowser || !viewport || !this.zoomable()) return;
      const controller = new AbortController();
      const { signal: stop } = controller;
      viewport.addEventListener('wheel', event => this.onWheel(event), { signal: stop, passive: false });
      viewport.addEventListener('keydown', event => this.onKeydown(event), { signal: stop });
      viewport.addEventListener('pointerdown', event => this.onPointerDown(event, viewport), { signal: stop });
      viewport.addEventListener('pointermove', event => this.onPointerMove(event, viewport), { signal: stop });
      viewport.addEventListener('pointerup', event => this.onPointerEnd(event, viewport), { signal: stop });
      viewport.addEventListener('pointercancel', event => this.onPointerEnd(event, viewport), { signal: stop });
      onCleanup(() => {
        controller.abort();
        this.pointers.clear();
        this.dragging = false;
        untracked(() => this.panning.set(false));
      });
    });

    // Fits the first drawing and every one of another size, the result of an
    // asynchronous layout included. Once the view was moved by hand it is kept,
    // and only pulled back if the new drawing would leave it empty.
    afterRenderEffect(() => {
      this.size();
      if (!this.zoomable()) return;
      untracked(() => this.settle());
    });

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const viewport = this.viewportRef()?.nativeElement;
      if (!viewport || typeof ResizeObserver === 'undefined') return;
      // A viewport that was hidden or resized: the fit is for the box it has now.
      const observer = new ResizeObserver(() => {
        if (this.zoomable()) this.settle();
      });
      observer.observe(viewport);
      destroyRef.onDestroy(() => observer.disconnect());
    });
    destroyRef.onDestroy(() => this.cancelFrame());

    if (isDevMode()) {
      effect(() => {
        const graph = this.prepared();
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
      });
      effect(() => {
        const drawing = this.drawing();
        const problems = drawing ? layoutProblems(drawing.graph, drawing.result) : [];
        if (problems.length) warn(`the layout result cannot be drawn faithfully: ${problems.join('; ')}.`);
      });
    }
  }

  /**
   * Shows the whole drawing, centred, at the largest zoom that fits and never
   * above 100%. The view follows the layout again afterwards: a result of
   * another size is fitted too. Does nothing unless `zoomable`.
   */
  fit(): void {
    this.fitView(false);
  }

  /**
   * Puts the drawing back in its natural place at 100%. Counts as moving the
   * view, so a later layout does not fit it. Does nothing unless `zoomable`.
   */
  resetView(): void {
    if (!this.zoomable()) return;
    this.moved = true;
    this.commit(IDENTITY);
  }

  protected zoomIn(): void {
    this.zoomBy(ZOOM_STEP);
  }

  protected zoomOut(): void {
    this.zoomBy(1 / ZOOM_STEP);
  }

  protected fitView(animate: boolean): void {
    if (!this.zoomable()) return;
    this.moved = false;
    const fitted = this.fitted();
    if (fitted) this.commit(fitted, animate);
  }

  /** The viewport's box and where the stage starts in it. All zeros before the first render and on the server. */
  private frame(): MeasuredFrame {
    const viewport = this.viewportRef()?.nativeElement;
    const stage = this.stageRef()?.nativeElement;
    if (!this.isBrowser || !viewport || !stage) return NO_FRAME;
    const rect = viewport.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      // `offsetLeft` ignores the transform, and is where a stage wider than the
      // viewport starts under RTL: left of it.
      originX: viewport.clientLeft + stage.offsetLeft,
      originY: viewport.clientTop + stage.offsetTop,
    };
  }

  /** The fitted transform, or `null` while there is nothing to fit or no box to fit it in. */
  private fitted(): GraphTransform | null {
    const viewport = this.viewportRef()?.nativeElement;
    const frame = this.frame();
    const { width, height } = this.size();
    if (!viewport || !frame.width || !frame.height || !width || !height) return null;
    const style = getComputedStyle(viewport);
    const inset = (value: string): number => Number.parseFloat(value) || 0;
    const { min, max } = this.bounds();
    return fitTransform(
      frame,
      {
        top: inset(style.paddingTop),
        right: inset(style.paddingRight),
        bottom: inset(style.paddingBottom),
        left: inset(style.paddingLeft),
      },
      width,
      height,
      min,
      max
    );
  }

  /** After a new drawing or a new box: fit it, or keep a view moved by hand within reach. */
  private settle(): void {
    if (!this.moved) {
      const fitted = this.fitted();
      if (fitted) this.commit(fitted);
      return;
    }
    this.commit(this.bounded(this.current(), this.frame()));
  }

  /** The transform the next frame will show. */
  private current(): GraphTransform {
    return this.queued ?? this.at();
  }

  private bounded(at: GraphTransform, frame: GraphFrame): GraphTransform {
    const { width, height } = this.size();
    return clampPan(at, frame, width, height);
  }

  private commit(next: GraphTransform, animate = false): void {
    this.cancelFrame();
    if (sameTransform(next, this.at())) return;
    this.animated.set(animate && !this.reducedMotion());
    this.at.set(next);
    this.zoom.set(next.k);
  }

  /** A move from a pointer or the wheel: many may arrive in one frame, and one is drawn. */
  private schedule(next: GraphTransform): void {
    if (sameTransform(next, this.current())) return;
    this.moved = true;
    this.queued = next;
    this.frameId ??= requestAnimationFrame(() => {
      this.frameId = null;
      const queued = this.queued;
      if (queued) this.commit(queued);
    });
  }

  private cancelFrame(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.queued = null;
  }

  /** A step from a button or a key, around the middle of the viewport. */
  private zoomBy(factor: number): void {
    const frame = this.frame();
    const from = this.current();
    const { min, max } = this.bounds();
    const k = clampZoom(from.k * factor, min, max);
    if (k === from.k) return;
    this.moved = true;
    this.commit(this.bounded(zoomAround(from, k, frame.width / 2, frame.height / 2, frame), frame), true);
  }

  private panBy(dx: number, dy: number): void {
    const from = this.current();
    const next = this.bounded({ k: from.k, x: from.x + dx, y: from.y + dy }, this.frame());
    if (sameTransform(next, from)) return;
    this.moved = true;
    this.commit(next, true);
  }

  private onWheel(event: WheelEvent): void {
    if (!event.ctrlKey && !event.metaKey && !this.wheelZoom()) return;
    // Taken even at a bound, or the browser would zoom the page instead.
    event.preventDefault();
    const frame = this.frame();
    const unit = event.deltaMode === 1 ? WHEEL_LINE : event.deltaMode === 2 ? frame.height : 1;
    const delta = Math.min(WHEEL_MAX, Math.max(-WHEEL_MAX, event.deltaY * unit));
    const from = this.current();
    const { min, max } = this.bounds();
    const k = clampZoom(from.k * Math.exp(-delta * WHEEL_RATE), min, max);
    if (k === from.k) return;
    this.schedule(
      this.bounded(zoomAround(from, k, event.clientX - frame.left, event.clientY - frame.top, frame), frame)
    );
  }

  private onKeydown(event: KeyboardEvent): void {
    // Only the viewport's own keys: a field inside a node keeps its arrows, and
    // `Ctrl` with `+` stays the browser's.
    if (event.target !== event.currentTarget || event.ctrlKey || event.metaKey || event.altKey) return;
    // An arrow moves the view, as it scrolls a page: the drawing goes the other
    // way, and left is left under RTL too.
    switch (event.key) {
      case '+':
      case '=':
        this.zoomIn();
        break;
      case '-':
      case '_':
        this.zoomOut();
        break;
      case '0':
        this.fitView(true);
        break;
      case 'ArrowLeft':
        this.panBy(PAN_STEP, 0);
        break;
      case 'ArrowRight':
        this.panBy(-PAN_STEP, 0);
        break;
      case 'ArrowUp':
        this.panBy(0, PAN_STEP);
        break;
      case 'ArrowDown':
        this.panBy(0, -PAN_STEP);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  private onPointerDown(event: PointerEvent, viewport: HTMLElement): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target instanceof Element ? event.target.closest(INTERACTIVE) : null;
    if (target && target !== viewport) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    // A second finger makes it a pinch at once; one pointer waits for the threshold.
    if (this.pointers.size === 2) this.startDrag(viewport);
    else if (this.pointers.size > 2) this.pointers.delete(event.pointerId);
  }

  private onPointerMove(event: PointerEvent, viewport: HTMLElement): void {
    const last = this.pointers.get(event.pointerId);
    if (!last) return;
    // A mouse released outside the viewport before the drag began sends no `pointerup` here.
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      this.onPointerEnd(event, viewport);
      return;
    }
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    if (!this.dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      this.startDrag(viewport);
    }

    const frame = this.frame();
    const from = this.current();
    const point = { x: event.clientX, y: event.clientY };
    const other = [...this.pointers].find(([id]) => id !== event.pointerId)?.[1];
    this.pointers.set(event.pointerId, point);
    if (!other) {
      this.schedule(this.bounded({ k: from.k, x: from.x + dx, y: from.y + dy }, frame));
      return;
    }

    // A pinch: the zoom follows the distance between the two fingers, around
    // where their middle was, and the drawing then follows the middle.
    const before = Math.hypot(last.x - other.x, last.y - other.y);
    const after = Math.hypot(point.x - other.x, point.y - other.y);
    const { min, max } = this.bounds();
    const k = before > 0 ? clampZoom((from.k * after) / before, min, max) : from.k;
    const midX = (last.x + other.x) / 2;
    const midY = (last.y + other.y) / 2;
    const zoomed = zoomAround(from, k, midX - frame.left, midY - frame.top, frame);
    this.schedule(this.bounded({ k, x: zoomed.x + dx / 2, y: zoomed.y + dy / 2 }, frame));
  }

  private onPointerEnd(event: PointerEvent, viewport: HTMLElement): void {
    if (!this.pointers.delete(event.pointerId)) return;
    if (this.dragging && viewport.hasPointerCapture?.(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    if (this.pointers.size) return;
    this.dragging = false;
    this.panning.set(false);
  }

  /** Capture goes to the viewport only now, so a press that never moved still clicks what it pressed. */
  private startDrag(viewport: HTMLElement): void {
    this.dragging = true;
    this.panning.set(true);
    this.animated.set(false);
    for (const id of this.pointers.keys()) viewport.setPointerCapture?.(id);
  }
}
