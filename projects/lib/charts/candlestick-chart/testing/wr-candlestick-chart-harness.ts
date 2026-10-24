/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type {
  WrCandlestickChartHarnessCandle,
  WrCandlestickChartHarnessFilters,
  WrCandlestickChartTableRow,
} from './types';

/** One row of the data table: its `<th scope="row">` and its cells. */
class TableRowHarness extends ComponentHarness {
  static hostSelector = '.wr-chart-table tbody tr';

  async read(): Promise<WrCandlestickChartTableRow> {
    const header = await this.locatorFor('th[scope="row"]')();
    const cells = await this.locatorForAll('td')();
    return { header: await header.text(), cells: await Promise.all(cells.map(cell => cell.text())) };
  }
}

/** One candle: the box the component placed from the high to the low, with its prices beside its placement. */
class CandleHarness extends ComponentHarness {
  static hostSelector = '.wr-candlestick-chart__candle';

  async read(): Promise<WrCandlestickChartHarnessCandle> {
    const candle = await this.host();
    const increase = await candle.hasClass('wr-candlestick-chart__candle--increase');
    const decrease = await candle.hasClass('wr-candlestick-chart__candle--decrease');
    if (increase === decrease) {
      const carries = increase ? 'both' : 'neither';
      throw new Error(
        `WrCandlestickChartHarness.getCandles(): a candle carries ${carries} of \`--increase\` and \`--decrease\`, ` +
          'and the component writes exactly one, which decides its fill.'
      );
    }
    const style = (await candle.getAttribute('style')) ?? '';
    return {
      index: await numberAttribute(candle, 'data-index'),
      open: await numberAttribute(candle, 'data-open'),
      high: await numberAttribute(candle, 'data-high'),
      low: await numberAttribute(candle, 'data-low'),
      close: await numberAttribute(candle, 'data-close'),
      direction: increase ? 'increase' : 'decrease',
      left: styleNumber(style, 'left', '%'),
      top: styleNumber(style, 'top', '%'),
      height: styleNumber(style, 'height', '%'),
      upperWick: styleNumber(style, '--wr-candlestick-chart-upper', ''),
      lowerWick: styleNumber(style, '--wr-candlestick-chart-lower', ''),
    };
  }
}

/** A finite number off one attribute, or a sentence saying which one the candle lacks. */
async function numberAttribute(element: TestElement, name: string): Promise<number> {
  const raw = await element.getAttribute(name);
  const value = raw === null ? Number.NaN : Number.parseFloat(raw);
  if (!Number.isFinite(value)) {
    throw new Error(
      `WrCandlestickChartHarness.getCandles(): a candle carries ${name}="${raw ?? ''}", which the component writes ` +
        'as a finite number on every candle it draws.'
    );
  }
  return value;
}

/**
 * One declaration's number off the `style` ATTRIBUTE the component wrote, not through
 * `getCssValue()`, which answers from the cascade and so reads a stylesheet's own default
 * at exactly the moment the inline write is what broke.
 */
function styleNumber(style: string, property: string, unit: '%' | ''): number {
  const escaped = property.replace(/[-]/g, '\\-');
  const match = new RegExp(`(?:^|;)\\s*${escaped}:\\s*(-?[\\d.]+)${unit}\\s*(?:;|$)`).exec(style);
  if (!match) {
    throw new Error(
      `WrCandlestickChartHarness.getCandles(): no inline ${property} on a candle (style: "${style}"). The component ` +
        'writes one on every candle it draws, so its absence is the bug rather than a zero.'
    );
  }
  return Number.parseFloat(match[1]);
}

