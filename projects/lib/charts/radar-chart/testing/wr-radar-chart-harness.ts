/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import { WrChartLegendHarness } from 'ngwr/charts/chart-legend/testing';

import type { WrRadarChartHarnessFilters, WrRadarChartPolygon, WrRadarChartTableRow } from './types';

/**
 * One body row of the chart's data table, so its header and cells are read off the row
 * they sit in rather than matched up by position across the whole table.
 */
class TableRowHarness extends ComponentHarness {
  static hostSelector = '.wr-chart-table tbody tr';

  async read(): Promise<WrRadarChartTableRow> {
    const header = await this.locatorFor('th[scope="row"]')();
    const cells = await this.locatorForAll('td')();
    return { header: await header.text(), cells: await Promise.all(cells.map(cell => cell.text())) };
  }
}

/**
 * Test harness for `<wr-radar-chart>`.
 *
 * **The polygons' geometry is not read.** Where a vertex lands moves with the scale and
 * the drawing's box, so this harness counts what was drawn and reads what is TEXT: the
 * axis names, the ring values, the legend and the data table. Those are what a reader
 * gets, and they are what breaks when the data wiring does. The one thing it does read off
 * a path is whether the outline CLOSES ({@link getPolygons}): a series with a missing
 * value is drawn open across the gap and never filled, and an outline closed across a
 * value the series does not have is exactly the defect worth catching.
 *
 * **The tooltip cannot be opened from a spec.** It follows the pointer by its angle from
 * the drawing's centre, measured off the drawing's box, which jsdom reports as 0×0 — so
 * there is deliberately no `hoverAxis()`. The numbers it would show are in the data table
 * (`dataTable`), which {@link getTableRows} reads, and which is where a screen reader
 * finds them too.
 *
 * Labels are positioned by the stylesheet from numbers the component writes; with no
 * layout in jsdom there is no method for where a label sits or whether it was ellipsised.
 *
 * @example
 * ```ts
 * const chart = await loader.getHarness(WrRadarChartHarness);
 *
 * expect(await chart.getAxisLabels()).toEqual(['Speed', 'Power', 'Range']);
 * expect(await chart.getPolygonCount()).toBe(2);
 * expect((await chart.getPolygons()).every(p => p.closed)).toBe(true);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrRadarChartHarness extends ComponentHarness {
  static hostSelector = 'wr-radar-chart';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrRadarChartHarnessFilters = {}): HarnessPredicate<WrRadarChartHarness> {
    return new HarnessPredicate(WrRadarChartHarness, options)
      .addOption('ariaLabel', options.ariaLabel, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
      )
      .addOption('axisLabel', options.axisLabel, async (harness, label) => {
        for (const axis of await harness.getAxisLabels()) {
          if (await HarnessPredicate.stringMatches(axis, label)) return true;
        }
        return false;
      });
  }

  /**
   * The drawing's accessible name — the only name it has. Read off the `<svg>`, which
   * carries the `img` role, rather than off the surface round it: a name on the wrapper
   * would take the axis names beside the drawing out of the accessibility tree.
   */
  async getAccessibleName(): Promise<string | null> {
    return (await this.locatorFor('.wr-radar-chart__svg')()).getAttribute('aria-label');
  }

  /** The axis names round the drawing, clockwise from twelve o'clock, as given — the full text, ellipsised or not. */
  async getAxisLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-radar-chart__axis-label')();
    return Promise.all(labels.map(label => label.text()));
  }

  /** The ring values beside the first axis, from the outer ring in. `[]` with `showGrid` off. */
  async getRingLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-radar-chart__ring-label')();
    return Promise.all(labels.map(label => label.text()));
  }

  /** Whether the web is drawn (`showGrid`): the rings and the spokes. */
  async hasGrid(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-radar-chart__ring')()) !== null;
  }

  /**
   * How many series outlines were drawn: one per series shown that has at least one
   * value, and none at all with fewer than three axes.
   *
   * Worth comparing with the legend: both come from the same list, so a mismatch is a
   * series filtered out of one of them. The difference by design is a series hidden
   * through `hiddenSeries`, which keeps its legend row and draws no outline — the legend
   * harness's `getHidden()` names those.
   */
  async getPolygonCount(): Promise<number> {
    return (await this.locatorForAll('.wr-radar-chart__line')()).length;
  }

  /**
   * Every outline drawn, in order: the colour and dash the component wrote on it, and
   * whether it closes. Closed is read off the path's own closing command, which is what
   * makes a browser close the shape.
   */
  async getPolygons(): Promise<WrRadarChartPolygon[]> {
    const lines = await this.locatorForAll('.wr-radar-chart__line')();
    return Promise.all(
      lines.map(async line => ({
        color: await line.getAttribute('stroke'),
        dash: (await line.getAttribute('stroke-dasharray')) ?? '',
        closed: /Z\s*$/i.test((await line.getAttribute('d')) ?? ''),
      }))
    );
  }

  /**
   * How many polygons are filled (`fill`). Only a closed outline is ever filled, so with
   * `fill` on this is the number of closed outlines in {@link getPolygons}; anything more
   * is a fill drawn across a missing value.
   */
  async getAreaCount(): Promise<number> {
    return (await this.locatorForAll('.wr-radar-chart__area')()).length;
  }

  /** How many value dots were drawn across every series (`showDots`). A missing value has none. */
  async getDotCount(): Promise<number> {
    return (await this.locatorForAll('.wr-radar-chart__dot')()).length;
  }

  /** Whether the legend is rendered (`showLegend`, and at least one series). */
  async hasLegend(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-radar-chart__legend')()) !== null;
  }

  /**
   * The legend, as a {@link WrChartLegendHarness}: each row's name, its key and its hidden
   * state and, with `toggleableLegend`, the toggles that show and hide a series.
   *
   * Throws when the chart draws no legend (`showLegend` off, or no series) rather than
   * answering with an empty one: {@link hasLegend} is the question for that.
   */
  async getLegendHarness(): Promise<WrChartLegendHarness> {
    const legend = await this.locatorForOptional(WrChartLegendHarness)();
    if (!legend) {
      throw new Error(
        'WrRadarChartHarness.getLegendHarness(): the chart draws no legend — `showLegend` is off or there are no ' +
          'series. Ask hasLegend() first.'
      );
    }
    return legend;
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
   * The data table's rows, one per axis: its name and each series' own value, as a screen
   * reader walks them. A value outside a fixed `max` is drawn on the edge and tabulated as
   * itself, and a missing one is `''`.
   *
   * Throws when the chart renders no table (`dataTable` off), for the reason
   * {@link getTableColumns} gives.
   */
  async getTableRows(): Promise<WrRadarChartTableRow[]> {
    await this.assertDataTable('getTableRows');
    const rows = await this.locatorForAll(TableRowHarness)();
    return Promise.all(rows.map(row => row.read()));
  }

  /**
   * The drawing's diameter in pixels — `size` as the component wrote it — read off the
   * `style` ATTRIBUTE of the surface.
   *
   * NOT `getCssValue()`, which is `getComputedStyle()`: a computed read answers from the
   * LAID-OUT box, which agrees with the inline value in jsdom and disagrees in a browser,
   * where the drawing shrinks in a narrow container and sub-pixel rounding moves the rest.
   * A harness that answers differently in the two places it runs is worse than one that
   * refuses.
   */
  async getSize(): Promise<number> {
    const style = await (await this.locatorFor('.wr-radar-chart__surface')()).getAttribute('style');
    const match = /width:\s*([\d.]+)px/.exec(style ?? '');
    if (!match) {
      throw new Error(
        `WrRadarChartHarness.getSize(): no inline width on .wr-radar-chart__surface (style: "${style ?? ''}"). ` +
          'The component writes one unconditionally, so its absence is the bug rather than a zero.'
      );
    }
    return Number.parseFloat(match[1]);
  }

  private async assertDataTable(method: string): Promise<void> {
    if (!(await this.hasDataTable())) {
      throw new Error(
        `WrRadarChartHarness.${method}(): the chart renders no data table — \`dataTable\` is off. Ask hasDataTable() first.`
      );
    }
  }
}
