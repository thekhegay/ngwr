/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrCascaderColumnHarnessFilters, WrCascaderOptionHarnessFilters } from './interfaces';
import { WrCascaderOptionHarness } from './wr-cascader-option-harness';

/**
 * Test harness for one COLUMN of an open `<wr-cascader>` panel.
 *
 * A column is a level of the tree: column 0 holds the root options, and each
 * further column holds the children of the active option in the column before
 * it. Which columns exist is therefore a function of what is expanded — the
 * relationship this harness exists to let a spec assert. Column 0 is always
 * there; a column only appears once there are children to put in it, so a leaf
 * adds none.
 *
 * @example
 * ```ts
 * const [countries, cities] = await cascader.getColumns();
 *
 * expect(await countries.getActiveOptionText()).toBe('Germany');
 * expect(await cities.getOptionLabels()).toEqual(['Berlin']);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrCascaderColumnHarness extends ComponentHarness {
  /** The `<ul role="menu">` the panel renders per level. */
  static hostSelector = '.wr-cascader__col';

  /** Build a predicate that narrows the query. */
  static with(options: WrCascaderColumnHarnessFilters = {}): HarnessPredicate<WrCascaderColumnHarness> {
    return new HarnessPredicate(WrCascaderColumnHarness, options).addOption(
      'optionText',
      options.optionText,
      async (harness, text) => {
        for (const label of await harness.getOptionLabels()) {
          if (await HarnessPredicate.stringMatches(label, text)) return true;
        }
        return false;
      }
    );
  }

  /** The role the column announces — `menu`. */
  async getRole(): Promise<string | null> {
    return (await this.host()).getAttribute('role');
  }

  /** The options this level offers, in order. */
  async getOptions(filters: WrCascaderOptionHarnessFilters = {}): Promise<WrCascaderOptionHarness[]> {
    return this.locatorForAll(WrCascaderOptionHarness.with(filters))();
  }

  /** The labels this level offers, in order. */
  async getOptionLabels(): Promise<string[]> {
    const options = await this.getOptions();
    return Promise.all(options.map(option => option.getText()));
  }

  /**
   * The first option matching the filters.
   *
   * Throws rather than answering `null`, and names what the column does offer:
   * a missing option here almost always means the level is not the one the spec
   * thought it was, and that is far easier to see with the alternatives listed.
   */
  async getOption(filters: WrCascaderOptionHarnessFilters): Promise<WrCascaderOptionHarness> {
    const [option] = await this.getOptions(filters);
    if (!option) {
      throw new Error(
        `WrCascaderColumnHarness.getOption(): no option matched ${JSON.stringify(filters)}. ` +
          `This column offers: ${(await this.getOptionLabels()).join(', ')}.`
      );
    }
    return option;
  }

  /** The option this level is drilled into, or `null` when nothing here is expanded. */
  async getActiveOption(): Promise<WrCascaderOptionHarness | null> {
    const [active] = await this.getOptions({ active: true });
    return active ?? null;
  }

  /** The label of the option this level is drilled into, or `null`. */
  async getActiveOptionText(): Promise<string | null> {
    const active = await this.getActiveOption();
    return active ? active.getText() : null;
  }
}
