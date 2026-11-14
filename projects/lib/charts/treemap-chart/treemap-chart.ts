/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  type ElementRef,
  LOCALE_ID,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  isDevMode,
  linkedSignal,
  viewChild,
  viewChildren,
} from '@angular/core';

import { WrChartLegend, type WrChartLegendItem, type WrChartLegendPosition } from 'ngwr/charts/chart-legend';
import {
  type WrChartSize,
  WrChartState,
  WrChartTable,
  type WrChartTableData,
  useChartHover,
  useChartNumbers,
  useChartSize,
  useChartState,
  wrChartColor,
  wrChartNumberFormat,
  wrChartRound,
} from 'ngwr/charts/core';
import { wrReadI18nText, useI18nText } from 'ngwr/i18n';
import { useChartTooltip } from 'ngwr/popover';
import { wrCheckStyles } from 'ngwr/utils';

import { type WrTreemapRect, squarify } from './internal/squarify';
import type { WrTreemapNode } from './types';

/**
 * The width the layout assumes until the plot has been measured — on the server, and
 * in the first render in a browser. The tiles are drawn in percentages of the plot, so
 * they fill it either way; only their shapes are squarer once the real width is known.
 */
const FALLBACK_WIDTH = 640;

/**
 * The height of the strip a group's name is written in, in px: one line of the label's
 * type and a little room. The stylesheet sizes the strip from the same number, written
 * on it inline, so the two cannot disagree; a larger type than the default's is clipped
 * rather than spilling into the tiles under it.
 */
const HEADER = 20;

/** The space between a group's edge and the tiles inside it, in px, on the sides and below. */
const PAD = 3;

/** The smallest room, in px either way, that a group draws its children in. Smaller, it is drawn as one block. */
const MIN_INNER = 12;

/** The smallest tile, in px, that a name is written in, however short the name. */
const LABEL_MIN_WIDTH = 36;
const LABEL_MIN_HEIGHT = 22;

/**
 * The width, in px, from which a tile writes a name it has to cut: room for about nine
 * letters before the ellipsis, enough of a name to be read as that name. Narrower, a name
 * that does not fit whole is left out, and the tooltip and the data table carry it.
 */
const LABEL_CUT_WIDTH = 72;

/** What a letter of the label's type takes on average, in px, and a wide one (CJK, full-width). */
const CHAR_WIDTH = 7;
const WIDE_CHAR_WIDTH = 12;

/** The label's padding on both sides together, in px. */
const LABEL_PADDING = 8;

/**
 * The width a name takes inside a tile, in px, padding included: an estimate from its
 * letters, since nothing is laid out where the layout is cut (a server, the first render).
 * It errs wide, and the stylesheet still ellipsises a name the estimate let through.
 */
function labelWidth(label: string): number {
  let width = LABEL_PADDING;
  for (const char of label) width += (char.codePointAt(0) ?? 0) >= 0x1100 ? WIDE_CHAR_WIDTH : CHAR_WIDTH;
  return width;
}

/**
 * Whether a tile `width` px wide writes `label`: when the whole name fits, or when the
 * tile is wide enough that the part left before the ellipsis still reads as the name.
 * `Le…` and `Facil…` name nothing, so a tile that small stays blank.
 */
function named(label: string, width: number): boolean {
  return width >= LABEL_MIN_WIDTH && (width >= LABEL_CUT_WIDTH || width >= labelWidth(label));
}

/** The smallest tile height, in px, that holds the value under the name. */
const VALUE_MIN_HEIGHT = 38;

/** Between the names of a path, in the tooltip and the data table. */
const SEPARATOR = ' / ';

/**
 * The relative difference below which a group's value and its children's sum are the same
 * number. Decimal data rarely adds up exactly in binary — 0.1 + 0.2 + 0.3 is
 * 0.6000000000000001 — so an exact comparison would call a group of 0.6 smaller than its
 * children and leave a remainder of a few ulps to lay out.
 */
const SUM_TOLERANCE = 1e-9;

/** A percentage to three decimals, so a style stays short. */
const percent = (value: number): number => wrChartRound(value, 3);

