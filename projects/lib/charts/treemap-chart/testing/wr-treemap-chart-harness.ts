/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type {
  WrTreemapChartHarnessFilters,
  WrTreemapChartTableRow,
  WrTreemapChartTile,
  WrTreemapChartTileBox,
} from './types';

/** One declaration of an inline `style` attribute, or `null` when the component wrote none. */
function declaration(style: string, property: string): string | null {
  const escaped = property.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  return new RegExp(`(?:^|;)\\s*${escaped}:\\s*([^;]+)`).exec(style)?.[1].trim() ?? null;
}

/**
 * One body row of the chart's data table, so its header and cells are read off the row
 * they sit in rather than matched up by position across the whole table.
 */
class TableRowHarness extends ComponentHarness {
  static hostSelector = '.wr-chart-table tbody tr';

  async read(): Promise<WrTreemapChartTableRow> {
    const header = await this.locatorFor('th[scope="row"]')();
    const cells = await this.locatorForAll('td')();
    return { header: await header.text(), cells: await Promise.all(cells.map(cell => cell.text())) };
  }
}

/** One tile, so its name and figure are read off the tile they sit in. */
class TileHarness extends ComponentHarness {
  static hostSelector = '.wr-treemap-chart__tile';

  async read(): Promise<WrTreemapChartTile> {
    const host = await this.host();
    const label = await this.locatorForOptional('.wr-treemap-chart__label')();
    const value = await this.locatorForOptional('.wr-treemap-chart__value')();
    const style = (await host.getAttribute('style')) ?? '';
    const box = (property: string): number => {
      const written = declaration(style, property);
      if (!written?.endsWith('%')) {
        throw new Error(
          `WrTreemapChartHarness.getTiles(): no percentage for \`${property}\` on a tile (style: "${style}"). ` +
            'The component writes all four unconditionally, so its absence is the bug rather than a zero.'
        );
      }
      return Number.parseFloat(written);
    };
    const rect: WrTreemapChartTileBox = {
      start: box('inset-inline-start'),
      top: box('top'),
      width: box('width'),
      height: box('height'),
    };
    return {
      label: label ? await label.text() : null,
      value: value ? await value.text() : null,
      group: await host.hasClass('wr-treemap-chart__tile--group'),
      color: declaration(style, '--wr-treemap-chart-tile-color'),
      box: rect,
    };
  }
}

