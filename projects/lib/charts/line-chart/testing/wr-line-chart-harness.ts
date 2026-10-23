/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import { WrChartLegendHarness } from 'ngwr/charts/chart-legend/testing';

import type { WrLineChartHarnessFilters, WrLineChartTableRow, WrLineChartTooltipRow } from './types';

/**
 * One body row of the chart's data table, so its header and cells are read off the row
 * they sit in rather than matched up by position across the whole table.
 */
class TableRowHarness extends ComponentHarness {
  static hostSelector = '.wr-chart-table tbody tr';

  async read(): Promise<WrLineChartTableRow> {
    const header = await this.locatorFor('th[scope="row"]')();
    const cells = await this.locatorForAll('td')();
    return { header: await header.text(), cells: await Promise.all(cells.map(cell => cell.text())) };
  }
}

/**
 * Test harness for `<wr-line-chart>`.
 *
 * **The lines are paths and the paths are not assertable.** A `d` attribute is a
 * rendering detail — it moves with the viewBox, the padding and the value range — so
 * this harness counts the lines and reads everything TEXTUAL instead: the legend, the
 * axis ticks, the x labels and the tooltip. Those are what a reader gets, and they
 * are what breaks when the data wiring does.
 *
 * **The tooltip cannot be opened from a spec, and the reason is worth knowing.** It
 * follows a `mousemove` over the plot, and the component turns the cursor's x into
 * an index by measuring the plot's box — which jsdom reports as 0×0, so every
 * synthetic move resolves to the same index or to none at all. There is deliberately
 * no `hoverAt()`; {@link getTooltipRows} reads the tooltip when something else has
 * opened it, which in practice means a browser-run harness.
 *
 * @example
 * ```ts
 * const chart = await loader.getHarness(WrLineChartHarness);
 *
 * expect(await chart.getSeriesLabels()).toEqual(['Revenue', 'Costs']);
 * expect(await chart.getLineCount()).toBe(2);
 * expect(await chart.getXLabels()).toEqual(['Jan', 'Feb', 'Mar']);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrLineChartHarness extends ComponentHarness {
  static hostSelector = 'wr-line-chart';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrLineChartHarnessFilters = {}): HarnessPredicate<WrLineChartHarness> {
    return new HarnessPredicate(WrLineChartHarness, options)
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
    return (await this.locatorFor('.wr-line-chart__plot')()).getAttribute('aria-label');
  }

  /** Whether the legend is rendered (`showLegend`, and at least one series). */
  async hasLegend(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-line-chart__legend')()) !== null;
  }

  /** The series names from the legend, in order — hidden series included, since their rows stay. */
  async getSeriesLabels(): Promise<string[]> {
    const items = await this.locatorForAll('.wr-line-chart__legend-item')();
    // A hidden row of a legend that does not toggle says "hidden" for a screen reader;
    // that word is its state, not part of the name.
    return Promise.all(items.map(item => item.text({ exclude: '.wr-chart-legend__sr-only' })));
  }

  /**
   * The legend, as a {@link WrChartLegendHarness}: each row's key and its hidden state
   * and, with `toggleableLegend`, the toggles that show and hide a series.
   *
   * Throws when the chart draws no legend (`showLegend` off, or no series) rather than
   * answering with an empty one: {@link hasLegend} is the question for that.
   */
  async getLegendHarness(): Promise<WrChartLegendHarness> {
    const legend = await this.locatorForOptional(WrChartLegendHarness)();
    if (!legend) {
      throw new Error(
        'WrLineChartHarness.getLegendHarness(): the chart draws no legend — `showLegend` is off or there are no ' +
          'series. Ask hasLegend() first.'
      );
    }
    return legend;
  }

  /**
   * How many lines were drawn.
   *
   * Worth comparing with {@link getSeriesLabels}: the legend and the paths come from
   * the same list, so a mismatch is a series that got filtered out of one of them. The
   * one difference by design is a series hidden through `hiddenSeries`, which keeps its
   * legend row and draws no line — the legend harness's `getHidden()` names those.
   */
  async getLineCount(): Promise<number> {
    return (await this.locatorForAll('.wr-line-chart__line')()).length;
  }

  /** How many point dots were drawn across every series (`showDots`). */
  async getDotCount(): Promise<number> {
    return (await this.locatorForAll('.wr-line-chart__dot')()).length;
  }

  /**
   * Whether the chart is in area mode (`showArea`), read off its
   * `wr-line-chart--area` modifier. {@link getAreaCount} says how many fills it drew:
   * an area chart with no run of two points draws none.
   */
  async hasArea(): Promise<boolean> {
    return (await this.host()).hasClass('wr-line-chart--area');
  }

  /**
   * How many fills were drawn under the lines with `showArea`: one per unbroken run of
   * two points or more in each series shown. A hole in a series splits its fill in two,
   * and a hidden series draws none. A fill's shape is a path like a line's and is not
   * read, for the reason given in the class note.
   */
  async getAreaCount(): Promise<number> {
    return (await this.locatorForAll('.wr-line-chart__area')()).length;
  }

  /** Whether the series are stacked (`stacked`), read off the `wr-line-chart--stacked` modifier. */
  async isStacked(): Promise<boolean> {
    return (await this.host()).hasClass('wr-line-chart--stacked');
  }

  /** Whether the hidden data table is rendered (`dataTable`). */
  async hasDataTable(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-chart-table')()) !== null;
  }

  /**
   * The data table's column headings: one per series shown, in order. Hidden series
   * leave the table.
   *
   * Throws when the chart renders no table (`dataTable` off) rather than answering with
   * no columns, which is also what a table of fully hidden series answers.
   */
  async getTableColumns(): Promise<string[]> {
    await this.assertDataTable('getTableColumns');
    const headings = await this.locatorForAll('.wr-chart-table thead th[scope="col"]')();
    return Promise.all(headings.map(heading => heading.text()));
  }

  /**
   * The data table's rows, one per x: the row header and each series' own value, as a
   * screen reader walks them. Under `stacked` they are still the series' own values, not
   * the stacked tops the lines are drawn at.
   *
   * Throws when the chart renders no table (`dataTable` off), for the reason
   * {@link getTableColumns} gives.
   */
  async getTableRows(): Promise<WrLineChartTableRow[]> {
    await this.assertDataTable('getTableRows');
    const rows = await this.locatorForAll(TableRowHarness)();
    return Promise.all(rows.map(row => row.read()));
  }

  /** Whether the horizontal grid lines are drawn (`showGrid`). */
  async hasGrid(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-line-chart__grid-line')()) !== null;
  }

  /** The y-axis tick labels, top to bottom as drawn. */
  async getYTicks(): Promise<string[]> {
    const ticks = await this.locatorForAll('.wr-line-chart__tick')();
    return Promise.all(ticks.map(tick => tick.text()));
  }

  /** The x-axis labels under the plot, in order. */
  async getXLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-line-chart__x-label')();
    return Promise.all(labels.map(label => label.text()));
  }

  /** Whether the hover tooltip is showing. */
  async hasTooltip(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-line-chart__tooltip')()) !== null;
  }

  /** The tooltip's heading — the x label of the hovered point — or `null` while it is closed. */
  async getTooltipLabel(): Promise<string | null> {
    const label = await this.locatorForOptional('.wr-line-chart__tooltip-label')();
    return label ? label.text() : null;
  }

  /** The tooltip's rows, one per series shown with a reading at that x, or `[]` while it is closed. */
  async getTooltipRows(): Promise<WrLineChartTooltipRow[]> {
    const names = await this.locatorForAll('.wr-line-chart__tooltip-name')();
    const values = await this.locatorForAll('.wr-line-chart__tooltip-value')();

    return Promise.all(
      names.map(async (name, index) => ({
        label: await name.text(),
        value: (await values[index]?.text()) ?? '',
      }))
    );
  }

  private async assertDataTable(method: string): Promise<void> {
    if (!(await this.hasDataTable())) {
      throw new Error(
        `WrLineChartHarness.${method}(): the chart renders no data table — \`dataTable\` is off. Ask hasDataTable() first.`
      );
    }
  }

  /**
   * The plot's height in pixels, read off the `style` ATTRIBUTE.
   *
   * NOT `getCssValue()`, which is `getComputedStyle()` — the same rule this
   * file's class note already states and this method alone broke. A computed
   * read answers from the LAID-OUT box, so it agrees with the inline value in
   * jsdom (which lays nothing out and echoes the declaration) and disagrees in a
   * browser, where sub-pixel rounding turns a declared 240 into 239.5. A harness
   * that answers differently in the two places it runs is worse than one that
   * refuses.
   */
  async getPlotHeight(): Promise<number> {
    const style = await (await this.locatorFor('.wr-line-chart__plot')()).getAttribute('style');
    const match = /height:\s*([\d.]+)px/.exec(style ?? '');
    if (!match) {
      throw new Error(
        `WrLineChartHarness.getPlotHeight(): no inline height on .wr-line-chart__plot (style: "${style ?? ''}"). ` +
          'The component writes one unconditionally, so its absence is the bug rather than a zero.'
      );
    }
    return Number.parseFloat(match[1]);
  }
}
