/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type {
  WrBoxplotChartAxisTitles,
  WrBoxplotChartHarnessFilters,
  WrBoxplotChartHarnessGroup,
  WrBoxplotChartHarnessPosition,
  WrBoxplotChartHarnessStats,
  WrBoxplotChartTableRow,
} from './types';

/** The value of one `--wr-boxplot-chart-*` custom property off an element's `style` ATTRIBUTE, or `null`. */
async function styleProp(element: TestElement, name: string): Promise<string | null> {
  const style = (await element.getAttribute('style')) ?? '';
  const match = new RegExp(`--wr-boxplot-chart-${name}:\\s*([^;]+)`).exec(style);
  return match ? match[1].trim() : null;
}

/** A finite number off one custom property, or a sentence saying which one a mark lacks. */
async function numberProp(element: TestElement, name: string, what: string): Promise<number> {
  const raw = await styleProp(element, name);
  const value = raw === null ? Number.NaN : Number.parseFloat(raw);
  if (!Number.isFinite(value)) {
    throw new Error(
      `WrBoxplotChartHarness.getGroups(): ${what} carries --wr-boxplot-chart-${name}: "${raw ?? ''}", which the ` +
        'component writes as a finite number on every one it draws.'
    );
  }
  return value;
}

/** A finite number off one attribute, or a sentence saying which one a group lacks. */
async function numberAttribute(element: TestElement, name: string): Promise<number> {
  const raw = await element.getAttribute(name);
  const value = raw === null ? Number.NaN : Number.parseFloat(raw);
  if (!Number.isFinite(value)) {
    throw new Error(
      `WrBoxplotChartHarness.getGroups(): a drawn group carries ${name}="${raw ?? ''}", which the component writes ` +
        'as a finite number on every group with a box.'
    );
  }
  return value;
}

/** One row of the data table: a group's name and its cells. */
class TableRowHarness extends ComponentHarness {
  static hostSelector = '.wr-chart-table tbody tr';

  async read(): Promise<WrBoxplotChartTableRow> {
    const header = await this.locatorFor('th[scope="row"]')();
    const cells = await this.locatorForAll('td')();
    return { header: await header.text(), cells: await Promise.all(cells.map(cell => cell.text())) };
  }
}

/** One group's slot: the element the component placed, its numbers and its marks inside it. */
class GroupHarness extends ComponentHarness {
  static hostSelector = '.wr-boxplot-chart__group';

  private readonly box = this.locatorForOptional('.wr-boxplot-chart__box');
  private readonly upperWhisker = this.locatorForOptional('.wr-boxplot-chart__whisker--upper');
  private readonly lowerWhisker = this.locatorForOptional('.wr-boxplot-chart__whisker--lower');
  private readonly upperCap = this.locatorForOptional('.wr-boxplot-chart__cap--upper');
  private readonly lowerCap = this.locatorForOptional('.wr-boxplot-chart__cap--lower');
  private readonly median = this.locatorForOptional('.wr-boxplot-chart__median');
  private readonly outliers = this.locatorForAll('.wr-boxplot-chart__outlier');

