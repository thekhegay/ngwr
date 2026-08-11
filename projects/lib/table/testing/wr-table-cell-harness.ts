/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ContentContainerComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrTableCellHarnessFilters } from './interfaces';
import { wrTableHarnessText } from './wr-table-harness-text';

/**
 * Test harness for one data cell of a `<wr-table>` row.
 *
 * A CONTENT CONTAINER, because a cell is where a consumer's own components end
 * up: a `[wrTableCell]` template can render a `<wr-tag>`, a button, an input, and
 * `cell.getHarness(WrButtonHarness…)` resolves those INSIDE this cell — so the
 * "Delete" button of row 3 cannot be mistaken for the one in row 1.
 *
 * @example
 * ```ts
 * const [row] = await table.getRows({ cellText: 'Ada' });
 * const [status] = await row.getCells({ columnTitle: 'Status' });
 *
 * expect(await status.getText()).toBe('active');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrTableCellHarness extends ContentContainerComponentHarness {
  /**
   * Data cells only. The lead selection and expand cells carry the same
   * `.wr-table__td` class — they hold the row's controls, not its data — so a cell
   * list that swept them in would no longer line up with the header list.
   */
  static hostSelector = '.wr-table__td:not(.wr-table__td--select):not(.wr-table__td--expand)';

  /** Build a predicate that narrows the query. */
  static with(options: WrTableCellHarnessFilters = {}): HarnessPredicate<WrTableCellHarness> {
    return new HarnessPredicate(WrTableCellHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text))
      .addOption('columnTitle', options.columnTitle, (harness, title) =>
        HarnessPredicate.stringMatches(harness.getColumnTitle(), title)
      );
  }

  /** The cell's text, with the template's indentation collapsed to single spaces. */
  async getText(): Promise<string> {
    return wrTableHarnessText(await (await this.host()).text());
  }

  /**
   * The title of the column this cell belongs to.
   *
   * Read from `data-label` — the attribute responsive card mode prints in front of
   * each value — because it is the only place a cell says which column it is in.
   * The column KEY is never in the DOM at all.
   */
  async getColumnTitle(): Promise<string | null> {
    return (await this.host()).getAttribute('data-label');
  }

  /** Which edge the cell's column is frozen against, or `null` when it scrolls. */
  async getPin(): Promise<'left' | 'right' | null> {
    const host = await this.host();
    if (await host.hasClass('wr-table__td--pin-left')) return 'left';
    if (await host.hasClass('wr-table__td--pin-right')) return 'right';
    return null;
  }
}
