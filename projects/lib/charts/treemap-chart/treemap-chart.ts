/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import {
  Component,
  DestroyRef,
  type ElementRef,
  LOCALE_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  isDevMode,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';

import { WrChartTable, type WrChartTableData, chartColor, useChartNumbers } from 'ngwr/charts/core';
import { readI18nText, useI18nText } from 'ngwr/i18n';
import { useChartTooltip } from 'ngwr/popover';

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

/** The smallest tile, in px, that a name is written in: about three letters and an ellipsis on one line. */
const LABEL_MIN_WIDTH = 36;
const LABEL_MIN_HEIGHT = 22;

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
const percent = (value: number): number => Math.round(value * 1000) / 1000;

/** A node of the data, resolved: where it sits in the tree, its colour, its figure and its area. */
interface ResolvedNode {
  /** Its position in the tree, `0.2.1`: unique, and stable while the data keeps its shape. */
  readonly key: string;
  readonly label: string;
  /** Every name from the top-level node down to this one. */
  readonly path: readonly string[];
  readonly color: string;
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
  key: string
): ResolvedNode[] {
  return nodes.map((node, i) => {
    const color = node.color ?? inherited ?? chartColor(i);
    const own = typeof node.value === 'number' && Number.isFinite(node.value) ? node.value : null;
    const ownSize = own !== null && own > 0 ? own : 0;
    const nodePath = [...path, node.label];
    const children = resolveNodes(node.children ?? [], nodePath, color, `${key}${i}.`);
    const childSize = children.reduce((sum, child) => sum + child.size, 0);
    const group = children.length > 0;
    return {
      key: `${key}${i}`,
      label: node.label,
      path: nodePath,
      color,
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
    const roomForHeader = options.labels && rect.height >= HEADER * 2 && rect.width >= LABEL_MIN_WIDTH;
    const top = roomForHeader ? HEADER : PAD;
    const inner: WrTreemapRect = {
      x: rect.x + PAD,
      y: rect.y + top,
      width: rect.width - 2 * PAD,
      height: rect.height - top - PAD,
    };
    const group = node.childSize > 0 && inner.width >= MIN_INNER && inner.height >= MIN_INNER;
    const labelled = !group && options.labels && rect.width >= LABEL_MIN_WIDTH && rect.height >= LABEL_MIN_HEIGHT;
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
 * **Colour is the top-level node's**, from the chart's palette, and every node inside it
 * takes it unless it has a `color` of its own. It is never the only thing that tells two
 * groups apart: each carries its name where there is room, and its tiles sit inside its
 * own rectangle; the tooltip and the data table name the ones too small to write in. The
 * gap round every tile is a faint separator in the surface colour, not a boundary drawn
 * to be read on its own; under `prefers-contrast: more` it is a line at 3:1 or more
 * against the tints, and under forced colours an outline in the text colour. With more
 * than five top-level nodes the palette repeats, and the names are what tell neighbours
 * of one colour apart.
 *
 * **Names are written inside the tiles that have room** — a group's in its strip, a
 * leaf's in its corner with its value under it — and ellipsised past the tile's width.
 * A tile smaller than about 36 × 22 px writes nothing; the tooltip and the data table
 * name every node in full, with its whole path.
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
  host: { class: 'wr-treemap-chart' },
  imports: [WrChartTable],
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
  protected readonly shareName = readI18nText('treemapChart.share', 'Share');

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
   * Show a tooltip for the tile under the pointer: its path from the top-level node, its
   * value, and its share of the whole. Pointer only — the data table is where the same
   * figures are for a keyboard or a screen reader. @default true
   */
  readonly tooltip = input(true, { transform: coerceBooleanProperty });

  /**
   * Writes every value the chart shows: inside the tiles, in the tooltip and in the data
   * table. `null` uses `Intl.NumberFormat` in `LOCALE_ID`, compact inside the tiles
   * (`1.2K`). Shares are percentages in `LOCALE_ID` either way.
   */
  readonly valueFormat = input<((value: number) => string) | null>(null);

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
  private readonly shares = new Intl.NumberFormat(inject(LOCALE_ID), { style: 'percent', maximumFractionDigits: 1 });

  /** Shares below one percent, to two significant digits, so a sliver does not read `0 %`. */
  private readonly smallShares = new Intl.NumberFormat(inject(LOCALE_ID), {
    style: 'percent',
    maximumSignificantDigits: 2,
  });

  private readonly plot = viewChild.required<ElementRef<HTMLElement>>('plot');
  private readonly tileEls = viewChildren<ElementRef<HTMLElement>>('tile');

  /** The plot's measured content box, once a browser has laid it out. */
  private readonly box = signal<{ readonly width: number; readonly height: number } | null>(null);

  constructor() {
    const destroyRef = inject(DestroyRef);
    // The layout is cut for the plot's real proportions: squares at 640 × 280 are slabs
    // at 320 × 280. Measured after render, so the server and the first paint draw the
    // fallback and nothing here touches the DOM before a browser has one.
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        // A hidden chart measures nothing; keep the last layout rather than collapse it.
        if (width <= 0 || height <= 0) return;
        const last = this.box();
        if (last?.width === width && last.height === height) return;
        this.box.set({ width, height });
      });
      observer.observe(this.plot().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
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

  /**
   * The tile under the pointer, heard once on the plot rather than on every tile: the
   * nearest tile up from the element the pointer is over. A MOUSE event, as every chart's
   * is: a tap fires the compatibility `mousemove` and no `pointermove`.
   */
  protected onPointerMove(event: MouseEvent): void {
    const tile = (event.target as Element | null)?.closest<HTMLElement>('.wr-treemap-chart__tile');
    const index = tile ? Number(tile.dataset['index']) : Number.NaN;
    if (Number.isInteger(index) && index >= 0) this.tip.enter(index);
    else this.tip.leave(event);
  }

  /** A node's share of the whole, or `''` for one with no area. */
  private share(node: ResolvedNode): string {
    const total = this.total();
    if (node.size <= 0 || total <= 0) return '';
    const share = node.size / total;
    return (share < 0.01 ? this.smallShares : this.shares).format(share);
  }
}

export type { WrTreemapNode } from './types';
