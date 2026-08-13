/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrCalendarHeatmapCell, WrCalendarHeatmapHarnessFilters } from './interfaces';

/**
 * Test harness for `<wr-calendar-heatmap>`.
 *
 * **Every square is `aria-hidden`, and that is the design.** The grid is one
 * `role="img"` with a name; a year of individually announced days would be unusable
 * with a screen reader. What each square carries instead is a `title` — its ISO date
 * and value — which is the only text a spec can read, and what
 * {@link getCells} parses.
 *
 * **Four of the seven weekday labels are blank on purpose**: seven do not fit beside
 * a grid this dense. {@link getWeekdayLabels} returns them as they are, empties
 * included, rather than filtering — a spec asserting seven entries with four blanks
 * is pinning the real layout.
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
   * The `title` is `"<iso>: <value>"`, which is the component's own format and the
   * only text on a square — everything else about it is colour.
   */
  async getCells(): Promise<WrCalendarHeatmapCell[]> {
    const cells = await this.locatorForAll('.wr-calendar-heatmap__cell')();

    return Promise.all(
      cells.map(async cell => {
        const title = (await cell.getAttribute('title')) ?? '';
        const [iso, value] = title.split(': ');
        return {
          iso: iso ?? '',
          value: value ?? '',
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
}