/** A node of the data, resolved: where it sits in the tree, its colour, its figure and its area. */
interface ResolvedNode {
  /** Its position in the tree, `0.2.1`: unique, and stable while the data keeps its shape. */
  readonly key: string;
  readonly label: string;
  /** Every name from the top-level node down to this one. */
  readonly path: readonly string[];
  readonly color: string;
  /** The position of the top-level node it sits under: its row in the legend. */
  readonly series: number;
  /** Its own `value`, when that is a finite number. */
  readonly own: number | null;
  /**
   * The figure the tooltip and the data table show: its own value, or for a group with
   * none the sum of its children's areas. `null` for a leaf with no value.
   */
  readonly value: number | null;
  /** The weight its rectangle is drawn with. `0` draws nothing. */
  readonly size: number;
  /** What its children's areas add up to. */
  readonly childSize: number;
  readonly children: readonly ResolvedNode[];
}

/** A node as drawn: its rectangle in px and what it has room to show. */
interface PlacedTile {
  readonly node: ResolvedNode;
  readonly rect: WrTreemapRect;
  /** Its children are drawn inside it. */
  readonly group: boolean;
  /** A strip at its top carries its name and, with `showValues`, its figure. */
  readonly header: boolean;
  /** Its name is written inside it, as on a leaf. */
  readonly labelled: boolean;
  /** Its figure is written under its name. */
  readonly valued: boolean;
}

/** The fit rules {@link placeTiles} applies. */
interface PlaceOptions {
  readonly labels: boolean;
  readonly values: boolean;
}

/**
 * Every node of `nodes`, resolved: paths and colours handed down, values summed up. A
 * top-level node with no `color` takes the palette colour of its position, and a nested
 * one its parent's.
 */
function resolveNodes(
  nodes: readonly WrTreemapNode[],
  path: readonly string[],
  inherited: string | null,
  key: string,
  top: number | null = null
): ResolvedNode[] {
  return nodes.map((node, i) => {
    const color = node.color ?? inherited ?? wrChartColor(i);
    const series = top ?? i;
    const own = typeof node.value === 'number' && Number.isFinite(node.value) ? node.value : null;
    const ownSize = own !== null && own > 0 ? own : 0;
    const nodePath = [...path, node.label];
    const children = resolveNodes(node.children ?? [], nodePath, color, `${key}${i}.`, series);
    const childSize = children.reduce((sum, child) => sum + child.size, 0);
    const group = children.length > 0;
    return {
      key: `${key}${i}`,
      label: node.label,
      path: nodePath,
      color,
      series,
      own,
      value: group ? (own ?? childSize) : own,
      // A group is never smaller than its children, whatever it is given: they have to fit.
      size: group ? Math.max(ownSize, childSize) : ownSize,
      childSize,
      children,
    };
  });
}

/** Every node, parents before their children, in the data's own order: the data table's rows. */
function flatten(nodes: readonly ResolvedNode[]): ResolvedNode[] {
  return nodes.flatMap(node => [node, ...flatten(node.children)]);
}

/**
 * The tiles for `nodes` inside `box`, parents before their children so a child is drawn
 * over its parent. Siblings are squarified largest first, ties in the data's order, and a
 * group's `remainder` — the part of its value its children do not account for — is laid
 * out last and left empty.
 */
function placeTiles(
  nodes: readonly ResolvedNode[],
  remainder: number,
  box: WrTreemapRect,
  options: PlaceOptions,
  out: PlacedTile[]
): void {
  const order = nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => node.size > 0)
    .sort((a, b) => b.node.size - a.node.size || a.index - b.index);
  const sizes = order.map(({ node }) => node.size);
  if (remainder > 0) sizes.push(remainder);
  const rects = squarify(sizes, box);

  order.forEach(({ node }, k) => {
    const rect = rects[k];
    if (!rect) return;
    const roomForHeader = options.labels && rect.height >= HEADER * 2 && named(node.label, rect.width);
    const top = roomForHeader ? HEADER : PAD;
    const inner: WrTreemapRect = {
      x: rect.x + PAD,
      y: rect.y + top,
      width: rect.width - 2 * PAD,
      height: rect.height - top - PAD,
    };
    const group = node.childSize > 0 && inner.width >= MIN_INNER && inner.height >= MIN_INNER;
    const labelled = !group && options.labels && rect.height >= LABEL_MIN_HEIGHT && named(node.label, rect.width);
    out.push({
      node,
      rect,
      group,
      header: group && roomForHeader,
      labelled,
      valued: labelled && options.values && rect.height >= VALUE_MIN_HEIGHT,
    });
    if (group) {
      const rest = node.size - node.childSize;
      placeTiles(node.children, rest > node.size * SUM_TOLERANCE ? rest : 0, inner, options, out);
    }
  });
}

