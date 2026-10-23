/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import { WrChartLegendHarness } from 'ngwr/charts/chart-legend/testing';

import type {
  WrScatterChartAxisTitles,
  WrScatterChartHarnessFilters,
  WrScatterChartHarnessPoint,
  WrScatterChartTableRow,
} from './types';

/** One series' rows: its `<tbody>`, headed down its first column by the series' name. */
class TableGroupHarness extends ComponentHarness {
  static hostSelector = '.wr-chart-table tbody';

  async read(): Promise<WrScatterChartTableRow[]> {
    const groupHeader = await this.locatorForOptional('th[scope="rowgroup"]')();
    const series = groupHeader ? await groupHeader.text() : '';
    const rows = await this.locatorForAll(TableRowHarness)();
    return Promise.all(rows.map(row => row.read(series)));
  }
}

class TableRowHarness extends ComponentHarness {
  static hostSelector = 'tr';

  async read(series: string): Promise<WrScatterChartTableRow> {
    const header = await this.locatorFor('th[scope="row"]')();
    // The group column of a group with no name is an empty `<td>` spanning its rows, and
    // it is no value of the point's.
    const cells = await this.locatorForAll('td:not([rowspan])')();
    return { series, header: await header.text(), cells: await Promise.all(cells.map(cell => cell.text())) };
  }
}

/** One marker: the nested `<svg>` the component placed, and the shape inside it. */
class PointHarness extends ComponentHarness {
  static hostSelector = '.wr-scatter-chart__point';

  private readonly shape = this.locatorForOptional('.wr-scatter-chart__marker');

  async read(): Promise<WrScatterChartHarnessPoint> {
    const point = await this.host();
    const sizeRaw = await point.getAttribute('data-size');
    const marker = await point.getAttribute('data-marker');
    if (!marker) {
      throw new Error('WrScatterChartHarness.getPoints(): a marker carries no data-marker, which names its shape.');
    }
    const shape = await this.shape();
    return {
      series: await numberAttribute(point, 'data-series'),
      x: await numberAttribute(point, 'data-x'),
      y: await numberAttribute(point, 'data-y'),
      size: sizeRaw === null ? null : await numberAttribute(point, 'data-size'),
      marker,
      color: shape ? await shape.getAttribute('fill') : null,
      radius: await numberAttribute(point, 'data-radius'),
      left: await numberAttribute(point, 'x'),
      top: await numberAttribute(point, 'y'),
    };
  }
}

/** A finite number off one attribute, or a sentence saying which one the marker lacks. */
async function numberAttribute(element: TestElement, name: string): Promise<number> {
  const raw = await element.getAttribute(name);
  const value = raw === null ? Number.NaN : Number.parseFloat(raw);
  if (!Number.isFinite(value)) {
    throw new Error(
      `WrScatterChartHarness.getPoints(): a marker carries ${name}="${raw ?? ''}", which the component writes as a ` +
        'finite number on every point it draws.'
    );
  }
  return value;
}

