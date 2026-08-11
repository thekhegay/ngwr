/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ContentContainerComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrTableCellHarnessFilters, WrTableRowHarnessFilters } from './interfaces';
import { WrTableCellHarness } from './wr-table-cell-harness';

/**
 * Test harness for one body row of a `<wr-table>` — flat, grouped or tree.
 *
 * Also a CONTENT CONTAINER, so `row.getHarness(WrButtonHarness…)` reaches the
 * consumer's own components anywhere in the row without leaving this row.
 *
 * @example
 * ```ts
 * const [ada] = await table.getRows({ cellText: 'Ada' });
 *
 * await ada.select();
 * await (await ada.getHarness(WrButtonHarness.with({ text: 'Edit' }))).click();
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrTableRowHarness extends ContentContainerComponentHarness {
  /**
   * `.wr-table__tr` is the DATA row and nothing else.
   *
   * Everything else a `<tbody>` can hold is a `<tr>` too: the group band
   * (`.wr-table__group-row`), its subtotal row, the detail row a `[wrTableExpand]`
   * template renders, the two virtual spacers, and the "no data" row. Querying
   * `tbody tr` would hand every one of those back as a row with no cells.
   */
  static hostSelector = '.wr-table__tr';

  /** Build a predicate that narrows the query. */
  static with(options: WrTableRowHarnessFilters = {}): HarnessPredicate<WrTableRowHarness> {
    return new HarnessPredicate(WrTableRowHarness, options)
      .addOption('cellText', options.cellText, async (harness, text) => {
        for (const cell of await harness.getCellTexts()) {
          if (await HarnessPredicate.stringMatches(cell, text)) return true;
        }
        return false;
      })
      .addOption('selected', options.selected, async (harness, selected) => (await harness.isSelected()) === selected)
      .addOption('expanded', options.expanded, async (harness, expanded) => (await harness.isExpanded()) === expanded)
      .addOption('level', options.level, async (harness, level) => (await harness.getLevel()) === level);
  }

  private readonly selectBox = this.locatorForOptional('.wr-table__td--select input.wr-checkbox__input');

  /**
   * The row's disclosure control, whichever of the two the table gave it: the lead
   * button of a `[wrTableExpand]` table, or the tree toggle inside the tree column.
   * The two never coexist — a tree row owns its own disclosure, so the component
   * refuses the pair.
   *
   * `button` in the tree selector is load-bearing. A leaf renders a `<span>` with
   * the same `.wr-table__tree-toggle` class purely to hold the indent, and taking
   * that for a control would report every leaf as expandable.
   */
  private readonly disclosure = this.locatorForOptional('.wr-table__expand-btn, button.wr-table__tree-toggle');

  /** The row's data cells, in DOM order. The lead control cells are not cells. */
  async getCells(filters: WrTableCellHarnessFilters = {}): Promise<WrTableCellHarness[]> {
    return this.locatorForAll(WrTableCellHarness.with(filters))();
  }

  /** The text of every data cell, in DOM order. */
  async getCellTexts(): Promise<string[]> {
    const cells = await this.getCells();
    return Promise.all(cells.map(cell => cell.getText()));
  }

  /**
   * Whether the row is selected.
   *
   * Read from the `--selected` modifier, which is what the row looks like and what
   * a consumer styles against. It also means a row is not "selected" while
   * `rowSelection` is off, however many keys the `selection` model holds — nothing
   * on screen says otherwise.
   */
  async isSelected(): Promise<boolean> {
    return (await this.host()).hasClass('wr-table__tr--selected');
  }

  /** Whether the row offers a selection checkbox at all. */
  async isSelectable(): Promise<boolean> {
    return (await this.selectBox()) !== null;
  }

  /** Flip the row's checkbox. Throws when the table has no selection column. */
  async toggleSelection(): Promise<void> {
    const box = await this.selectBox();
    if (!box) {
      throw new Error(
        'WrTableRowHarness.toggleSelection(): this row has no checkbox — the table needs ' +
          "`rowSelection` set to 'single' or 'multiple'."
      );
    }
    await box.click();
  }

  /** Select the row if it is not already selected. */
  async select(): Promise<void> {
    if (!(await this.isSelected())) await this.toggleSelection();
  }

  /** Deselect the row if it is selected. */
  async deselect(): Promise<void> {
    if (await this.isSelected()) await this.toggleSelection();
  }

  /**
   * Whether the row has something to open — a detail template's disclosure, or
   * children in a tree. A tree leaf answers `false`.
   */
  async isExpandable(): Promise<boolean> {
    return (await this.disclosure()) !== null;
  }

  /** Whether the row is open, from the disclosure's `aria-expanded`. */
  async isExpanded(): Promise<boolean> {
    const toggle = await this.disclosure();
    return toggle !== null && (await toggle.getAttribute('aria-expanded')) === 'true';
  }

  /** Open or close the row. Throws when it has nothing to open. */
  async toggleExpand(): Promise<void> {
    const toggle = await this.disclosure();
    if (!toggle) {
      throw new Error(
        'WrTableRowHarness.toggleExpand(): this row has no disclosure control — a flat table needs a ' +
          '`[wrTableExpand]` template, and a tree row with no children is a leaf.'
      );
    }
    await toggle.click();
  }

  /**
   * The row's depth as the table announces it — 1-based `aria-level`, `null` in a
   * flat table, where depth is not a thing that exists.
   */
  async getLevel(): Promise<number | null> {
    return this.numericAttribute('aria-level');
  }

  /** The row's 1-based position among its siblings (`aria-posinset`), or `null` when flat. */
  async getPosInSet(): Promise<number | null> {
    return this.numericAttribute('aria-posinset');
  }

  /** How many rows are in the row's sibling set, itself included (`aria-setsize`); `null` when flat. */
  async getSetSize(): Promise<number | null> {
    return this.numericAttribute('aria-setsize');
  }

  /**
   * The row's 1-based index in the FULL dataset (`aria-rowindex`, header included),
   * or `null` when the table is not virtualized.
   *
   * Only a windowed table publishes it, and that is precisely when it matters: the
   * rows in the DOM are a slice, so their DOM order says nothing about where they
   * sit in the data.
   */
  async getRowIndex(): Promise<number | null> {
    return this.numericAttribute('aria-rowindex');
  }

  private async numericAttribute(name: string): Promise<number | null> {
    const value = await (await this.host()).getAttribute(name);
    return value === null ? null : Number.parseInt(value, 10);
  }
}
