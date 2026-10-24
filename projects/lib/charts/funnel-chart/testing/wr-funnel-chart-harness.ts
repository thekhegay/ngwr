/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrFunnelChartHarnessFilters, WrFunnelChartStage, WrFunnelChartTableRow } from './types';

/** The `width: <n>%` the component writes onto a bar, out of its inline `style`. */
const BAR_WIDTH = /(?:^|;)\s*width\s*:\s*([\d.]+)%/;

/**
 * One stage row, so its label, its figures and its bar are read off the row they sit in
 * rather than matched up by position across the chart — a missing stage has no bar and a
 * stage with no figure no value, so lists of each would not line up.
 */
class StageHarness extends ComponentHarness {
  static hostSelector = '.wr-funnel-chart__stage';

  async read(): Promise<WrFunnelChartStage> {
    const host = await this.host();
    const label = await this.locatorFor('.wr-funnel-chart__label')();
    const value = await this.locatorForOptional('.wr-funnel-chart__value')();
    const overall = await this.locatorForOptional('.wr-funnel-chart__overall')();
    const bar = await this.locatorForOptional('.wr-funnel-chart__bar')();
    return {
      label: await label.text(),
      value: value ? await value.text() : null,
      fromFirst: overall ? await overall.text() : null,
      name: await host.getAttribute('aria-label'),
      widthPercent: bar ? StageHarness.widthOf(await bar.getAttribute('style')) : null,
    };
  }

  /** Parse a bar's declared width. See the class note on {@link WrFunnelChartHarness} for why this is not `getCssValue()`. */
  private static widthOf(style: string | null): number {
    const match = BAR_WIDTH.exec(style ?? '');
    if (!match) {
      throw new Error(
        `WrFunnelChartHarness.getStages(): a bar carries no inline width percentage (style: "${style ?? ''}"). ` +
          'The component writes one for every bar it draws, a stage of zero included, so its absence is the bug — ' +
          'reporting 0 would read as a stage of zero.'
      );
    }
    return Number.parseFloat(match[1]);
  }
}

/** The gap between two stages: the band and the share of the stage above. */
class StepHarness extends ComponentHarness {
  static hostSelector = '.wr-funnel-chart__step';

  async label(): Promise<string | null> {
    const label = await this.locatorForOptional('.wr-funnel-chart__step-label')();
    return label ? label.text() : null;
  }
}

/** One body row of the chart's data table. */
class TableRowHarness extends ComponentHarness {
  static hostSelector = '.wr-chart-table tbody tr';

  async read(): Promise<WrFunnelChartTableRow> {
    const header = await this.locatorFor('th[scope="row"]')();
    const cells = await this.locatorForAll('td')();
    return { header: await header.text(), cells: await Promise.all(cells.map(cell => cell.text())) };
  }
}