/**
 * Test harness for `<wr-treemap-chart>`.
 *
 * **What it reads is what the component WROTE**: each tile's rectangle as the
 * percentages on its `style` attribute, its colour as the custom property beside them,
 * its name and figure as text, and the data table. Those are what the layout and the
 * data wiring produce, and what breaks when either does. jsdom lays nothing out, so a
 * name is read in full whether a browser would ellipsise it or not, and there is no
 * method for whether it was. Nor for whether a value fits: the stylesheet hides a value
 * wider than its tile by wrapping it out of sight, which takes a layout jsdom does not
 * have, so {@link getTiles} gives the text the component printed, fitting or not.
 *
 * **The layout is cut for the plot's measured size**, and jsdom measures nothing: in a
 * spec the chart cuts it for the width it assumes before measuring, 640 px, at its
 * `height`. So a spec can pin areas and order, which hold at any size, and should not
 * pin a tile's exact shape, which a browser's real width changes.
 *
 * **The tooltip is not opened from here.** It is pointer only, it renders into the
 * overlay container rather than the chart, and it says nothing the data table does not:
 * {@link getTableRows} reads the same path, value and share, which is where a keyboard
 * and a screen reader find them too.
 *
 * @example
 * ```ts
 * const chart = await loader.getHarness(WrTreemapChartHarness.with({ ariaLabel: 'Budget' }));
 *
 * expect(await chart.getLabels()).toContain('Engineering');
 * expect(await chart.getGroupCount()).toBe(2);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrTreemapChartHarness extends ComponentHarness {
  static hostSelector = 'wr-treemap-chart';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrTreemapChartHarnessFilters = {}): HarnessPredicate<WrTreemapChartHarness> {
    return new HarnessPredicate(WrTreemapChartHarness, options)
      .addOption('ariaLabel', options.ariaLabel, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
      )
      .addOption('tileLabel', options.tileLabel, async (harness, label) => {
        for (const name of await harness.getLabels()) {
          if (await HarnessPredicate.stringMatches(name, label)) return true;
        }
        return false;
      });
  }

  /** The drawing's accessible name — the only thing about it a screen reader hears. */
  async getAccessibleName(): Promise<string | null> {
    return (await this.locatorFor('.wr-treemap-chart__plot')()).getAttribute('aria-label');
  }

  /**
   * Every tile drawn, parents before their children and siblings largest first: its name
   * and figure where it has room for them, whether it holds its children, its colour, and
   * its rectangle.
   *
   * A node with no area — no value, zero, negative — draws no tile, and is in the data
   * table all the same.
   */
  async getTiles(): Promise<WrTreemapChartTile[]> {
    const tiles = await this.locatorForAll(TileHarness)();
    return Promise.all(tiles.map(tile => tile.read()));
  }

  /** How many tiles were drawn, groups and leaves together. */
  async getTileCount(): Promise<number> {
    return (await this.locatorForAll('.wr-treemap-chart__tile')()).length;
  }

  /** How many tiles hold their children inside them. */
  async getGroupCount(): Promise<number> {
    return (await this.locatorForAll('.wr-treemap-chart__tile--group')()).length;
  }

  /** How many tiles hold nothing: leaves, and groups too small to draw their children in. */
  async getLeafCount(): Promise<number> {
    return (await this.locatorForAll('.wr-treemap-chart__tile--leaf')()).length;
  }

  /**
   * The names written on the tiles, in the order drawn — a group's in its strip, a leaf's
   * in its corner. A tile too small for its name writes none, and `showLabels` off writes
   * none at all.
   */
  async getLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-treemap-chart__label')();
    return Promise.all(labels.map(label => label.text()));
  }

  /** Whether the hidden data table is rendered (`dataTable`). */
  async hasDataTable(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-chart-table')()) !== null;
  }

  /**
   * The data table's column headings: the value's name (`valueLabel`) and the share's.
   *
   * Throws when the chart renders no table (`dataTable` off) rather than answering with no
   * columns.
   */
  async getTableColumns(): Promise<string[]> {
    await this.assertDataTable('getTableColumns');
    const headings = await this.locatorForAll('.wr-chart-table thead th[scope="col"]')();
    return Promise.all(headings.map(heading => heading.text()));
  }

  /**
   * The data table's rows, one per node, parents before their children in the data's own
   * order: its path, its value and its share of the whole, as a screen reader walks them.
   * A node with no area has an empty share, and a leaf with no value an empty value too.
   *
   * Throws when the chart renders no table (`dataTable` off), for the reason
   * {@link getTableColumns} gives.
   */
  async getTableRows(): Promise<WrTreemapChartTableRow[]> {
    await this.assertDataTable('getTableRows');
    const rows = await this.locatorForAll(TableRowHarness)();
    return Promise.all(rows.map(row => row.read()));
  }

  /**
   * The plot's height in pixels — `height` as the component wrote it — read off the
   * `style` ATTRIBUTE of the plot rather than through `getCssValue()`, which answers from
   * the laid-out box and so agrees in jsdom and not in a browser.
   */
  async getPlotHeight(): Promise<number> {
    const style = (await (await this.locatorFor('.wr-treemap-chart__plot')()).getAttribute('style')) ?? '';
    const written = declaration(style, 'height');
    if (!written?.endsWith('px')) {
      throw new Error(
        `WrTreemapChartHarness.getPlotHeight(): no inline height on .wr-treemap-chart__plot (style: "${style}"). ` +
          'The component writes one unconditionally, so its absence is the bug rather than a zero.'
      );
    }
    return Number.parseFloat(written);
  }

  private async assertDataTable(method: string): Promise<void> {
    if (!(await this.hasDataTable())) {
      throw new Error(
        `WrTreemapChartHarness.${method}(): the chart renders no data table — \`dataTable\` is off. Ask hasDataTable() first.`
      );
    }
  }
}