/**
 * Treemap chart: a hierarchy as nested rectangles, each with an area in proportion to its
 * value. For the parts of a whole when there are too many for a donut, or when they come
 * in groups — a budget by department and team, a disk by folder. HTML only — no external
 * dependency.
 *
 * @example
 * ```html
 * <wr-treemap-chart
 *   ariaLabel="Budget by department"
 *   [data]="[
 *     { label: 'Engineering', children: [{ label: 'Web', value: 310 }, { label: 'Mobile', value: 260 }] },
 *     { label: 'Sales', children: [{ label: 'EMEA', value: 280 }, { label: 'APAC', value: 150 }] },
 *     { label: 'Legal', value: 60 }
 *   ]"
 * />
 * ```
 *
 * **The layout** is the squarified algorithm (Bruls, Huizing and van Wijk, 2000): each
 * set of siblings is cut largest first into rectangles as close to square as it allows,
 * so areas can be compared and names have room. It starts in the inline-start top corner,
 * so under RTL the largest node sits at the top right — the tiles are positioned by
 * `inset-inline-start`, and the whole drawing mirrors with the writing direction.
 *
 * **Groups.** A node with children is drawn as a rectangle with its children inside it,
 * a few pixels in from its edge, under a strip carrying its name when it is tall enough.
 * Its value is the sum of its children's unless it is given one, and a value above that
 * sum leaves the rest of its rectangle empty: what the children do not account for. A
 * group too small to hold its children is drawn as one block.
 *
 * **Colour is the top-level node's**, from the chart palette (`--wr-chart-1` to `-8`),
 * and every node inside it takes it unless it has a `color` of its own. A tile is the
 * solid colour, and the line round it is the surface (`--wr-chart-separator`), so two
 * tiles of one colour still read as two. The text on a tile is black or white, whichever
 * reads on that tile's colour. Colour is never the only thing that tells two groups
 * apart: each carries its name where there is room, and its tiles sit inside its own
 * rectangle; the tooltip and the data table name the ones too small to write in, and
 * `showLegend` keys the top-level nodes beside the chart. Under forced colours the line
 * is an outline in the text colour. With more than eight top-level nodes the palette
 * repeats, and the names are what tell neighbours of one colour apart.
 *
 * **Names are written inside the tiles that have room** — a group's in its strip, a
 * leaf's in its corner with its value under it. A name is written whole where it fits,
 * and cut with an ellipsis only on a tile wide enough to keep about nine letters of it:
 * a narrower tile whose name does not fit, or one smaller than about 36 × 22 px, writes
 * nothing rather than `Le…`. The tooltip and the data table name every node in full,
 * with its whole path. A value is never cut: one wider than its tile, or than the room
 * its group's name leaves in the strip, is left out, since `$12…` reads as another
 * number, and the tooltip and the data table carry it whole.
 *
 * **Hover.** The tile under the pointer is ringed, and every tile outside its top-level
 * node falls back; a legend row does the same for its node.
 *
 * **Empty, loading, error.** With nothing to draw the chart keeps its box and says
 * "No data"; `loading` and `error` put their own message there in place of the tiles.
 *
 * **What a screen reader gets.** The drawing is one named `role="img"`, and nothing in it
 * is announced. The tooltip is pointer only, so say what the chart shows in `ariaLabel`,
 * or turn on `dataTable`, which lists every node by its path with its value and its share
 * of the whole. No part of the chart is a tab stop.
 *
 * **No drill-down.** Every level is drawn at once and nothing zooms into a group; a
 * deep tree is better split into several charts, or given one level at a time by the host.
 *
 * The tiles are laid out for the plot's measured size, so on the server and in the first
 * render they are cut for an assumed width and squared up once the plot is measured.
 *
 * @see https://ngwr.dev/charts/treemap-chart
 */
@Component({
  selector: 'wr-treemap-chart',
  templateUrl: './treemap-chart.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    // `wr-chart--legend`: the shared rule that keeps the legend's room from the plot.
    class: 'wr-treemap-chart wr-chart--legend',
    '[class.wr-chart--legend-side]': 'legendShown() && legendSide()',
  },
  imports: [NgTemplateOutlet, WrChartLegend, WrChartState, WrChartTable],
})
export class WrTreemapChart {
  /**
   * The nodes, top level first. A node with `children` is a group drawn round them, and
   * one without is a leaf drawn at its `value`. Top-level nodes with no `color` take the
   * palette's colours in order.
   */
  readonly data = input<readonly WrTreemapNode[]>([]);