  async read(label: string): Promise<WrBoxplotChartHarnessGroup> {
    const group = await this.host();
    const slot = {
      label,
      slotStart: await numberProp(group, 'slot-start', 'a group'),
      slotWidth: await numberProp(group, 'slot-width', 'a group'),
      color: await styleProp(group, 'group-color'),
    };
    const box = await this.box();
    if (!box) return { ...slot, stats: null, position: null };

    const [upperWhisker, lowerWhisker] = [await this.upperWhisker(), await this.lowerWhisker()];
    const [upperCap, lowerCap, median] = [await this.upperCap(), await this.lowerCap(), await this.median()];
    if (!upperWhisker || !lowerWhisker || !upperCap || !lowerCap || !median) {
      throw new Error(
        'WrBoxplotChartHarness.getGroups(): a group draws a box without both whiskers, both caps and its median, ' +
          'which the component draws together.'
      );
    }
    const dots = await this.outliers();
    const stats: WrBoxplotChartHarnessStats = {
      min: await numberAttribute(group, 'data-min'),
      q1: await numberAttribute(group, 'data-q1'),
      median: await numberAttribute(group, 'data-median'),
      q3: await numberAttribute(group, 'data-q3'),
      max: await numberAttribute(group, 'data-max'),
      outliers: await Promise.all(dots.map(dot => numberAttribute(dot, 'data-value'))),
    };
    const position: WrBoxplotChartHarnessPosition = {
      upperWhisker: {
        top: await numberProp(upperWhisker, 'top', 'a whisker'),
        bottom: await numberProp(upperWhisker, 'bottom', 'a whisker'),
      },
      lowerWhisker: {
        top: await numberProp(lowerWhisker, 'top', 'a whisker'),
        bottom: await numberProp(lowerWhisker, 'bottom', 'a whisker'),
      },
      max: await numberProp(upperCap, 'y', 'a cap'),
      boxTop: await numberProp(box, 'top', 'a box'),
      median: await numberProp(median, 'y', 'a median'),
      boxBottom: await numberProp(box, 'bottom', 'a box'),
      min: await numberProp(lowerCap, 'y', 'a cap'),
      outliers: await Promise.all(dots.map(dot => numberProp(dot, 'y', 'an outlier'))),
    };
    return { ...slot, stats, position };
  }
}