/**
 * Test harness for `<wr-funnel-chart>`.
 *
 * **The bars are read as PERCENTAGES of the track, not as pixels.** Each bar's width is
 * written inline as a share of the full width — the largest stage, or `max` — which is
 * the one number that survives a test with no layout, and the component's whole job. It is
 * read off the `style` ATTRIBUTE rather than through `getCssValue()`, which is
 * `getComputedStyle()`: in a browser that answers the laid-out pixels and in jsdom the
 * declaration, with nothing to say which, and with no inline width at all it would fall
 * back to the stylesheet's and read as a stage of zero. The hairline a stage of zero keeps
 * is the stylesheet's floor, so no method reports it.
 *
 * **Two questions are not one.** A stage's printed text and its accessible name are read
 * separately ({@link WrFunnelChartStage.value} and {@link WrFunnelChartStage.name}): the
 * row is an `img`, so the name is what a screen reader gets, and asserting only what is
 * drawn would pass on a stage that announces nothing. The shares printed between the bars
 * are `aria-hidden` for the same reason — {@link getStepLabels} reads what is drawn, the
 * names carry the same figures.
 *
 * **The bands' shapes are not read.** Each is a `clip-path` polygon from one bar's width
 * to the next, and asserting its corners would restate the bar widths this harness already
 * reads; {@link getBandCount} counts them, since where one is missing is the decision
 * worth catching — there is none next to a missing stage.
 *
 * **No hover method.** The tooltip repeats the stage's name, and the chip renders into
 * the overlay container with nothing tying it to this chart, so a query for it would
 * answer with whichever chart's chip is open. The same figures are in the names and in the
 * data table, which {@link getTableRows} reads.
 *
 * @example
 * ```ts
 * const chart = await loader.getHarness(WrFunnelChartHarness);
 *
 * expect(await chart.getLabels()).toEqual(['Visited', 'Signed up', 'Paid']);
 * expect((await chart.getStages())[1].widthPercent).toBe(40);
 * expect(await chart.getStepLabels()).toEqual(['40%', '15%']);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrFunnelChartHarness extends ComponentHarness {
  static hostSelector = 'wr-funnel-chart';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrFunnelChartHarnessFilters = {}): HarnessPredicate<WrFunnelChartHarness> {
    return new HarnessPredicate(WrFunnelChartHarness, options)
      .addOption('ariaLabel', options.ariaLabel, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
      )
      .addOption('stageLabel', options.stageLabel, async (harness, label) => {
        for (const stage of await harness.getLabels()) {
          if (await HarnessPredicate.stringMatches(stage, label)) return true;
        }
        return false;
      });
  }

  /** The chart's accessible name, on the `group` that holds the stages. */
  async getAccessibleName(): Promise<string | null> {
    return (await this.locatorFor('.wr-funnel-chart__plot')()).getAttribute('aria-label');
  }

  /** Every stage, from the top of the funnel down: what it prints, what it announces and how wide its bar is. */
  async getStages(): Promise<WrFunnelChartStage[]> {
    const stages = await this.locatorForAll(StageHarness)();
    return Promise.all(stages.map(stage => stage.read()));
  }

  /** How many stages the chart drew — one per stage given, a missing one included. */
  async getStageCount(): Promise<number> {
    return (await this.locatorForAll('.wr-funnel-chart__stage')()).length;
  }

  /** The labels beside the bars, in order — the full text, ellipsised on screen or not. */
  async getLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-funnel-chart__label')();
    return Promise.all(labels.map(label => label.text()));
  }

  /**
   * The share of the stage above printed in each gap between two bars, from the top down —
   * one entry per gap, so one fewer than there are stages. `null` where none is printed:
   * a stage with no such share, or a `conversion` that leaves it off the drawing.
   */
  async getStepLabels(): Promise<(string | null)[]> {
    const steps = await this.locatorForAll(StepHarness)();
    return Promise.all(steps.map(step => step.label()));
  }

  /**
   * How many bands join two bars: one per gap whose two stages both have a value. A missing
   * stage breaks the funnel on either side of it, since a band across it would draw a drop
   * the data never gave.
   */
  async getBandCount(): Promise<number> {
    return (await this.locatorForAll('.wr-funnel-chart__band')()).length;
  }

  /** Whether any value is printed beside a bar (`showValues`). */
  async hasValues(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-funnel-chart__value')()) !== null;
  }

  /** Whether the hidden data table is rendered (`dataTable`). */
  async hasDataTable(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-chart-table')()) !== null;
  }

  /**
   * The data table's column headings: the value, the share of the previous stage and the
   * share of the first, in that order.
   *
   * Throws when the chart renders no table (`dataTable` off) rather than answering with
   * no columns.
   */
  async getTableColumns(): Promise<string[]> {
    await this.assertDataTable('getTableColumns');
    // The first cell is the corner over the row headers — what one row is, a `<th>` or an
    // empty `<td>` — not a column of figures.
    const cells = await this.locatorForAll('.wr-chart-table thead tr > *')();
    return Promise.all(cells.slice(1).map(cell => cell.text()));
  }

  /**
   * The data table's rows, one per stage: its label and its three figures, as a screen
   * reader walks them. A stage above a fixed `max` is drawn full width and tabulated as
   * itself, and a figure the stage does not have is `''`.
   *
   * Throws when the chart renders no table (`dataTable` off), for the reason
   * {@link getTableColumns} gives.
   */
  async getTableRows(): Promise<WrFunnelChartTableRow[]> {
    await this.assertDataTable('getTableRows');
    const rows = await this.locatorForAll(TableRowHarness)();
    return Promise.all(rows.map(row => row.read()));
  }

  private async assertDataTable(method: string): Promise<void> {
    if (!(await this.hasDataTable())) {
      throw new Error(
        `WrFunnelChartHarness.${method}(): the chart renders no data table — \`dataTable\` is off. Ask hasDataTable() first.`
      );
    }
  }
}
