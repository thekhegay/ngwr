/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrTableHeaderCellHarnessFilters } from './interfaces';

/**
 * Test harness for one column header of a `<wr-table>`.
 *
 * The selector deliberately skips the two LEAD headers — selection and expand —
 * which carry the same `.wr-table__th` class but hold a checkbox or nothing at
 * all. What is left lines up index-for-index with the data columns, so a header's
 * position is its column's position.
 *
 * Columns are addressed by their TITLE here and everywhere else in this harness
 * family, never by their `columns` key: the key never reaches the DOM. Only the
 * title does — in this header and in every cell's `data-label` — so it is the one
 * handle a spec and the rendered table share.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrTableHeaderCellHarness extends ComponentHarness {
  static hostSelector = '.wr-table__th:not(.wr-table__th--select):not(.wr-table__th--expand)';

  /** Build a predicate that narrows the query. */
  static with(options: WrTableHeaderCellHarnessFilters = {}): HarnessPredicate<WrTableHeaderCellHarness> {
    return new HarnessPredicate(WrTableHeaderCellHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text))
      .addOption('sortable', options.sortable, async (harness, sortable) => (await harness.isSortable()) === sortable);
  }

  /** The column title, trimmed. The sort and filter controls are not part of it. */
  async getText(): Promise<string> {
    return (await this.locatorFor('.wr-table__title')()).text();
  }

  /**
   * The direction this column announces, exactly as `aria-sort` puts it — or
   * `null` when the column does not sort.
   *
   * `null` is not "unsorted": a sortable column with no direction announces
   * `'none'`, and only a plain column omits the attribute entirely. Claiming
   * sortability a column does not have is the bug that distinction prevents.
   */
  async getSortDirection(): Promise<'ascending' | 'descending' | 'none' | null> {
    const sort = await (await this.host()).getAttribute('aria-sort');
    return sort as 'ascending' | 'descending' | 'none' | null;
  }

  /** Whether the column offers sorting at all. */
  async isSortable(): Promise<boolean> {
    return (await this.getSortDirection()) !== null;
  }

  /**
   * Advance the sort one step — none → ascending → descending → none, the cycle a
   * click on the indicator drives.
   *
   * Throws on a column with no sort control rather than doing nothing: the quiet
   * version of this leaves a spec asserting an unchanged direction and passing.
   */
  async sort(): Promise<void> {
    const button = await this.locatorForOptional('.wr-table__sort-btn')();
    if (!button) {
      throw new Error(
        `WrTableHeaderCellHarness.sort(): the "${await this.getText()}" column has no sort control — ` +
          'its column definition needs `sortable: true`.'
      );
    }
    await button.click();
  }

  /** Whether the column offers a filter dropdown (its definition carries a NON-EMPTY `filterItems`). */
  async isFilterable(): Promise<boolean> {
    return (await this.locatorForOptional('wr-table-filter')()) !== null;
  }

  /** Which edge the column is frozen against, or `null` when it scrolls with the rest. */
  async getPin(): Promise<'left' | 'right' | null> {
    const host = await this.host();
    if (await host.hasClass('wr-table__th--pin-left')) return 'left';
    if (await host.hasClass('wr-table__th--pin-right')) return 'right';
    return null;
  }
}
