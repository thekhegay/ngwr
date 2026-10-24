/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrHeatmapChartCell, WrHeatmapChartHarnessFilters, WrHeatmapChartTableRow } from './types';

/** Whether any of `values` matches `pattern`. */
async function anyMatches(values: Promise<string[]>, pattern: string | RegExp): Promise<boolean> {
  for (const value of await values) {
    if (await HarnessPredicate.stringMatches(value, pattern)) return true;
  }
  return false;
}

/**
 * One body row of the chart's data table, so its header and cells are read off the row
 * they sit in rather than matched up by position across the whole table.
 */
class TableRowHarness extends ComponentHarness {
  static hostSelector = '.wr-chart-table tbody tr';

  async read(): Promise<WrHeatmapChartTableRow> {
    const header = await this.locatorFor('th[scope="row"]')();
    const cells = await this.locatorForAll('td')();
    return { header: await header.text(), cells: await Promise.all(cells.map(cell => cell.text())) };
  }
}

/**
 * Test harness for `<wr-heatmap-chart>`.
 *
 * **A cell's colour is not read.** Its paint is a `color-mix()` the stylesheet works out
 * from the level the component writes on it, and jsdom has no cascade to resolve one — a
 * computed read would answer the same for a cell on the right step and one on the wrong
 * one. What {@link getCells} reads instead is what the component WROTE: the value and the
 * position on `data-*`, the step's level off the `style` attribute, and whether the cell
 * is drawn empty. Those are what break when the data wiring does.
 *
 * **Whether a printed value fits is not read either.** The stylesheet hides a value wider
 * than its cell by wrapping it out of sight, which takes a layout jsdom does not have;
 * {@link getCells} gives the text the component printed, fitting or not.
 *
 * **Which column names are drawn is not read.** Where the names are wider than their
 * columns the chart draws every n-th one and keeps the rest out of sight, decided by
 * measuring the layout after render — jsdom has none, so every name is drawn there, and a
 * method asking would answer "all of them" for a chart that thins and for one that is
 * broken alike. {@link getColumnLabels} gives every name, drawn or not, as a screen reader
 * reads them.
 *
 * **There is no hover method.** The tooltip renders into the overlay container, tied to
 * nothing a harness could scope it by — the chip is `aria-hidden` and publishes no id —
 * and the numbers it shows are on the cells and in the data table, which
 * {@link getTableRows} reads, and which is where a screen reader finds them too.
 *
 * @example
 * ```ts
 * const chart = await loader.getHarness(WrHeatmapChartHarness);
 *
 * expect(await chart.getRowLabels()).toEqual(['Mon', 'Tue']);
 * expect((await chart.getCell(1, 0)).empty).toBe(true);
 * expect(await chart.getScaleLabels()).toEqual({ min: '0', max: '41' });
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrHeatmapChartHarness extends ComponentHarness {
  static hostSelector = 'wr-heatmap-chart';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrHeatmapChartHarnessFilters = {}): HarnessPredicate<WrHeatmapChartHarness> {
    return new HarnessPredicate(WrHeatmapChartHarness, options)
      .addOption('ariaLabel', options.ariaLabel, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
      )
      .addOption('rowLabel', options.rowLabel, (harness, label) => anyMatches(harness.getRowLabels(), label))
      .addOption('columnLabel', options.columnLabel, (harness, label) => anyMatches(harness.getColumnLabels(), label));
  }

  /**
   * The matrix's accessible name — the only name it has. Read off the cells, which carry
   * the `img` role, rather than off the host: a name on a wrapper round the row and column
   * names would take those names out of the accessibility tree.
   */
  async getAccessibleName(): Promise<string | null> {
    return (await this.locatorFor('.wr-heatmap-chart__cells')()).getAttribute('aria-label');
  }

  /** The rows' names, top to bottom, as drawn — the full text, ellipsised or not, positions included for unnamed rows. */
  async getRowLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-heatmap-chart__row-label')();
    return Promise.all(labels.map(label => label.text()));
  }

  /** The columns' names, from inline start — the full text of every one, ellipsised, out of sight or neither. */
  async getColumnLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-heatmap-chart__column-label')();
    return Promise.all(labels.map(label => label.text()));
  }

  /** How many cells were drawn: one per row and column, empty ones included. */
  async getCellCount(): Promise<number> {
    return (await this.locatorForAll('.wr-heatmap-chart__cell')()).length;
  }

  /**
   * Every cell, row by row: its position, its value, the step it was drawn on and the text
   * it prints. Read from `data-row`, `data-column` and `data-value`, which the component
   * writes for exactly this, and the level off the `style` ATTRIBUTE — never through
   * `getCssValue()`, which would resolve whatever the stylesheet says at exactly the
   * moment the binding is what broke.
   */
  async getCells(): Promise<WrHeatmapChartCell[]> {
    const cells = await this.locatorForAll('.wr-heatmap-chart__cell')();
    return Promise.all(
      cells.map(async cell => {
        const [row, column, value, style, empty, text] = await Promise.all([
          cell.getAttribute('data-row'),
          cell.getAttribute('data-column'),
          cell.getAttribute('data-value'),
          cell.getAttribute('style'),
          cell.hasClass('wr-heatmap-chart__cell--empty'),
          cell.text(),
        ]);
        const level = /--wr-heatmap-chart-level:\s*([\d.]+)/.exec(style ?? '');
        return {
          row: Number(row),
          column: Number(column),
          value: value === null ? null : Number(value),
          level: level ? Number(level[1]) : null,
          empty,
          text,
        };
      })
    );
  }

  /**
   * The cell at a row and a column, both from 0. Throws for a position the matrix does not
   * have rather than answering with an empty cell, which is a real thing a cell can be.
   */
  async getCell(row: number, column: number): Promise<WrHeatmapChartCell> {
    const cell = (await this.getCells()).find(c => c.row === row && c.column === column);
    if (!cell) {
      throw new Error(
        `WrHeatmapChartHarness.getCell(): there is no cell at row ${row}, column ${column}. ` +
          'Rows and columns count from 0; getRowLabels() and getColumnLabels() give the shape.'
      );
    }
    return cell;
  }

  /** Whether the legend is rendered (`showLegend`, and a scale or an empty cell to key). */
  async hasLegend(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-heatmap-chart__legend')()) !== null;
  }

  /**
   * The legend's two ends, the scale's minimum and maximum, compact from a thousand as the
   * cells print a value. A scale with no span is keyed by one figure, which is both ends.
   * Throws when the legend draws no scale — `showLegend` off, or no value and no bound to
   * scale — rather than answering with two empty strings.
   */
  async getScaleLabels(): Promise<{ min: string; max: string }> {
    await this.assertScale('getScaleLabels');
    const labels = await this.locatorForAll('.wr-heatmap-chart__legend > .wr-heatmap-chart__legend-label')();
    const [min, max = min] = await Promise.all(labels.map(label => label.text()));
    return { min, max };
  }

  /**
   * How many steps the legend keys — `steps`, as drawn, or 1 for a scale with no span.
   * Throws when it draws no scale, as {@link getScaleLabels} does.
   */
  async getStepCount(): Promise<number> {
    await this.assertScale('getStepCount');
    return (await this.locatorForAll('.wr-heatmap-chart__scale .wr-heatmap-chart__swatch')()).length;
  }

  /**
   * The name the legend keys the hatching with (`noDataLabel`), or `null` while it keys
   * none: no cell is empty, or the legend is off.
   */
  async getNoDataLabel(): Promise<string | null> {
    const key = await this.locatorForOptional('.wr-heatmap-chart__legend-empty')();
    return key ? key.text() : null;
  }

  /** Whether the hidden data table is rendered (`dataTable`). */
  async hasDataTable(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-chart-table')()) !== null;
  }

  /**
   * The data table's column headings: one per column, in order.
   *
   * Throws when the chart renders no table (`dataTable` off) rather than answering with no
   * columns, which is also what a matrix with no columns answers.
   */
  async getTableColumns(): Promise<string[]> {
    await this.assertDataTable('getTableColumns');
    const headings = await this.locatorForAll('.wr-chart-table thead th[scope="col"]')();
    return Promise.all(headings.map(heading => heading.text()));
  }

  /**
   * The data table's rows, one per row: its name and each column's value, as a screen
   * reader walks them. A value outside a given `min` or `max` is drawn on the end step and
   * tabulated as itself; an empty cell is `noDataLabel`.
   *
   * Throws when the chart renders no table (`dataTable` off), for the reason
   * {@link getTableColumns} gives.
   */
  async getTableRows(): Promise<WrHeatmapChartTableRow[]> {
    await this.assertDataTable('getTableRows');
    const rows = await this.locatorForAll(TableRowHarness)();
    return Promise.all(rows.map(row => row.read()));
  }

  private async assertScale(method: string): Promise<void> {
    if ((await this.locatorForOptional('.wr-heatmap-chart__scale')()) === null) {
      throw new Error(
        `WrHeatmapChartHarness.${method}(): the legend draws no scale — \`showLegend\` is off, or there is no value ` +
          'and no bound to scale. Ask hasLegend() first.'
      );
    }
  }

  private async assertDataTable(method: string): Promise<void> {
    if (!(await this.hasDataTable())) {
      throw new Error(
        `WrHeatmapChartHarness.${method}(): the chart renders no data table — \`dataTable\` is off. Ask hasDataTable() first.`
      );
    }
  }
}
