/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrCommandPaletteGroupHarnessFilters, WrCommandPaletteItemHarnessFilters } from './interfaces';
import { WrCommandPaletteItemHarness } from './wr-command-palette-item-harness';

/**
 * Test harness for one bucket of commands inside an open `<wr-command-palette>`.
 *
 * The palette buckets its items by `group`, in the order each group first
 * appears in `items` — which is why this exists as a harness of its own: it is
 * the only way to ask which commands ended up under which heading, and the
 * rendered order is the contract every index in the palette is counted against.
 *
 * A bucket WITH a title is a labelled `group`; the bucket holding ungrouped items
 * carries `role="none"` instead, so its options belong to the listbox directly —
 * a `listbox` may only own `option` and `group` children, and a role-less
 * wrapper in between is something ARIA has no rule for.
 *
 * @example
 * ```ts
 * const palette = await loader.getHarness(WrCommandPaletteHarness);
 * const [file] = await palette.getGroups({ title: 'File' });
 *
 * expect(await file.getItemLabels()).toEqual(['Open file', 'Save file']);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrCommandPaletteGroupHarness extends ComponentHarness {
  static hostSelector = '.wr-command-palette__group';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrCommandPaletteGroupHarnessFilters = {}): HarnessPredicate<WrCommandPaletteGroupHarness> {
    return new HarnessPredicate(WrCommandPaletteGroupHarness, options).addOption(
      'title',
      options.title,
      (harness, title) => HarnessPredicate.stringMatches(harness.getTitle(), title)
    );
  }

  /** The heading over this bucket, or `null` for the one holding ungrouped items. */
  async getTitle(): Promise<string | null> {
    const title = await this.locatorForOptional('.wr-command-palette__group-title')();
    return title ? title.text() : null;
  }

  /**
   * The role this bucket announces — `group` when it has a title, `none` when it
   * does not, which promotes its options to the listbox's own children.
   */
  async getRole(): Promise<string | null> {
    return (await this.host()).getAttribute('role');
  }

  /**
   * Whether this bucket takes its accessible name from its own heading.
   *
   * The reference IS the group's name — no bucket carries an `aria-label` — and
   * the id it points at is generated, so a spec cannot hard-code one. `false` for
   * the untitled bucket, which has no name and needs none: it is `role="none"`.
   */
  async isLabelledByTitle(): Promise<boolean> {
    const title = await this.locatorForOptional('.wr-command-palette__group-title')();
    if (!title) return false;

    const labelledBy = await (await this.host()).getAttribute('aria-labelledby');
    return labelledBy !== null && labelledBy === (await title.getAttribute('id'));
  }

  /** The commands in this bucket, in rendered order. */
  async getItems(filters: WrCommandPaletteItemHarnessFilters = {}): Promise<WrCommandPaletteItemHarness[]> {
    return this.locatorForAll(WrCommandPaletteItemHarness.with(filters))();
  }

  /** The labels of the commands in this bucket, in rendered order. */
  async getItemLabels(): Promise<string[]> {
    const items = await this.getItems();
    return Promise.all(items.map(item => item.getLabel()));
  }
}