/**
 * Test harness for `<wr-candlestick-chart>`.
 *
 * **Candles are read off what the component WROTE, never off a layout.** jsdom lays
 * nothing out, so a measured box would read 0 for a working chart and a broken one
 * alike. Every candle is a box the component places by percentage, and it carries its
 * period's prices in `data-*` attributes beside that placement — so {@link getCandles}
 * answers both questions a spec has: which period is this, and where did the chart put
 * it. A candle with the right prices at the wrong height is exactly the defect worth
 * catching. Hollow or filled is read as the `--increase` / `--decrease` modifier the
 * stylesheet draws it from; what that paints is a browser's question.
 *
 * **A body's width is not read**: it is a share of the slot that the stylesheet holds
 * between 1px and a ceiling, and jsdom has no stylesheet. {@link isDense} reads the
 * decision the component made from that width, which in a unit test is made against
 * the 560px drawing it assumes before a browser measures one — as are the x labels
 * {@link getXLabels} reads.
 *
 * **There is deliberately no hover method.** The tooltip opens on the slot under the
 * pointer, measured against the drawing's box, which jsdom reports as 0×0 — so every
 * synthetic move resolves to nothing, and a `hoverCandle()` would answer "no tooltip"
 * for a working chart. A spec that needs the tooltip stubs the drawing's and the plot's
 * `getBoundingClientRect` and dispatches the `mousemove` itself, as the component's own
 * spec does.
 *
 * @example
 * ```ts
 * const chart = await loader.getHarness(WrCandlestickChartHarness);
 *
 * expect(await chart.getCandleCount()).toBe(20);
 * expect((await chart.getCandles())[0]).toMatchObject({ open: 102, close: 106, direction: 'increase' });
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrCandlestickChartHarness extends ComponentHarness {
  static hostSelector = 'wr-candlestick-chart';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrCandlestickChartHarnessFilters = {}): HarnessPredicate<WrCandlestickChartHarness> {
    return new HarnessPredicate(WrCandlestickChartHarness, options).addOption(
      'ariaLabel',
      options.ariaLabel,
      (harness, label) => HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
    );
  }

  /** The plot's accessible name — the only name the drawing has. */
  async getAccessibleName(): Promise<string | null> {
    return (await this.locatorFor('.wr-candlestick-chart__plot')()).getAttribute('aria-label');
  }

  /** How many candles were drawn: every period whose open, high, low and close are all finite. */
  async getCandleCount(): Promise<number> {
    return (await this.locatorForAll('.wr-candlestick-chart__candle')()).length;
  }

  /**
   * Every drawn candle, oldest first, with its prices, its direction and the percentages
   * the component placed it at.
   *
   * Throws on a candle missing any of what the component writes on every one, rather
   * than answering with a `NaN` a spec could compare against.
   */
  async getCandles(): Promise<WrCandlestickChartHarnessCandle[]> {
    const candles = await this.locatorForAll(CandleHarness)();
    return Promise.all(candles.map(candle => candle.read()));
  }

  /**
   * Whether the chart is drawn dense: its bodies too narrow to leave hollow, so a rising
   * one is dotted. Decided on the measured body in a browser, and on the assumed 560px
   * drawing before that — which is every unit test.
   */
  async isDense(): Promise<boolean> {
    return (await this.host()).hasClass('wr-candlestick-chart--dense');
  }

  /** Whether the gridlines are drawn (`showGrid`). */
  async hasGrid(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-candlestick-chart__grid-line')()) !== null;
  }

  /** The y-axis tick labels, top to bottom; `[]` with `showGrid` off. */
  async getYTicks(): Promise<string[]> {
    const ticks = await this.locatorForAll('.wr-candlestick-chart__y-tick')();
    return Promise.all(ticks.map(tick => tick.text()));
  }

  /**
   * The period labels printed under the candles, left to right — every n-th where they
   * do not all fit, and with `showGrid` off too, since they are the time axis. The hidden
   * copy the chart measures is not one of them.
   */
  async getXLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-candlestick-chart__x-label')();
    return Promise.all(labels.map(label => label.text()));
  }

  /** Whether the hidden data table is rendered (`dataTable`). */
  async hasDataTable(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-chart-table')()) !== null;
  }

  /**
   * The data table's column headings: the open, the high, the low and the close.
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
   * The data table's rows, one per period — a period with no candle included — as a
   * screen reader walks them: the period, then its four prices.
   *
   * Throws when the chart renders no table (`dataTable` off), for the reason
   * {@link getTableColumns} gives.
   */
  async getTableRows(): Promise<WrCandlestickChartTableRow[]> {
    await this.assertDataTable('getTableRows');
    const rows = await this.locatorForAll(TableRowHarness)();
    return Promise.all(rows.map(row => row.read()));
  }

  /**
   * The plot's height in pixels, read off the `style` ATTRIBUTE the component wrote,
   * not through `getCssValue()`, which answers from the laid-out box and so differs
   * between jsdom and a browser.
   */
  async getPlotHeight(): Promise<number> {
    const style = await (await this.locatorFor('.wr-candlestick-chart__plot')()).getAttribute('style');
    const match = /height:\s*([\d.]+)px/.exec(style ?? '');
    if (!match) {
      throw new Error(
        `WrCandlestickChartHarness.getPlotHeight(): no inline height on .wr-candlestick-chart__plot (style: "${style ?? ''}"). ` +
          'The component writes one unconditionally, so its absence is the bug rather than a zero.'
      );
    }
    return Number.parseFloat(match[1]);
  }

  private async assertDataTable(method: string): Promise<void> {
    if (!(await this.hasDataTable())) {
      throw new Error(
        `WrCandlestickChartHarness.${method}(): the chart renders no data table — \`dataTable\` is off. Ask hasDataTable() first.`
      );
    }
  }
}
