/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import { WrChartLegendHarness } from 'ngwr/charts/chart-legend/testing';

import type {
  WrBarChartBar,
  WrBarChartHarnessFilters,
  WrBarChartHarnessLine,
  WrBarChartSeriesBar,
  WrBarChartTableRow,
} from './types';

/** The `flex-grow: <share>` the component writes onto a bar, out of its inline `style`. */
const BAR_SHARE = /(?:^|;)\s*flex-grow\s*:\s*([\d.]+)/;

/** One `--wr-bar-chart-<name>: <value>` the component writes inline, out of a `style` attribute. */
const inlineProperty = (style: string | null, name: string): string | null =>
  new RegExp(`(?:^|;)\\s*--wr-bar-chart-${name}\\s*:\\s*([^;]+)`).exec(style ?? '')?.[1].trim() ?? null;

/** A share of the value axis, 0 to 1, as a percentage rounded clear of float noise. */
const percent = (share: number): number => Number((share * 100).toFixed(6));

/**
 * One category of a chart drawn from `series`, so each bar is read with the name of the
 * group it sits in rather than matched to a category by counting.
 */
class CategoryHarness extends ComponentHarness {
  static hostSelector = '.wr-bar-chart__category';

  async read(): Promise<WrBarChartSeriesBar[]> {
    const category = await (await this.host()).getAttribute('aria-label');
    const bars = await this.locatorForAll('.wr-bar-chart__series-bar')();
    const edges = await this.locatorForAll('.wr-bar-chart__series-bar .wr-bar-chart__edge rect')();
    return Promise.all(
      bars.map(async (bar, index) => {
        const style = await bar.getAttribute('style');
        return {
          category,
          name: await bar.getAttribute('aria-label'),
          startPercent: CategoryHarness.share(style, 'start'),
          sizePercent: CategoryHarness.share(style, 'size'),
          color: inlineProperty(style, 'color'),
          dash: (await edges[index]?.getAttribute('stroke-dasharray')) ?? '',
        };
      })
    );
  }

  /** One of the two shares every series bar is written, or a throw where the component wrote none. */
  private static share(style: string | null, name: 'start' | 'size'): number {
    const raw = inlineProperty(style, name);
    const share = raw === null ? Number.NaN : Number.parseFloat(raw);
    if (!Number.isFinite(share)) {
      throw new Error(
        `WrBarChartHarness.getSeriesBars(): a bar carries no inline --wr-bar-chart-${name} (style: "${style ?? ''}"). ` +
          'The component writes one for every bar, an empty one included, so its absence is the bug — ' +
          'reporting 0 would read as a bar on the axis minimum.'
      );
    }
    return percent(share);
  }
}

/**
 * One line drawn from `lines`, so its runs and its points are read off the group they sit
 * in rather than matched to a line by counting.
 */
class LineHarness extends ComponentHarness {
  static hostSelector = '.wr-bar-chart__line';

  async read(horizontal: boolean): Promise<WrBarChartHarnessLine> {
    const label = await (await this.host()).getAttribute('aria-label');
    const segments = await this.locatorForAll('.wr-bar-chart__line-segment')();
    const points = await this.locatorForAll('.wr-bar-chart__point')();
    const markers = await this.locatorForAll('.wr-bar-chart__point > path')();
    return {
      label,
      color: (await markers[0]?.getAttribute('fill')) ?? null,
      dash: segments.length === 0 ? null : ((await segments[0].getAttribute('stroke-dasharray')) ?? ''),
      marker: (await points[0]?.getAttribute('data-marker')) ?? null,
      segmentCount: segments.length,
      points: await Promise.all(
        points.map(async point => {
          // Standing up the value axis runs up the box, so it is read from the bottom;
          // lying down it runs along it. The RTL mirror is the stylesheet's, and leaves
          // the written position alone.
          const position = horizontal
            ? LineHarness.position(await point.getAttribute('x'), 'x')
            : 100 - LineHarness.position(await point.getAttribute('y'), 'y');
          return { name: await point.getAttribute('aria-label'), valuePercent: Number(position.toFixed(6)) };
        })
      ),
    };
  }

  /** One coordinate the component wrote as a percentage, or a throw where it wrote none. */
  private static position(raw: string | null, axis: 'x' | 'y'): number {
    const match = /^(-?[\d.]+)%$/.exec(raw ?? '');
    if (!match) {
      throw new Error(
        `WrBarChartHarness.getLines(): a point carries no percentage ${axis} (${axis}="${raw ?? ''}"). ` +
          'The component writes one for every point, so its absence is the bug — reporting 0 would read ' +
          'as a point on an end of the axis.'
      );
    }
    return Number.parseFloat(match[1]);
  }
}