  /**
   * Accessible name of the drawing. The tiles carry no text a screen reader reaches, so
   * this is where to say what the chart shows — or turn on `dataTable`. Falls back to
   * `treemapChart.label`, which is also the data table's caption.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'treemapChart.label', 'Treemap chart');

  /**
   * What the values measure — revenue, size on disk — as the heading of the data table's
   * value column. Falls back to `treemapChart.value` ("Value").
   */
  readonly valueLabel = input<string | null>(null);

  protected readonly valueName = useI18nText(this.valueLabel, 'treemapChart.value', 'Value');

  /** The heading of the share column and the name of the tooltip's share row. */
  protected readonly shareName = wrReadI18nText('treemapChart.share', 'Share');

  /** The plot's height in px, at least 80. Its width is the container's. @default 280 */
  readonly height = input(280, {
    transform: (v: unknown): number => {
      const value = coerceNumberProperty(v, 280);
      return Number.isFinite(value) ? Math.max(80, value) : 280;
    },
  });

  /**
   * Write the names inside the tiles that have room for them, a group's in a strip along
   * its top. Off, no tile carries text and no group reserves a strip. @default true
   */
  readonly showLabels = input(true, { transform: coerceBooleanProperty });

  /** Write each value under its name, and each group's beside its name, where there is room. @default true */
  readonly showValues = input(true, { transform: coerceBooleanProperty });

  /**
   * Key the top-level nodes in a legend: a dot in each one's colour, its name and its
   * value. Off by default, since a tile with room carries its own name. `'auto'` shows
   * it when there are two top-level nodes or more. @default false
   */
  readonly showLegend = input<boolean | 'auto', unknown>(false, {
    transform: (value: unknown): boolean | 'auto' => (value === 'auto' ? 'auto' : coerceBooleanProperty(value)),
  });

  /**
   * Where the legend sits: `bottom` or `top` of the chart as a wrapping row, `start` or
   * `end` of it as a column, or `none` for no legend at all. @default 'bottom'
   */
  readonly legendPosition = input<WrChartLegendPosition>('bottom');

  /**
   * A request for the chart's data is in flight: the tiles give way to the loading
   * message, in the box the chart had. @default false
   */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /**
   * The chart's data failed to load: the tiles give way to the error message. `loading`
   * wins while both are set. @default false
   */
  readonly error = input(false, { transform: coerceBooleanProperty });

  /** The message shown when there is nothing to draw. Falls back to `chart.empty`, then `'No data'`. */
  readonly emptyLabel = input<string | null>(null);

  /** The message shown while `loading`. Falls back to `chart.loading`, then `'Loading…'`. */
  readonly loadingLabel = input<string | null>(null);

  /** The message shown on `error`. Falls back to `chart.error`, then `'Could not load'`. */
  readonly errorLabel = input<string | null>(null);

  /**
   * Show a tooltip for the tile under the pointer: its path from the top-level node, its
   * value, and its share of the whole. Pointer only — the data table is where the same
   * figures are for a keyboard or a screen reader. @default true
   */
  readonly tooltip = input(true, { transform: coerceBooleanProperty });

  /**
   * Writes every value the chart shows: inside the tiles, in the tooltip and in the data
   * table. `null` uses `Intl.NumberFormat` in `LOCALE_ID`, compact inside the tiles
   * (`1.2K`). A value wider than its tile is left out of it rather than cut. Shares are
   * `percentFormat`'s.
   */
  readonly valueFormat = input<((value: number) => string) | null>(null);

  /**
   * Writes every share the chart shows, given as a RATIO — `0.25` for a quarter — the
   * number `Intl.NumberFormat`'s `percent` style takes, so one of those can be passed as
   * it is: in the tooltip and in the data table. `null` uses that style in `LOCALE_ID`,
   * with up to one fraction digit, and two significant digits below 1% so a sliver is not
   * printed as `0%`.
   */
  readonly percentFormat = input<((ratio: number) => string) | null>(null);

  /**
   * Render the chart's figures as a table that only assistive technology reaches: a row
   * per node, parents before their children in the data's order, headed by its path —
   * `Engineering / Web` — with its value and its share of the whole. A node with no area
   * is listed with an empty share, and a leaf with no value with an empty value too.
   *
   * The drawing is one named `role="img"`, which hides everything inside it, so without
   * the table the numbers are nowhere a screen reader can walk. It is rendered beside the
   * drawing, clipped to nothing: it takes no room, draws nothing and holds no tab stop.
   * @default false
   */
  readonly dataTable = input(false, { transform: coerceBooleanProperty });

