/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-treemap-chart>` a harness query matches. */
export interface WrTreemapChartHarnessFilters extends BaseHarnessFilters {
  /** Match the drawing's accessible name. */
  readonly ariaLabel?: string | RegExp;
  /** Match a chart that writes this name on one of its tiles. A tile too small for its name writes none. */
  readonly tileLabel?: string | RegExp;
}

/**
 * Where a tile was drawn, as the component wrote it: percentages of the plot, `start`
 * from its inline-start edge — the left in LTR, the right in RTL.
 */
export interface WrTreemapChartTileBox {
  readonly start: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** One tile as {@link WrTreemapChartHarness.getTiles} reads it, in the order drawn. */
export interface WrTreemapChartTile {
  /** The name written on the tile, in its strip or in its corner; `null` when it has no room for one. */
  readonly label: string | null;
  /**
   * The figure the component wrote on the tile, compact; `null` when the tile is too
   * short for one or `showValues` is off. One wider than the tile is written and then
   * wrapped out of sight by the stylesheet, which jsdom cannot show, so it is read here.
   */
  readonly value: string | null;
  /** Whether its children are drawn inside it. A group too small for its children is drawn as one block, and is `false`. */
  readonly group: boolean;
  /** The colour the component handed the tile, which its tint is mixed from. */
  readonly color: string | null;
  /** Where it was drawn. */
  readonly box: WrTreemapChartTileBox;
}

/**
 * One row of the chart's data table (`dataTable`): the node's path as its row header,
 * then its value and its share of the whole.
 */
export interface WrTreemapChartTableRow {
  /** The row header — the node's path, its names joined by ` / `. */
  readonly header: string;
  /** Its value and its share, as the tooltip writes them; `''` where it has none. */
  readonly cells: readonly string[];
}