/**
 * One body row of the chart's data table, so its header and cells are read off the row
 * they sit in rather than matched up by position across the whole table.
 */
class TableRowHarness extends ComponentHarness {
  static hostSelector = '.wr-chart-table tbody tr';

  async read(): Promise<WrBarChartTableRow> {
    const header = await this.locatorFor('th[scope="row"]')();
    const cells = await this.locatorForAll('td')();
    return { header: await header.text(), cells: await Promise.all(cells.map(cell => cell.text())) };
  }
}

/**
 * Test harness for `<wr-bar-chart>`.
 *
 * **The bars are read as PERCENTAGES, not as pixels.** Each bar's share of the value
 * axis — of the chart's maximum, while zero is the axis minimum — is written inline, as
 * its `flex-grow` from 0 to 1 and reported here times 100, which is the one number that
 * survives a test with no layout — and it is also the component's whole job, since
 * the maximum is either given or derived from the data. That share is read off the
 * `style` ATTRIBUTE rather than through `getCssValue()`, and the difference is not
 * cosmetic: `getCssValue()` is `getComputedStyle()`, which answered a used height
 * in pixels in a real browser and the declared value in jsdom, with no error to say
 * which one you got — and with no inline share at all it falls back to the
 * stylesheet's `0`, which reads as an empty bar.
 *
 * **The visible label row is decoration.** Every column carries `role="img"` with
 * the label AND the value in its name, and the printed labels underneath are
 * `aria-hidden` — so {@link WrBarChartBar.name} is what a screen reader gets and
 * {@link WrBarChartBar.label} is what is drawn. Asserting only the second would pass
 * on a chart that announces nothing.
 *
 * **`data` and `series` are read by different methods**, because they draw different
 * things. {@link getBars} reads the single-series columns and is `[]` for a chart drawn
 * from `series`; {@link getSeriesBars} reads the series' bars — each with the category
 * group it is in, its own name, and its place along the value axis as two percentages
 * the component wrote inline — and is `[]` for a chart drawn from `data`. The labels,
 * the plot height and the printed values read the same in both.
 *
 * **`lines` are read by {@link getLines}**, each with its points' names and their place
 * along the value axis — on the same percentage scale as the bars', so a point and a bar
 * can be held against each other — and {@link getLineCount} counts the lines drawn. A line
 * below zero lifts the zero line every bar starts at, which {@link getZeroPercent} reads.
 *
 * **What it cannot read** is where anything lands: jsdom lays nothing out, so there is no
 * method for a bar's pixels, for whether a name was ellipsised, or for which side of the
 * plot the gutter sits on under RTL. {@link getOrientation} reads the orientation the
 * component declared. The tooltip opens on a category's `mouseenter`, which a spec can
 * dispatch, but what it SAYS is in the data table, which {@link getTableRows} reads.
 *
 * @example
 * ```ts
 * const chart = await loader.getHarness(WrBarChartHarness);
 *
 * expect(await chart.getLabels()).toEqual(['Mon', 'Tue', 'Wed']);
 * expect((await chart.getBars())[1].heightPercent).toBe(100);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrBarChartHarness extends ComponentHarness {
  static hostSelector = 'wr-bar-chart';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrBarChartHarnessFilters = {}): HarnessPredicate<WrBarChartHarness> {
    return new HarnessPredicate(WrBarChartHarness, options)
      .addOption('barLabel', options.barLabel, async (harness, label) => {
        for (const printed of await harness.getLabels()) {
          if (await HarnessPredicate.stringMatches(printed, label)) return true;
        }
        return false;
      })
      .addOption('ariaLabel', options.ariaLabel, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
      );
  }

  /** The chart's accessible name, on its plot: `ariaLabel`, or the catalog's "Bar chart". */
  async getAccessibleName(): Promise<string | null> {
    return (await this.locatorFor('.wr-bar-chart__plot')()).getAttribute('aria-label');
  }

  /** Which way the bars run, as the component declared it on its host. */
  async getOrientation(): Promise<'vertical' | 'horizontal'> {
    return (await (await this.host()).hasClass('wr-bar-chart--horizontal')) ? 'horizontal' : 'vertical';
  }

  /** Whether the chart piles its series (`stacked`) — only ever true for a chart drawn from `series`. */
  async isStacked(): Promise<boolean> {
    return (await this.host()).hasClass('wr-bar-chart--stacked');
  }

  /** Every column, in data order. `[]` for a chart drawn from `series` — see {@link getSeriesBars}. */
  async getBars(): Promise<WrBarChartBar[]> {
    const columns = await this.locatorForAll('.wr-bar-chart__column')();
    const bars = await this.locatorForAll('.wr-bar-chart__bar')();
    const labels = await this.getLabels();

    return Promise.all(
      columns.map(async (column, index) => {
        const value = await column.text();
        return {
          label: labels[index] ?? '',
          value: value === '' ? null : value,
          name: await column.getAttribute('aria-label'),
          heightPercent: WrBarChartHarness.heightPercentOf(await bars[index].getAttribute('style')),
        };
      })
    );
  }

  /** Parse one bar's declared share. See the class note on why this is not `getCssValue()`. */
  private static heightPercentOf(style: string | null): number {
    const match = BAR_SHARE.exec(style ?? '');
    if (!match) {
      throw new Error(
        `WrBarChartHarness.getBars(): a bar carries no inline share (style: "${style ?? ''}"). ` +
          'The component writes one for every bar, an empty one included, so its absence is the bug — ' +
          'reporting 0 would read as a bar with nothing in it.'
      );
    }
    // Rounded, so a share of 0.07 reads as 7 rather than 7.000000000000001.
    return Number((Number.parseFloat(match[1]) * 100).toFixed(6));
  }

  /**
   * Where zero is along the value axis, as a percentage of the axis from its minimum: the
   * line every bar starts at, read off the share the component wrote on the track. 0 until
   * a value — a `series` bar, a line, or a `data` bar beside `lines` — goes below zero.
   *
   * Throws for a chart drawn from `data` standing up without `lines`, which draws no track:
   * its bars always stand on the bottom of the plot, and answering 0 there would read the
   * same for a chart that failed to write the share it does write everywhere else.
   */
  async getZeroPercent(): Promise<number> {
    const track = await this.locatorForOptional('.wr-bar-chart__track')();
    if (!track) {
      throw new Error(
        'WrBarChartHarness.getZeroPercent(): the chart draws no track — it is drawn from `data` standing up ' +
          'without `lines`, where every bar stands on the bottom of the plot.'
      );
    }
    const style = await track.getAttribute('style');
    const raw = inlineProperty(style, 'zero');
    const share = raw === null ? Number.NaN : Number.parseFloat(raw);
    if (!Number.isFinite(share)) {
      throw new Error(
        `WrBarChartHarness.getZeroPercent(): the track carries no inline --wr-bar-chart-zero (style: "${style ?? ''}"). ` +
          'The component writes one whenever it draws a track, so its absence is the bug — reporting 0 would ' +
          'read as zero on the axis minimum.'
      );
    }
    return percent(share);
  }

  /** The category names the chart prints — under the columns, or in the gutter sideways — in order. */
  async getLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-bar-chart__label')();
    return Promise.all(labels.map(label => label.text()));
  }

  /**
   * What each `data` column announces — the label and the value together. `[]` for a
   * chart drawn from `series`, whose bars {@link getSeriesBars} reads, each with its own
   * `name`.
   */
  async getAccessibleNames(): Promise<(string | null)[]> {
    const columns = await this.locatorForAll('.wr-bar-chart__column')();
    return Promise.all(columns.map(column => column.getAttribute('aria-label')));
  }

  /** How many columns the chart drew from `data`. `0` for a chart drawn from `series`. */
  async getBarCount(): Promise<number> {
    return (await this.locatorForAll('.wr-bar-chart__column')()).length;
  }

  /** Whether values are printed at the bars (`showValues`). */
  async hasValues(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-bar-chart__value')()) !== null;
  }

  /**
   * The plot's height in pixels, read off the `style` ATTRIBUTE: the `height` the
   * component wrote. Lying down (`orientation="horizontal"`) it is written as the plot's
   * `min-height`, since rows that need more room grow the plot past it — and how far is
   * layout, which this method does not read.
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
    const style = await (await this.locatorFor('.wr-bar-chart__plot')()).getAttribute('style');
    const match = /(?:^|;)\s*(?:min-)?height:\s*([\d.]+)px/.exec(style ?? '');
    if (!match) {
      throw new Error(
        `WrBarChartHarness.getPlotHeight(): no inline height or min-height on .wr-bar-chart__plot (style: "${style ?? ''}"). ` +
          'The component writes one unconditionally, so its absence is the bug rather than a zero.'
      );
    }
    return Number.parseFloat(match[1]);
  }

  /**
   * Every bar a chart drawn from `series` draws, category by category and within one in
   * series order: grouped, a bar per series shown with a value there; stacked, the same
   * bars piled. A missing value draws none, and a hidden series none at all.
   *
   * The two percentages are read off the `style` ATTRIBUTE, the shares the component
   * wrote, for the reason {@link getBars} reads its share there. A bar standing on zero
   * starts at the zero line's own share, which moves up as soon as a value goes below
   * zero — compare bars with each other, or with a chart whose values are all positive,
   * where zero is the axis minimum.
   */
  async getSeriesBars(): Promise<WrBarChartSeriesBar[]> {
    const categories = await this.locatorForAll(CategoryHarness)();
    return (await Promise.all(categories.map(category => category.read()))).flat();
  }

  /**
   * The values printed at the bars, in the order drawn: above each `data` column, or past
   * the end of each series bar — a pile's total for each sign under `stacked`. `[]` with
   * `showValues` off. The hidden copies the plot keeps its room from are not read.
   */
  async getValues(): Promise<string[]> {
    const values = await this.locatorForAll(
      '.wr-bar-chart__column > .wr-bar-chart__value, .wr-bar-chart__lane > .wr-bar-chart__value'
    )();
    return Promise.all(values.map(value => value.text()));
  }

  /** How many of `lines` the chart draws: a hidden line draws nothing, so it is not counted. */
  async getLineCount(): Promise<number> {
    return (await this.locatorForAll('.wr-bar-chart__line')()).length;
  }

  /**
   * Every line the chart draws, in the order of `lines`, hidden ones left out: its name,
   * colour, dash and marker, how many runs it is drawn in, and its points, each with its
   * name and its place along the value axis as a percentage the component wrote. A
   * missing value has no point and breaks the line, which {@link WrBarChartHarnessLine.segmentCount}
   * shows. `[]` for a chart without lines.
   */
  async getLines(): Promise<WrBarChartHarnessLine[]> {
    const horizontal = (await this.getOrientation()) === 'horizontal';
    const lines = await this.locatorForAll(LineHarness)();
    return Promise.all(lines.map(line => line.read(horizontal)));
  }

  /** Whether the legend is rendered (`series` or `lines`, and `showLegend`). */
  async hasLegend(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-bar-chart__legend')()) !== null;
  }

  /**
   * The legend, as a {@link WrChartLegendHarness}: each row's name, its key and its hidden
   * state and, with `toggleableLegend`, the toggles that show and hide a series.
   *
   * Throws when the chart draws no legend (drawn from `data` without `lines`, or `showLegend` off) rather
   * than answering with an empty one: {@link hasLegend} is the question for that.
   */
  async getLegendHarness(): Promise<WrChartLegendHarness> {
    const legend = await this.locatorForOptional(WrChartLegendHarness)();
    if (!legend) {
      throw new Error(
        'WrBarChartHarness.getLegendHarness(): the chart draws no legend — it is drawn from `data` without ' +
          '`lines`, or `showLegend` is off. Ask hasLegend() first.'
      );
    }
    return legend;
  }

  /** Whether the hidden data table is rendered (`dataTable`, with `series` or `data`). */
  async hasDataTable(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-chart-table')()) !== null;
  }

  /**
   * The data table's column headings: one per series shown — or one for `data`'s bars,
   * "Value" (`barChart.value`) — then one per line shown, in order. Hidden series and lines
   * leave the table.
   *
   * Throws when the chart renders no table rather than answering with no columns, which
   * is also what a table of fully hidden series answers.
   */
  async getTableColumns(): Promise<string[]> {
    await this.assertDataTable('getTableColumns');
    const headings = await this.locatorForAll('.wr-chart-table thead th[scope="col"]')();
    return Promise.all(headings.map(heading => heading.text()));
  }

  /**
   * The data table's rows, one per category: its name, each series' own value — or the
   * bar's, with `data` — and each line's, as a screen reader walks them: stacked or not,
   * and past a fixed `max` or not. A missing value is `''`.
   *
   * Throws when the chart renders no table, for the reason {@link getTableColumns} gives.
   */
  async getTableRows(): Promise<WrBarChartTableRow[]> {
    await this.assertDataTable('getTableRows');
    const rows = await this.locatorForAll(TableRowHarness)();
    return Promise.all(rows.map(row => row.read()));
  }

  private async assertDataTable(method: string): Promise<void> {
    if (!(await this.hasDataTable())) {
      throw new Error(
        `WrBarChartHarness.${method}(): the chart renders no data table — \`dataTable\` is off, or there ` +
          'is nothing to tabulate. Ask hasDataTable() first.'
      );
    }
  }
}