  /** The exact figures and the tiles' compact ones, in `LOCALE_ID` unless `valueFormat` is given. */
  private readonly numbers = useChartNumbers(this.valueFormat);

  /** Shares from one percent up, to one decimal: `12.5 %`, `3 %`. */
  private readonly shares = wrChartNumberFormat(inject(LOCALE_ID), { style: 'percent', maximumFractionDigits: 1 });

  /** Shares below one percent, to two significant digits, so a sliver does not read `0 %`. */
  private readonly smallShares = wrChartNumberFormat(inject(LOCALE_ID), {
    style: 'percent',
    maximumSignificantDigits: 2,
  });

  private readonly plot = viewChild.required<ElementRef<HTMLElement>>('plot');
  private readonly tileEls = viewChildren<ElementRef<HTMLElement>>('tile');

  /**
   * The plot's content box, on the observer every chart shares: one callback a frame for
   * every chart on the page, where each treemap used to make an observer of its own.
   */
  private readonly size = useChartSize(this.plot);

  /**
   * The last size the plot measured, in whole px, or `null` before it has one. A hidden
   * chart measures nothing and keeps the layout it had rather than collapse it, and a
   * drag that moves the width by a fraction of a pixel cuts no new layout.
   */
  private readonly box = linkedSignal<WrChartSize, WrChartSize | null>({
    source: this.size,
    computation: ({ width, height }, previous) =>
      width <= 0 || height <= 0 ? (previous?.value ?? null) : { width: Math.round(width), height: Math.round(height) },
    equal: (a, b) => a?.width === b?.width && a?.height === b?.height,
  });

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('charts/treemap-chart');

    // One pair of listeners on the host however many tiles there are: the tile under the
    // pointer is the nearest element up from it carrying `data-wr-index`.
    useChartHover({ enter: index => this.tip.enter(index), leave: event => this.tip.leave(event) });

    // The ring round the tile the tooltip is about, set by hand on that one element. Bound
    // as a class on every tile, it was compared again for every tile on every hover change.
    let ringed: HTMLElement | null = null;
    effect(() => {
      const active = this.tip.active();
      // The tiles are read here too, so a new layout under an open tooltip moves the ring
      // to the tile that now sits at its index.
      const next = active === null ? null : (this.tileEls()[active]?.nativeElement ?? null);
      if (next === ringed) return;
      ringed?.classList.remove('wr-treemap-chart__tile--active');
      next?.classList.add('wr-treemap-chart__tile--active');
      ringed = next;
    });

