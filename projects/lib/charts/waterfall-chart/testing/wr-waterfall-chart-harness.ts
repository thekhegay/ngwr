/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrWaterfallChartHarnessFilters, WrWaterfallChartStep, WrWaterfallChartTableRow } from './types';

const KINDS = ['increase', 'decrease', 'flat', 'total'] as const;

/** One custom property the component wrote into an inline `style`, as a finite number, or `null` when it is absent. */
function styleNumber(style: string | null, name: string): number | null {
  const match = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`).exec(style ?? '');
  const value = match ? Number.parseFloat(match[1]) : Number.NaN;
  return Number.isFinite(value) ? value : null;
}

/** A finite number off one attribute, or a sentence saying which one the element lacks. */
async function numberAttribute(element: TestElement, name: string, method: string): Promise<number> {
  const raw = await element.getAttribute(name);
  const value = raw === null ? Number.NaN : Number.parseFloat(raw);
  if (!Number.isFinite(value)) {
    throw new Error(
      `WrWaterfallChartHarness.${method}(): a step carries ${name}="${raw ?? ''}", which the component writes as a ` +
        'finite number on every step it draws.'
    );
  }
  return value;
}

/**
 * One step's column, so its kind, its figure, its bar and its connector are read off the
 * column they sit in rather than matched up by position across the chart: a step prints a
 * figure only with `showValues`, and the last one has no connector.
 */
class StepHarness extends ComponentHarness {
  static hostSelector = '.wr-waterfall-chart__step';

  async read(label: string): Promise<WrWaterfallChartStep> {
    const host = await this.host();
    const value = await this.locatorForOptional('.wr-waterfall-chart__value')();
    const connector = await this.locatorForOptional('.wr-waterfall-chart__connector')();
    const style = await host.getAttribute('style');
    const bottom = styleNumber(style, '--wr-waterfall-chart-lo');
    const top = styleNumber(style, '--wr-waterfall-chart-hi');
    if (bottom === null || top === null) {
      throw new Error(
        `WrWaterfallChartHarness.getSteps(): the step "${label}" carries no inline bar ends (style: "${style ?? ''}"). ` +
          'The component writes both on every step, a change of zero included, so their absence is the bug — ' +
          'reporting 0 would read as a bar on the frame.'
      );
    }
    return {
      label,
      kind: await StepHarness.kindOf(host, label),
      name: await host.getAttribute('aria-label'),
      value: value ? await value.text() : null,
      start: await numberAttribute(host, 'data-start', 'getSteps'),
      end: await numberAttribute(host, 'data-end', 'getSteps'),
      bottomPercent: bottom,
      topPercent: top,
      connected: connector !== null,
    };
  }

  private static async kindOf(host: TestElement, label: string): Promise<WrWaterfallChartStep['kind']> {
    for (const kind of KINDS) {
      if (await host.hasClass(`wr-waterfall-chart__step--${kind}`)) return kind;
    }
    throw new Error(
      `WrWaterfallChartHarness.getSteps(): the step "${label}" carries no kind modifier. The component gives every ` +
        'step one of `--increase`, `--decrease`, `--flat` and `--total`, and the stylesheet paints the figure by it.'
    );
  }
}

/** One body row of the chart's data table. */
class TableRowHarness extends ComponentHarness {
  static hostSelector = '.wr-chart-table tbody tr';

  async read(): Promise<WrWaterfallChartTableRow> {
    const header = await this.locatorFor('th[scope="row"]')();
    const cells = await this.locatorForAll('td')();
    return { header: await header.text(), cells: await Promise.all(cells.map(cell => cell.text())) };
  }
}

/**
 * Test harness for `<wr-waterfall-chart>`.
 *
 * **The bars are read as PERCENTAGES of the drawing, not as pixels.** Each step's two
 * ends are written inline as shares of the drawing's height from its bottom, which is the
 * one number that survives a test with no layout, and they are read off the `style`
 * ATTRIBUTE rather than through `getCssValue()`: in a browser that answers laid-out pixels
 * and in jsdom the declaration, with nothing to say which. The running totals before and
 * after each step are read off the `data-*` the component writes beside them, so a spec
 * can hold the arithmetic and the drawing apart — a total at the right figure and the
 * wrong height is exactly the defect worth catching. The hairline a change of zero keeps
 * is the stylesheet's floor, so no method reports it.
 *
 * **Two questions are not one.** A step's printed figure and its accessible name are read
 * separately ({@link WrWaterfallChartStep.value} and {@link WrWaterfallChartStep.name}):
 * the column is an `img`, so the name is what a screen reader gets, and asserting only
 * what is drawn would pass on a step that announces nothing.
 *
 * **What tells the kinds apart is read as such.** {@link WrWaterfallChartStep.kind} comes
 * off the modifier class, not off the colour, and the sign is in the printed figure — so a
 * spec can assert the channels that are not colour, which are the ones a reader without
 * hue relies on. A change of zero is `'flat'`, neither way, so a missing figure the chart
 * counted as nothing never reads as an increase.
 *
 * **No hover method.** The tooltip repeats the step's name, and the chip renders into the
 * overlay container with nothing tying it to this chart, so a query for it would answer
 * with whichever chart's chip is open. The same figures are in the names and in the data
 * table, which {@link getTableRows} reads.
 *
 * @example
 * ```ts
 * const chart = await loader.getHarness(WrWaterfallChartHarness);
 *
 * expect(await chart.getLabels()).toEqual(['Opening', 'Sales', 'Refunds', 'Closing']);
 * const steps = await chart.getSteps();
 * expect(steps[2]).toMatchObject({ kind: 'decrease', value: '−350', end: 5650 });
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrWaterfallChartHarness extends ComponentHarness {
  static hostSelector = 'wr-waterfall-chart';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrWaterfallChartHarnessFilters = {}): HarnessPredicate<WrWaterfallChartHarness> {
    return new HarnessPredicate(WrWaterfallChartHarness, options)
      .addOption('ariaLabel', options.ariaLabel, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
      )
      .addOption('stepLabel', options.stepLabel, async (harness, label) => {
        for (const step of await harness.getLabels()) {
          if (await HarnessPredicate.stringMatches(step, label)) return true;
        }
        return false;
      });
  }

  /** The chart's accessible name, on the `group` that holds the steps. */
  async getAccessibleName(): Promise<string | null> {
    return (await this.locatorFor('.wr-waterfall-chart__plot')()).getAttribute('aria-label');
  }

  /** How many steps the chart drew — one per step given. */
  async getStepCount(): Promise<number> {
    return (await this.locatorForAll('.wr-waterfall-chart__step')()).length;
  }

  /** The labels under the bars, in order — the full text, ellipsised on screen or not. */
  async getLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-waterfall-chart__label')();
    return Promise.all(labels.map(label => label.text()));
  }

  /**
   * Every step, in order: its label, its kind, what it prints and announces, the running
   * totals before and after it, and where its bar runs.
   *
   * Throws on a step missing anything the component writes on every one, rather than
   * answering with a `NaN` a spec could compare against.
   */
  async getSteps(): Promise<WrWaterfallChartStep[]> {
    const steps = await this.locatorForAll(StepHarness)();
    const labels = await this.getLabels();
    if (labels.length !== steps.length) {
      throw new Error(
        `WrWaterfallChartHarness.getSteps(): the chart draws ${steps.length} step(s) and ${labels.length} label(s). ` +
          'It renders one label per step, so the two lists line up or the template is broken.'
      );
    }
    return Promise.all(steps.map((step, i) => step.read(labels[i])));
  }

  /** Whether any figure is printed past a bar (`showValues`, and at least one step). */
  async hasValues(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-waterfall-chart__value')()) !== null;
  }

  /** How many connectors are drawn: one per step that the next one starts from, with `showConnectors`. */
  async getConnectorCount(): Promise<number> {
    return (await this.locatorForAll('.wr-waterfall-chart__connector')()).length;
  }

  /** Whether the gridlines are drawn (`showGrid`). */
  async hasGrid(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-waterfall-chart__grid-line')()) !== null;
  }

  /** The value axis' tick labels, top to bottom; `[]` with `showGrid` off. */
  async getTicks(): Promise<string[]> {
    const ticks = await this.locatorForAll('.wr-waterfall-chart__tick')();
    return Promise.all(ticks.map(tick => tick.text()));
  }

  /**
   * Where zero is — the line every total stands on — as the percentage of the drawing's
   * height from its bottom that the component wrote: `0` when nothing goes below zero.
   */
  async getZeroPercent(): Promise<number> {
    const style = await (await this.locatorFor('.wr-waterfall-chart__track')()).getAttribute('style');
    const zero = styleNumber(style, '--wr-waterfall-chart-zero');
    if (zero === null) {
      throw new Error(
        `WrWaterfallChartHarness.getZeroPercent(): no inline zero on .wr-waterfall-chart__track (style: "${style ?? ''}"). ` +
          'The component writes one unconditionally, so its absence is the bug rather than a zero line on the frame.'
      );
    }
    return zero;
  }

  /** Whether the hidden data table is rendered (`dataTable`). */
  async hasDataTable(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-chart-table')()) !== null;
  }

  /**
   * The data table's column headings: the change and the running total, in that order.
   *
   * Throws when the chart renders no table (`dataTable` off) rather than answering with
   * no columns.
   */
  async getTableColumns(): Promise<string[]> {
    await this.assertDataTable('getTableColumns');
    // The first cell is the corner over the row headers — what one row is — not a column
    // of figures.
    const cells = await this.locatorForAll('.wr-chart-table thead tr > *')();
    return Promise.all(cells.slice(1).map(cell => cell.text()));
  }

  /**
   * The data table's rows, one per step: its label, its change (`''` on a total) and the
   * running total after it, as a screen reader walks them.
   *
   * Throws when the chart renders no table (`dataTable` off), for the reason
   * {@link getTableColumns} gives.
   */
  async getTableRows(): Promise<WrWaterfallChartTableRow[]> {
    await this.assertDataTable('getTableRows');
    const rows = await this.locatorForAll(TableRowHarness)();
    return Promise.all(rows.map(row => row.read()));
  }

  /**
   * The plot's height in pixels, read off the `style` ATTRIBUTE the component wrote, not
   * through `getCssValue()`, which answers from the laid-out box and so differs between
   * jsdom and a browser.
   */
  async getPlotHeight(): Promise<number> {
    const style = await (await this.locatorFor('.wr-waterfall-chart__plot')()).getAttribute('style');
    const match = /height:\s*([\d.]+)px/.exec(style ?? '');
    if (!match) {
      throw new Error(
        `WrWaterfallChartHarness.getPlotHeight(): no inline height on .wr-waterfall-chart__plot (style: "${style ?? ''}"). ` +
          'The component writes one unconditionally, so its absence is the bug rather than a zero.'
      );
    }
    return Number.parseFloat(match[1]);
  }

  private async assertDataTable(method: string): Promise<void> {
    if (!(await this.hasDataTable())) {
      throw new Error(
        `WrWaterfallChartHarness.${method}(): the chart renders no data table — \`dataTable\` is off. Ask hasDataTable() first.`
      );
    }
  }
}
