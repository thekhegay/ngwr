/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrTableHarnessFilters, WrTableHeaderCellHarnessFilters, WrTableRowHarnessFilters } from './interfaces';
import { wrTableHarnessText } from './wr-table-harness-text';
import { WrTableHeaderCellHarness } from './wr-table-header-cell-harness';
import { WrTableRowHarness } from './wr-table-row-harness';

/**
 * Test harness for `<wr-table>` — the root of a small family, since a table is a
 * tree and not one control: {@link WrTableHeaderCellHarness} for a column header,
 * {@link WrTableRowHarness} for a body row, and `WrTableCellHarness` for a cell.
 *
 * Columns are addressed by their header TITLE, never by their `columns` key: the
 * key never reaches the DOM.
 *
 * What this harness deliberately does NOT do:
 * - open a column's filter dropdown. The panel is a `wr-dropdown` in the overlay
 *   container, and driving it belongs to a dropdown harness rather than this one;
 *   {@link WrTableHeaderCellHarness.isFilterable} reports that a column offers one.
 * - scroll a virtualized body. See {@link getRows}.
 *
 * @example
 * ```ts
 * const table = await loader.getHarness(WrTableHarness);
 *
 * expect(await table.getHeaderTexts()).toEqual(['Name', 'Role']);
 * await table.sortByColumn('Name');
 * expect(await table.getSortDirection('Name')).toBe('ascending');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrTableHarness extends ComponentHarness {
  static hostSelector = 'wr-table';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrTableHarnessFilters = {}): HarnessPredicate<WrTableHarness> {
    return new HarnessPredicate(WrTableHarness, options)
      .addOption('columnTitle', options.columnTitle, async (harness, title) => {
        for (const header of await harness.getHeaderTexts()) {
          if (await HarnessPredicate.stringMatches(header, title)) return true;
        }
        return false;
      })
      .addOption('tree', options.tree, async (harness, tree) => (await harness.isTree()) === tree);
  }

  private readonly tableEl = this.locatorFor('table.wr-table__table');
  private readonly selectAllBox = this.locatorForOptional('.wr-table__th--select input.wr-checkbox__input');

  /**
   * The role the table announces.
   *
   * A flat table sets no `role` at all, so it announces the native `table` role —
   * NOT `grid`, which would promise cell-by-cell keyboard navigation it does not
   * implement. `childrenKey` turns it into a `treegrid`, and that role is the only
   * place the hierarchy exists for a screen-reader user: the indent is decoration.
   */
  async getRole(): Promise<'treegrid' | 'table'> {
    return (await (await this.tableEl()).getAttribute('role')) === 'treegrid' ? 'treegrid' : 'table';
  }

  /** Whether the rows are a hierarchy rather than a flat list. */
  async isTree(): Promise<boolean> {
    return (await this.getRole()) === 'treegrid';
  }

  /**
   * Whether the body is WINDOWED right now.
   *
   * Read from the host modifier rather than from the input, and that is the point:
   * `virtualScroll` is a request, not a promise. The table falls back to rendering
   * every row whenever the layout stops being uniform — grouping, a detail
   * template, responsive card mode, a visible pager, a tree — so this answers what
   * actually happened.
   */
  async isVirtual(): Promise<boolean> {
    return (await this.host()).hasClass('wr-table--virtual');
  }

  /** Whether the loading spinner is covering the table. */
  async isLoading(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-table__loading')()) !== null;
  }

  /** The column headers, in render order — which `columnOrder` and a drag can change. */
  async getHeaderCells(filters: WrTableHeaderCellHarnessFilters = {}): Promise<WrTableHeaderCellHarness[]> {
    return this.locatorForAll(WrTableHeaderCellHarness.with(filters))();
  }

  /**
   * The column titles, in render order.
   *
   * The selection and expand headers are not columns and are not here, so this
   * list stays as wide as every row from {@link getCellTexts}.
   */
  async getHeaderTexts(): Promise<string[]> {
    const headers = await this.getHeaderCells();
    return Promise.all(headers.map(header => header.getText()));
  }

  /** The direction a column announces via `aria-sort`, or `null` when it does not sort. */
  async getSortDirection(columnTitle: string): Promise<'ascending' | 'descending' | 'none' | null> {
    return (await this.headerCellFor(columnTitle)).getSortDirection();
  }

  /**
   * Advance a column's sort one step — none → ascending → descending → none.
   *
   * Sorting is the host's job: `<wr-table>` publishes the intent through its `sort`
   * model and never reorders `items` itself, so a spec that expects the rows to
   * move has to sort the data the way the app does.
   */
  async sortByColumn(columnTitle: string): Promise<void> {
    await (await this.headerCellFor(columnTitle)).sort();
  }

  /**
   * The body rows currently rendered, in DOM order.
   *
   * "Currently rendered" is the whole caveat of a virtualized table: while
   * {@link isVirtual} is true the `<tbody>` holds only the window around the scroll
   * offset, padded by a spacer row at each end that still has rows to stand in for
   * (one of them, at the top or the bottom of the list), so this returns the
   * WINDOW — not the dataset.
   * {@link getAriaRowCount} is the total the table announces and
   * {@link WrTableRowHarness.getRowIndex} says where a row sits in it. Nothing here
   * scrolls that window on purpose: the viewport has no layout in a unit test, so a
   * `scrollTo` would silently do nothing. Reach for `WrTable.scrollToRow()` in a
   * real browser, or narrow the data instead.
   *
   * Group bands, per-group subtotals, detail rows and the "no data" row are not
   * rows and never appear here.
   */
  async getRows(filters: WrTableRowHarnessFilters = {}): Promise<WrTableRowHarness[]> {
    return this.locatorForAll(WrTableRowHarness.with(filters))();
  }

  /** The whole body as a matrix of cell text — one array per row, one entry per column. */
  async getCellTexts(): Promise<string[][]> {
    const rows = await this.getRows();
    return Promise.all(rows.map(row => row.getCellTexts()));
  }

  /**
   * The `<tfoot>` summary cells, one per column and `''` for a column with no
   * `summary`. Empty when no column defines one.
   *
   * The lead cells are dropped so this lines up with {@link getHeaderTexts}. A
   * per-group subtotal row is NOT here — it lives in the body, under its band.
   */
  async getFooterTexts(): Promise<string[]> {
    const cells = await this.locatorForAll('tfoot .wr-table__foot-cell:not(.wr-table__foot-cell--lead)')();
    return Promise.all(cells.map(async cell => wrTableHarnessText(await cell.text())));
  }

  /** The "no data" message, or `null` while the table has rows to show. */
  async getEmptyText(): Promise<string | null> {
    const empty = await this.locatorForOptional('.wr-table__empty')();
    return empty ? wrTableHarnessText(await empty.text()) : null;
  }

  /**
   * The row count the table announces (`aria-rowcount` — header and summary row
   * included), or `null` when it is not virtualized and every row is in the DOM.
   */
  async getAriaRowCount(): Promise<number | null> {
    const count = await (await this.tableEl()).getAttribute('aria-rowcount');
    return count === null ? null : Number.parseInt(count, 10);
  }

  /** Whether the header offers a select-all box — only `rowSelection="multiple"` does. */
  async hasSelectAll(): Promise<boolean> {
    return (await this.selectAllBox()) !== null;
  }

  /** Whether every row in the select-all scope is selected — see {@link toggleSelectAll}. */
  async isAllSelected(): Promise<boolean> {
    return (await this.selectAllHost()).getProperty<boolean>('checked');
  }

  /**
   * Whether some rows are selected and others are not — the box's third state.
   *
   * `indeterminate` is a DOM PROPERTY, not an attribute: reading the attribute
   * reports `null` for a box that is visibly dashed.
   */
  async isPartiallySelected(): Promise<boolean> {
    return (await this.selectAllHost()).getProperty<boolean>('indeterminate');
  }

  /**
   * Click the select-all box, once.
   *
   * Its scope is the rows the table RENDERS — the current page, and a collapsed
   * group's rows are out because collapsing drops them from that list. A
   * virtualized table's off-window rows are IN, though: the window is a slice
   * taken after the list is built, so one click selects the whole dataset and not
   * just what is in the DOM. And the third state is worth knowing about before
   * asserting: while the selection is partial the box reads unchecked, so one
   * click selects everything rather than clearing it.
   */
  async toggleSelectAll(): Promise<void> {
    await (await this.selectAllHost()).click();
  }

  /**
   * The text of each open detail row, in row order.
   *
   * A detail row is a full-width `<tr>` NEXT TO the row it belongs to, not inside
   * it — which is why it is neither one of {@link getRows} nor one of a row's
   * cells.
   */
  async getDetailTexts(): Promise<string[]> {
    const details = await this.locatorForAll('.wr-table__detail')();
    return Promise.all(details.map(async detail => wrTableHarnessText(await detail.text())));
  }

  /**
   * The group band labels, in order.
   *
   * Empty when `groupBy` is off — and also when a `[wrTableGroupHeader]` template
   * replaced the built-in band, since the label is then the consumer's own markup.
   * Reach for that through {@link getRows}' siblings or your own component's
   * harness.
   */
  async getGroupLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-table__group-label')();
    return Promise.all(labels.map(label => label.text()));
  }

  /** Whether the band with this label is collapsed. */
  async isGroupCollapsed(label: string): Promise<boolean> {
    const toggle = await this.groupToggleFor(label);
    return (await toggle.getAttribute('aria-expanded')) === 'false';
  }

  /** Collapse or expand the band with this label. */
  async toggleGroup(label: string): Promise<void> {
    await (await this.groupToggleFor(label)).click();
  }

  /** The header for a column title, or a failure that says which titles do exist. */
  private async headerCellFor(columnTitle: string): Promise<WrTableHeaderCellHarness> {
    const [header] = await this.getHeaderCells({ text: columnTitle });
    if (!header) {
      const titles = await this.getHeaderTexts();
      throw new Error(
        `WrTableHarness: no column headed "${columnTitle}". Columns are addressed by their title, ` +
          `not by their key — this table shows [${titles.join(', ')}].`
      );
    }
    return header;
  }

  /**
   * The collapse toggle of one band.
   *
   * Paired by index rather than by containment: both lists are emitted once per
   * band by the same loop, in the same order, and a `TestElement` cannot be
   * queried into.
   */
  private async groupToggleFor(label: string): Promise<TestElement> {
    const index = (await this.getGroupLabels()).indexOf(label);
    if (index < 0) {
      throw new Error(
        `WrTableHarness: no group band labelled "${label}" — is \`groupBy\` set, and is the band the ` +
          'built-in one rather than a `[wrTableGroupHeader]` template?'
      );
    }
    return (await this.locatorForAll('.wr-table__group-toggle')())[index];
  }

  /** The select-all input, or a failure naming both reasons it is missing. */
  private async selectAllHost(): Promise<TestElement> {
    const box = await this.selectAllBox();
    if (!box) {
      throw new Error(
        'WrTableHarness: this table has no select-all box — `rowSelection` is off, or it is ' +
          "'single', which has no select-all by design."
      );
    }
    return box;
  }
}