/**
 * Test harness for `<wr-scatter-chart>`.
 *
 * **Points are read off what the component WROTE, never off a layout.** jsdom lays
 * nothing out, so a measured position would read 0 for a working chart and a broken one
 * alike. Every marker is a nested `<svg>` the component places by percentage, and it
 * carries the point's values and shape in `data-*` attributes beside that placement —
 * so {@link getPoints} answers both questions a spec has: which point is this, and where
 * did the chart put it. A point at the right value and the wrong percentage is exactly
 * the defect worth catching. The marker's path `d` is not read: its numbers are a
 * rendering detail of each shape.
 *
 * **There is deliberately no hover method.** The tooltip opens on the point nearest the
 * pointer, measured against the drawing's box, which jsdom reports as 0×0 — so every
 * synthetic move resolves to nothing, and a `hoverPoint()` would answer "no tooltip" for
 * a working chart. A spec that needs the tooltip stubs the drawing's
 * `getBoundingClientRect` and dispatches the `mousemove` itself, as the component's own
 * spec does.
 *
 * @example
 * ```ts
 * const chart = await loader.getHarness(WrScatterChartHarness);
 *
 * expect(await chart.getPointCount()).toBe(6);
 * expect(await chart.getAxisTitles()).toEqual({ x: 'Price', y: 'Rating' });
 * expect((await chart.getPoints())[0]).toMatchObject({ x: 899, y: 4.1, marker: 'circle' });
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrScatterChartHarness extends ComponentHarness {
  static hostSelector = 'wr-scatter-chart';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrScatterChartHarnessFilters = {}): HarnessPredicate<WrScatterChartHarness> {
    return new HarnessPredicate(WrScatterChartHarness, options)
      .addOption('ariaLabel', options.ariaLabel, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
      )
      .addOption('seriesLabel', options.seriesLabel, async (harness, label) => {
        for (const series of await harness.getSeriesLabels()) {
          if (await HarnessPredicate.stringMatches(series, label)) return true;
        }
        return false;
      });
  }

  /** The plot's accessible name — the only name the drawing has. */
  async getAccessibleName(): Promise<string | null> {
    return (await this.locatorFor('.wr-scatter-chart__plot')()).getAttribute('aria-label');
  }

  /** Whether the legend is rendered (`showLegend`, and at least one series). */
  async hasLegend(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-scatter-chart__legend')()) !== null;
  }

  /** The series names from the legend, in order — hidden series included, since their rows stay. */
  async getSeriesLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-scatter-chart__legend .wr-chart-legend__label')();
    return Promise.all(labels.map(label => label.text()));
  }

  /**
   * The legend, as a {@link WrChartLegendHarness}: each row's marker and hidden state
   * and, with `toggleableLegend`, the toggles that show and hide a series.
   *
   * Throws when the chart draws no legend (`showLegend` off, or no series) rather than
   * answering with an empty one: {@link hasLegend} is the question for that.
   */
  async getLegendHarness(): Promise<WrChartLegendHarness> {
    const legend = await this.locatorForOptional(WrChartLegendHarness)();
    if (!legend) {
      throw new Error(
        'WrScatterChartHarness.getLegendHarness(): the chart draws no legend — `showLegend` is off or there are no ' +
          'series. Ask hasLegend() first.'
      );
    }
    return legend;
  }

  /**
   * How many points were drawn: every point of every series shown whose `x` and `y` are
   * finite. A hidden series draws none, and keeps its legend row.
   */
  async getPointCount(): Promise<number> {
    return (await this.locatorForAll('.wr-scatter-chart__point')()).length;
  }

  /**
   * Every drawn point, in DRAWING order — largest first, then by series — with its values,
   * its marker and the percentages the component placed its centre at.
   *
   * Throws on a marker missing any of what the component writes on every one, rather than
   * answering with a `NaN` a spec could compare against.
   */
  async getPoints(): Promise<WrScatterChartHarnessPoint[]> {
    const points = await this.locatorForAll(PointHarness)();
    return Promise.all(points.map(point => point.read()));
  }

  /** Whether the gridlines are drawn (`showGrid`). */
  async hasGrid(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-scatter-chart__grid-line')()) !== null;
  }

  /** The x-axis tick labels, left to right; `[]` with `showGrid` off. */
  async getXTicks(): Promise<string[]> {
    const ticks = await this.locatorForAll('.wr-scatter-chart__x-tick')();
    return Promise.all(ticks.map(tick => tick.text()));
  }

  /** The y-axis tick labels, top to bottom; `[]` with `showGrid` off. */
  async getYTicks(): Promise<string[]> {
    const ticks = await this.locatorForAll('.wr-scatter-chart__y-tick')();
    return Promise.all(ticks.map(tick => tick.text()));
  }

  /**
   * The axes' names as drawn. The chart draws a name only when `xLabel` or `yLabel` is
   * given, so the catalog's fallbacks, which the tooltip and the data table use, never
   * appear here.
   */
  async getAxisTitles(): Promise<WrScatterChartAxisTitles> {
    const x = await this.locatorForOptional('.wr-scatter-chart__x-title')();
    const y = await this.locatorForOptional('.wr-scatter-chart__y-title')();
    return { x: x ? await x.text() : null, y: y ? await y.text() : null };
  }

  /** Whether the hidden data table is rendered (`dataTable`). */
  async hasDataTable(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-chart-table')()) !== null;
  }

  /**
   * The data table's column headings: x, y, and size when a point shown has one.
   *
   * Throws when the chart renders no table (`dataTable` off), rather than answering with
   * no columns.
   */
  async getTableColumns(): Promise<string[]> {
    await this.assertDataTable('getTableColumns');
    const headings = await this.locatorForAll('.wr-chart-table thead th[scope="col"]')();
    return Promise.all(headings.map(heading => heading.text()));
  }

  /**
   * The data table's rows, one per point shown, as a screen reader walks them: the
   * series' name over its group, the row header and the cells. Hidden series leave the
   * table.
   *
   * Throws when the chart renders no table (`dataTable` off), for the reason
   * {@link getTableColumns} gives.
   */
  async getTableRows(): Promise<WrScatterChartTableRow[]> {
    await this.assertDataTable('getTableRows');
    const groups = await this.locatorForAll(TableGroupHarness)();
    return (await Promise.all(groups.map(group => group.read()))).flat();
  }

  /**
   * The plot's height in pixels, read off the `style` ATTRIBUTE the component wrote,
   * not through `getCssValue()`, which answers from the laid-out box and so differs
   * between jsdom and a browser.
   */
  async getPlotHeight(): Promise<number> {
    const style = await (await this.locatorFor('.wr-scatter-chart__plot')()).getAttribute('style');
    const match = /height:\s*([\d.]+)px/.exec(style ?? '');
    if (!match) {
      throw new Error(
        `WrScatterChartHarness.getPlotHeight(): no inline height on .wr-scatter-chart__plot (style: "${style ?? ''}"). ` +
          'The component writes one unconditionally, so its absence is the bug rather than a zero.'
      );
    }
    return Number.parseFloat(match[1]);
  }

  private async assertDataTable(method: string): Promise<void> {
    if (!(await this.hasDataTable())) {
      throw new Error(
        `WrScatterChartHarness.${method}(): the chart renders no data table — \`dataTable\` is off. Ask hasDataTable() first.`
      );
    }
  }
}