/**
 * Test harness for `<wr-boxplot-chart>`.
 *
 * **Groups are read off what the component WROTE, never off a layout.** jsdom lays
 * nothing out, so a measured box would read 0 for a working chart and a broken one alike.
 * Every group's slot carries its summary in `data-*` attributes, and every mark the
 * percentages it was placed at in its own `style` — so {@link getGroups} answers both
 * questions a spec has: what did the chart work out, and where did it draw it. A median
 * computed right and placed wrong is exactly the defect worth catching.
 *
 * **There is deliberately no hover method.** The tooltip renders into an overlay outside
 * the chart's host and is pointer only; a spec that needs it dispatches `mouseenter` on a
 * `.wr-boxplot-chart__group` and reads `.wr-chart-tooltip` off `document`, as the
 * component's own spec does. Its position is measured against boxes jsdom reports as
 * 0×0, which only a stubbed `getBoundingClientRect` can make mean anything.
 *
 * @example
 * ```ts
 * const chart = await loader.getHarness(WrBoxplotChartHarness);
 *
 * expect(await chart.getGroupLabels()).toEqual(['EU', 'US']);
 * expect((await chart.getGroups())[0].stats).toMatchObject({ q1: 101, median: 118, q3: 134 });
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrBoxplotChartHarness extends ComponentHarness {
  static hostSelector = 'wr-boxplot-chart';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrBoxplotChartHarnessFilters = {}): HarnessPredicate<WrBoxplotChartHarness> {
    return new HarnessPredicate(WrBoxplotChartHarness, options)
      .addOption('ariaLabel', options.ariaLabel, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
      )
      .addOption('groupLabel', options.groupLabel, async (harness, label) => {
        for (const group of await harness.getGroupLabels()) {
          if (await HarnessPredicate.stringMatches(group, label)) return true;
        }
        return false;
      });
  }

  /** The plot's accessible name — the only name the drawing has. */
  async getAccessibleName(): Promise<string | null> {
    return (await this.locatorFor('.wr-boxplot-chart__plot')()).getAttribute('aria-label');
  }

  /** The group names under the drawing, in the order of `groups` — groups with nothing to draw included. */
  async getGroupLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-boxplot-chart__x-label')();
    return Promise.all(labels.map(label => label.text()));
  }

  /** How many slots the drawing has: one per group, drawn or empty. */
  async getGroupCount(): Promise<number> {
    return (await this.locatorForAll(GroupHarness)()).length;
  }

  /**
   * Every group, in the order of `groups`: its name, its slot, its colour, the summary the
   * component worked out or was given, and the percentages it drew each mark at — both
   * whiskers' spans, both caps, the box's edges, the median and every outlier. A group
   * with nothing to draw answers `null` for both of the last two.
   *
   * Throws on a mark missing what the component writes on every one, rather than
   * answering with a `NaN` a spec could compare against.
   */
  async getGroups(): Promise<WrBoxplotChartHarnessGroup[]> {
    const [groups, labels] = await Promise.all([this.locatorForAll(GroupHarness)(), this.getGroupLabels()]);
    if (labels.length !== groups.length) {
      throw new Error(
        `WrBoxplotChartHarness.getGroups(): the chart draws ${groups.length} slot(s) under ${labels.length} name(s), ` +
          'where it draws one of each per group.'
      );
    }
    return Promise.all(groups.map((group, i) => group.read(labels[i])));
  }

  /** Whether the gridlines are drawn (`showGrid`). */
  async hasGrid(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-boxplot-chart__grid-line')()) !== null;
  }

  /** The value axis' tick labels, top to bottom; `[]` with `showGrid` off. */
  async getYTicks(): Promise<string[]> {
    const ticks = await this.locatorForAll('.wr-boxplot-chart__y-tick')();
    return Promise.all(ticks.map(tick => tick.text()));
  }

  /**
   * The axes' names as drawn. The chart draws a name only when `xLabel` or `yLabel` is
   * given, so the catalog's fallback, which heads the data table's group column, never
   * appears here.
   */
  async getAxisTitles(): Promise<WrBoxplotChartAxisTitles> {
    const x = await this.locatorForOptional('.wr-boxplot-chart__x-title')();
    const y = await this.locatorForOptional('.wr-boxplot-chart__y-title')();
    return { x: x ? await x.text() : null, y: y ? await y.text() : null };
  }

  /** Whether the hidden data table is rendered (`dataTable`). */
  async hasDataTable(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-chart-table')()) !== null;
  }

  /**
   * The data table's column headings: the five numbers from the lower whisker up, and the
   * outliers once a group has one — one per cell of {@link getTableRows}, as the other
   * charts' harnesses read them.
   *
   * Throws when the chart renders no table (`dataTable` off), rather than answering with
   * no columns.
   */
  async getTableColumns(): Promise<string[]> {
    await this.assertDataTable('getTableColumns');
    // The first cell is the corner over the row headers — what one row is, `xLabel` or
    // the catalog's "Group" — not a column of figures.
    const cells = await this.locatorForAll('.wr-chart-table thead tr > *')();
    return Promise.all(cells.slice(1).map(cell => cell.text()));
  }

  /**
   * The data table's rows, one per group, as a screen reader walks them.
   *
   * Throws when the chart renders no table (`dataTable` off), for the reason
   * {@link getTableColumns} gives.
   */
  async getTableRows(): Promise<WrBoxplotChartTableRow[]> {
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
    const style = await (await this.locatorFor('.wr-boxplot-chart__plot')()).getAttribute('style');
    const match = /height:\s*([\d.]+)px/.exec(style ?? '');
    if (!match) {
      throw new Error(
        `WrBoxplotChartHarness.getPlotHeight(): no inline height on .wr-boxplot-chart__plot (style: "${style ?? ''}"). ` +
          'The component writes one unconditionally, so its absence is the bug rather than a zero.'
      );
    }
    return Number.parseFloat(match[1]);
  }

  private async assertDataTable(method: string): Promise<void> {
    if (!(await this.hasDataTable())) {
      throw new Error(
        `WrBoxplotChartHarness.${method}(): the chart renders no data table — \`dataTable\` is off. Ask hasDataTable() first.`
      );
    }
  }
}