    // Two things in the data the drawing cannot honour, and that look like nothing at all
    // on screen: a missing tile, and a group drawn larger than it was told to be.
    if (isDevMode()) {
      const warned = new Set<string>();
      effect(() => {
        for (const node of this.nodes()) {
          const path = node.path.join(SEPARATOR);
          let problem: string | null = null;
          if (node.own !== null && node.own < 0) {
            // A negative value adds no area of its own, so whatever such a node is drawn at
            // is its children's total — a group is still drawn round them.
            const drawn =
              node.size > 0
                ? `It is drawn at the ${node.childSize} its children add up to, which has to fit.`
                : 'It draws no tile, and the data table still lists it.';
            problem = `"${path}" has a negative value (${node.own}), which has no area. ${drawn}`;
          } else if (node.children.length > 0 && node.own !== null && node.own < node.childSize * (1 - SUM_TOLERANCE)) {
            problem =
              `"${path}" is given a value of ${node.own}, below the ${node.childSize} its children add up to. ` +
              'It is drawn at its children’s total, which has to fit.';
          }
          if (problem === null || warned.has(problem)) continue;
          warned.add(problem);
          // eslint-disable-next-line no-console -- dev-mode validation
          console.warn(`[NGWR] <wr-treemap-chart>: ${problem}`);
        }
      });
    }
  }

  /** The data, resolved: top-level nodes with every node below them. */
  private readonly tree = computed(() => resolveNodes(this.data(), [], null, ''));

  /** Every node, parents before their children, in the data's order. */
  private readonly nodes = computed(() => flatten(this.tree()));

  /** The whole: the area of every top-level node together, which every share is of. */
  private readonly total = computed(() => this.tree().reduce((sum, node) => sum + node.size, 0));

  /** The size the layout is cut for: the measured plot, or the fallback width at `height`. */
  private readonly layoutBox = computed(() => this.box() ?? { width: FALLBACK_WIDTH, height: this.height() });

  /**
   * Every tile drawn, parents before their children, with its rectangle as percentages
   * of the plot — `start` from the inline-start edge — and its figure as the tile writes it.
   * Its position in this list is what the tooltip and the template know it by.
   */
  protected readonly tiles = computed(() => {
    const { width, height } = this.layoutBox();
    const placed: PlacedTile[] = [];
    placeTiles(
      this.tree(),
      0,
      { x: 0, y: 0, width, height },
      { labels: this.showLabels(), values: this.showValues() },
      placed
    );
    return placed.map(tile => ({
      key: tile.node.key,
      node: tile.node,
      series: tile.node.series,
      group: tile.group,
      header: tile.header,
      labelled: tile.labelled,
      valued: tile.valued,
      text: tile.node.value === null ? '' : this.numbers.label(tile.node.value),
      start: percent((tile.rect.x / width) * 100),
      top: percent((tile.rect.y / height) * 100),
      width: percent((tile.rect.width / width) * 100),
      height: percent((tile.rect.height / height) * 100),
    }));
  });

  /** The height of a group's name strip, in px, for the stylesheet. */
  protected readonly headerHeight = HEADER;

  /**
   * The figures for `dataTable`: the drawing's name as the caption, and a row per node with
   * its value and its share of the whole, written as the tooltip writes them.
   */
  protected readonly tableData = computed<WrChartTableData>(() => ({
    caption: this.resolvedAriaLabel(),
    columns: [this.valueName(), this.shareName()],
    groups: [
      {
        rows: this.nodes().map(node => ({
          header: node.path.join(SEPARATOR),
          cells: [node.value === null ? '' : this.numbers.value(node.value), this.share(node)],
        })),
      },
    ],
  }));

  /**
   * One tooltip for the whole chart, for the tile under the pointer: the node's swatch,
   * its path and its value as the heading, and its share of the whole under it. It points
   * at the tile from above. The pointer over a group's strip or its edge reads the group,
   * with its total.
   */
  protected readonly tip = useChartTooltip(this.tooltip, index => {
    const tile = this.tiles()[index];
    const el = this.tileEls()[index]?.nativeElement;
    if (!tile || !el) return null;
    const { node } = tile;
    const share = this.share(node);
    return {
      datum: {
        label: node.path.join(SEPARATOR),
        value: node.value === null ? '' : this.numbers.value(node.value),
        color: node.color,
        rows: share ? [{ label: this.shareName(), value: share }] : [],
      },
      anchor: el,
    };
  });

  /** The legend's rows: every top-level node, keyed by a dot in its colour, with its value. */
  protected readonly legendItems = computed<readonly WrChartLegendItem[]>(() =>
    this.tree().map(node => ({
      label: node.label,
      color: node.color,
      value: node.value === null ? null : this.numbers.label(node.value),
    }))
  );

  /**
   * Whether the chart draws its legend: asked for with `showLegend`, unless
   * `legendPosition` is `none` or there is no node. Under `showLegend="auto"` a single
   * top-level node has nothing to tell apart, and draws none.
   */
  protected readonly legendShown = computed(() => {
    const show = this.showLegend();
    const rows = this.legendItems().length;
    if (show === false || rows === 0 || this.legendPosition() === 'none') return false;
    return show === true || rows > 1;
  });

  /** Whether the legend comes before the plot, in the DOM as on screen: above it, or at inline start. */
  protected readonly legendFirst = computed(() => {
    const position = this.legendPosition();
    return position === 'top' || position === 'start';
  });

  /** Whether the legend sits beside the plot rather than above or below it. */
  protected readonly legendSide = computed(() => {
    const position = this.legendPosition();
    return position === 'start' || position === 'end';
  });

  /** Whether the chart has nothing to draw: no node with an area. */
  private readonly empty = computed(() => this.total() <= 0);

  /** What the chart shows in place of its tiles, or `null` while it draws them. */
  protected readonly state = useChartState({
    loading: this.loading,
    error: this.error,
    empty: this.empty,
    emptyLabel: this.emptyLabel,
    loadingLabel: this.loadingLabel,
    errorLabel: this.errorLabel,
  });

  /** A node's share of the whole, through `percentFormat` or as a percentage in `LOCALE_ID`, or `''` for one with no area. */
  private share(node: ResolvedNode): string {
    const total = this.total();
    if (node.size <= 0 || total <= 0) return '';
    const share = node.size / total;
    const custom = this.percentFormat();
    if (custom) return custom(share);
    return (share < 0.01 ? this.smallShares : this.shares).format(share);
  }
}

export type { WrTreemapNode } from './types';
