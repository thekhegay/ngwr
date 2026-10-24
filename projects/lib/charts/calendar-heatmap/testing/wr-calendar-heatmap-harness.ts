/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrCalendarHeatmapCell, WrCalendarHeatmapHarnessFilters, WrCalendarHeatmapTableRow } from './types';

/**
 * One body row of the heatmap's data table, so its header and cells are read off the row
 * they sit in rather than matched up by position across the whole table.
 */
class TableRowHarness extends ComponentHarness {
  static hostSelector = '.wr-chart-table tbody tr';

  async read(): Promise<WrCalendarHeatmapTableRow> {
    const header = await this.locatorFor('th[scope="row"]')();
    const cells = await this.locatorForAll('td')();
    return { header: await header.text(), cells: await Promise.all(cells.map(cell => cell.text())) };
  }
}

/**
 * Test harness for `<wr-calendar-heatmap>`.
 *
 * **Every square is `aria-hidden`, and that is the design.** The grid is one
 * `role="img"` with a name; a year of individually announced days would be unusable
 * with a screen reader. What each square carries instead is `data-date` and
 * `data-value`, which is what {@link getCells} reads.
 *
 * NOT the `title`, which it used to parse. The tooltip is human-facing text now
 * — the date formatted for the reader's locale, the count through
 * `Intl.NumberFormat`, and the sentence composed in the catalog — so parsing it
 * would have made every assertion here depend on the locale the suite happens to
 * run under, and on wording a translator is free to change.
 *
 * **Four of the seven weekday labels are blank on purpose**: seven do not fit beside
 * a grid this dense. {@link getWeekdayLabels} returns them as they are, empties
 * included, rather than filtering — a spec asserting seven entries with four blanks
 * is pinning the real layout.
 *
 * **Whether the year scrolls is not read.** The host is a tab stop while the grid is
 * wider than its container, decided by measuring the layout after render; jsdom has none,
 * so a method asking would answer "no" for a chart that scrolls and for one that is broken
 * alike.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrCalendarHeatmapHarness extends ComponentHarness {
  static hostSelector = 'wr-calendar-heatmap';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrCalendarHeatmapHarnessFilters = {}): HarnessPredicate<WrCalendarHeatmapHarness> {
    return new HarnessPredicate(WrCalendarHeatmapHarness, options).addOption(
      'ariaLabel',
      options.ariaLabel,
      (harness, label) => HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
    );
  }

  private readonly grid = this.locatorFor('.wr-calendar-heatmap__grid');

  /** The role the grid announces — `img`, for the whole picture. */
  async getRole(): Promise<string | null> {
    return (await this.grid()).getAttribute('role');
  }

  /** The grid's accessible name — the only name a reader gets. */
  async getAccessibleName(): Promise<string | null> {
    return (await this.grid()).getAttribute('aria-label');
  }

  /** How many day squares were drawn. */
  async getCellCount(): Promise<number> {
    return (await this.locatorForAll('.wr-calendar-heatmap__cell')()).length;
  }

  /**
   * Every square, from its tooltip and its grid placement.
   *
   * Read from `data-date` / `data-value`, which the component writes for exactly
   * this. Everything else about a square is colour.
   */
  async getCells(): Promise<WrCalendarHeatmapCell[]> {
    const cells = await this.locatorForAll('.wr-calendar-heatmap__cell')();

    return Promise.all(
      cells.map(async cell => {
        return {
          iso: (await cell.getAttribute('data-date')) ?? '',
          value: (await cell.getAttribute('data-value')) ?? '',
          // `grid-column` / `grid-row` as WRITTEN, not the `-start` longhands: the
          // component sets the shorthand, and jsdom does not expand shorthands, so the
          // longhand reads back empty and every square would land at NaN.
          week: Number.parseInt(await cell.getCssValue('grid-column'), 10),
          day: Number.parseInt(await cell.getCssValue('grid-row'), 10),
        };
      })
    );
  }

  /** The value a given ISO date's square reports, or `null` when that day is not drawn. */
  async getValueFor(iso: string): Promise<string | null> {
    for (const cell of await this.getCells()) {
      if (cell.iso === iso) return cell.value;
    }
    return null;
  }

  /** Whether the weekday and month labels are drawn (`showLabels`). */
  async hasLabels(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-calendar-heatmap__weekdays')()) !== null;
  }

  /** The weekday labels as drawn — seven entries, four of them deliberately empty. */
  async getWeekdayLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-calendar-heatmap__weekday')();
    return Promise.all(labels.map(label => label.text()));
  }

  /** The month labels along the top, in order. */
  async getMonthLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-calendar-heatmap__month')();
    return Promise.all(labels.map(label => label.text()));
  }

  /** Whether the hidden data table is rendered (`dataTable`). */
  async hasDataTable(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-chart-table')()) !== null;
  }

  /**
   * The data table's column headings: the seven weekdays, Sunday first.
   *
   * Throws when the heatmap renders no table (`dataTable` off) rather than answering with
   * no columns.
   */
  async getTableColumns(): Promise<string[]> {
    await this.assertDataTable('getTableColumns');
    const headings = await this.locatorForAll('.wr-chart-table thead th[scope="col"]')();
    return Promise.all(headings.map(heading => heading.text()));
  }

  /**
   * The data table's rows, one per week: its dates and each weekday's count, as a screen
   * reader walks them. Throws when the heatmap renders no table, as
   * {@link getTableColumns} does.
   */
  async getTableRows(): Promise<WrCalendarHeatmapTableRow[]> {
    await this.assertDataTable('getTableRows');
    const rows = await this.locatorForAll(TableRowHarness)();
    return Promise.all(rows.map(row => row.read()));
  }

  private async assertDataTable(method: string): Promise<void> {
    if (!(await this.hasDataTable())) {
      throw new Error(
        `WrCalendarHeatmapHarness.${method}(): the heatmap renders no data table — \`dataTable\` is off. Ask hasDataTable() first.`
      );
    }
  }
}
