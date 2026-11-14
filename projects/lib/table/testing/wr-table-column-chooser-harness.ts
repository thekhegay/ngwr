/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrTableColumnChooserHarnessFilters } from './types';
import { wrTableHarnessText } from './wr-table-harness-text';

/**
 * Test harness for `<wr-table-column-chooser>`, the column list of a table.
 *
 * Columns are addressed by their TITLE, as everywhere in this harness family.
 * A chooser inside a popover or a dropdown lives in the overlay container:
 * open the menu, then query it from `TestbedHarnessEnvironment.documentRootLoader`.
 * The one in the table's own `columnChooser` panel comes from
 * `WrTableHarness.getColumnChooser()`.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrTableColumnChooserHarness extends ComponentHarness {
  static hostSelector = '.wr-table-column-chooser';

  /** Build a predicate that narrows the query. */
  static with(options: WrTableColumnChooserHarnessFilters = {}): HarnessPredicate<WrTableColumnChooserHarness> {
    return new HarnessPredicate(WrTableColumnChooserHarness, options);
  }

  private readonly items = this.locatorForAll('.wr-table-column-chooser__item');
  private readonly boxes = this.locatorForAll('.wr-table-column-chooser__item input.wr-checkbox__input');
  private readonly allBox = this.locatorForOptional('.wr-table-column-chooser__all input.wr-checkbox__input');

  /** The title of every column listed, in column order, hidden ones included. */
  async getColumns(): Promise<string[]> {
    return (await this.entries()).map(entry => entry.title);
  }

  /** Whether the column is shown: its checkbox is checked. */
  async isChecked(title: string): Promise<boolean> {
    return (await this.entryFor(title)).box.getProperty<boolean>('checked');
  }

  /** Whether the list refuses to hide the column: `hideable: false`, or the last one shown. */
  async isLocked(title: string): Promise<boolean> {
    return (await this.entryFor(title)).box.getProperty<boolean>('disabled');
  }

  /** Hide a shown column or show a hidden one. Throws on a locked column. */
  async toggle(title: string): Promise<void> {
    const entry = await this.entryFor(title);
    if (await entry.box.getProperty<boolean>('disabled')) {
      throw new Error(
        `WrTableColumnChooserHarness: the column "${title}" cannot be toggled — it is \`hideable: false\`, ` +
          'or it is the last column shown.'
      );
    }
    await entry.box.click();
  }

  /**
   * Press the "Show all" row: it shows every column while one is hidden, and
   * hides every column that can be hidden once all are shown.
   */
  async showAll(): Promise<void> {
    const box = await this.showAllBox();
    if (await box.getProperty<boolean>('disabled')) {
      throw new Error('WrTableColumnChooserHarness: "Show all" is disabled — no column can be hidden.');
    }
    await box.click();
  }

  /**
   * What the "Show all" row reports: `'all'` (checked) when no hideable column
   * is hidden, `'none'` (unchecked) when every one is, `'some'` (mixed) between.
   */
  async getShowAllState(): Promise<'all' | 'some' | 'none'> {
    const box = await this.showAllBox();
    if (await box.getProperty<boolean>('indeterminate')) return 'some';
    return (await box.getProperty<boolean>('checked')) ? 'all' : 'none';
  }

  /** The text of the "Show all" row. */
  async getShowAllText(): Promise<string> {
    await this.showAllBox();
    return wrTableHarnessText(await (await this.locatorFor('.wr-table-column-chooser__all')()).text());
  }

  private async showAllBox(): Promise<TestElement> {
    const box = await this.allBox();
    if (!box) throw new Error('WrTableColumnChooserHarness: no "Show all" row — the table has no columns.');
    return box;
  }

  private async entries(): Promise<{ title: string; box: TestElement }[]> {
    const [items, boxes] = await Promise.all([this.items(), this.boxes()]);
    return Promise.all(items.map(async (item, i) => ({ title: wrTableHarnessText(await item.text()), box: boxes[i] })));
  }

  private async entryFor(title: string): Promise<{ title: string; box: TestElement }> {
    const entries = await this.entries();
    const entry = entries.find(candidate => candidate.title === title);
    if (!entry) {
      throw new Error(
        `WrTableColumnChooserHarness: the chooser lists no "${title}" — it lists ` +
          `[${entries.map(candidate => candidate.title).join(', ')}].`
      );
    }
    return entry;
  }
}
