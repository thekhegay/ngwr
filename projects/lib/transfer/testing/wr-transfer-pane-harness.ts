/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrTransferItemHarnessFilters, WrTransferPaneHarnessFilters, WrTransferSide } from './interfaces';
import { WrTransferItemHarness } from './wr-transfer-item-harness';

/**
 * Test harness for ONE pane of a `<wr-transfer>` — reached with
 * `WrTransferHarness.getPane('source' | 'target')`.
 *
 * The two panes are the same block rendered twice (the component's template
 * iterates them), so they are one harness class keyed by side rather than two sets
 * of `…Source` / `…Target` methods: the side is named once, at `getPane()`, and
 * every question after that is asked of a pane without repeating which one. It also
 * means the symmetry cannot rot — a method that only works on the left is
 * impossible to write here.
 *
 * What a pane SHOWS is the honest scope of everything below. `[items]` minus the
 * value on the left, the value on the right, and then the pane's own filter on top:
 * rows a filter has hidden are not rendered at all, are not counted by the header,
 * and — the component's own rule — are not moved either, however they were staged.
 *
 * @example
 * ```ts
 * const source = await transfer.getPane('source');
 *
 * await source.search('adm');
 * await source.checkAll();
 * expect(await source.getCheckedLabels()).toEqual(['Admin']);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrTransferPaneHarness extends ComponentHarness {
  /**
   * The pane is a plain `<div>` with no role of its own — the heading names the
   * list, and the checkbox in each row carries the semantics — so its BEM class is
   * the only handle, and being `ViewEncapsulation.None` that class is public API.
   */
  static hostSelector = '.wr-transfer__pane';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrTransferPaneHarnessFilters = {}): HarnessPredicate<WrTransferPaneHarness> {
    return new HarnessPredicate(WrTransferPaneHarness, options)
      .addOption('side', options.side, async (harness, side) => (await harness.getSide()) === side)
      .addOption('title', options.title, (harness, title) => HarnessPredicate.stringMatches(harness.getTitle(), title));
  }

  private readonly list = this.locatorFor('ul.wr-transfer__list');
  private readonly selectAllBox = this.locatorFor('.wr-transfer__head input.wr-checkbox__input');
  private readonly searchBox = this.locatorForOptional('.wr-transfer__search input');

  /**
   * Which side this pane is.
   *
   * From the `--target` modifier rather than from DOM order: order is a layout fact
   * that `dir="rtl"` and any future reflow are free to change, while the modifier is
   * what the component says the pane MEANS.
   */
  async getSide(): Promise<WrTransferSide> {
    return (await (await this.host()).hasClass('wr-transfer__pane--target')) ? 'target' : 'source';
  }

  /** The pane's heading — `[sourceTitle]` / `[targetTitle]`, or the i18n fallback. */
  async getTitle(): Promise<string> {
    return (await this.locatorFor('.wr-transfer__title')()).text();
  }

  /**
   * The count beside the heading, verbatim — `'1 / 4'` with the built-in copy.
   *
   * Deliberately not parsed into numbers: it is an i18n FORMAT
   * (`transfer.count`) a consuming app can replace wholesale, so a harness that
   * split it on `/` would answer for the default catalog and break on a translated
   * one. Its two numbers are `(await getCheckedLabels()).length` and
   * `(await getItems()).length` — both of which this harness reads from the rendered
   * rows, so a spec can assert the header agrees with them.
   */
  async getCountText(): Promise<string> {
    return (await this.locatorFor('.wr-transfer__count')()).text();
  }

  /**
   * The list's accessible name — the `aria-label` on the `<ul>`, which repeats the
   * heading so that a row announced in isolation still says which pane it is in.
   */
  async getListLabel(): Promise<string | null> {
    return (await this.list()).getAttribute('aria-label');
  }

  /**
   * The explicit `role` on the pane's list, which is `null` — and that `null` is the
   * ANSWER, not a gap worth fixing.
   *
   * The pane is a plain `<ul>` of checkboxes on purpose. Dressing it as a
   * `role="listbox"` of `role="option"` rows reads better in the abstract but is
   * invalid: an option may not contain an interactive control, and the axe gate
   * rejects it. Pinning this is what keeps that "improvement" from looking like a
   * win.
   */
  async getListRole(): Promise<string | null> {
    return (await this.list()).getAttribute('role');
  }

  /** The rows the pane is showing, in render order. */
  async getItems(filters: WrTransferItemHarnessFilters = {}): Promise<WrTransferItemHarness[]> {
    return this.locatorForAll(WrTransferItemHarness.with(filters))();
  }

  /**
   * The labels the pane is showing, in render order.
   *
   * On the right that is the value, in the order the user built it — not `[items]`
   * order, which the component deliberately does not impose.
   */
  async getItemLabels(): Promise<string[]> {
    const items = await this.getItems();
    return Promise.all(items.map(item => item.getLabel()));
  }

  /** The first row matching the filters, or a failure that says what the pane is showing. */
  async getItem(filters: WrTransferItemHarnessFilters): Promise<WrTransferItemHarness> {
    const [item] = await this.getItems(filters);
    if (!item) {
      const showing = await this.getItemLabels();
      const side = await this.getSide();
      throw new Error(
        `WrTransferPaneHarness.getItem(): no row matched ${JSON.stringify(filters)} in the ${side} pane, ` +
          `which is showing [${showing.join(', ')}]. A row in the other pane, or one this pane's search has ` +
          'filtered out, is not here.'
      );
    }
    return item;
  }

  /**
   * The labels of the rows STAGED for the next move, in render order.
   *
   * The staged set and the value are different things, and this is the one the pane
   * shows: read from the rendered rows, so a row staged before a search hid it is
   * absent — exactly as the header count and the move itself treat it.
   */
  async getCheckedLabels(): Promise<string[]> {
    const items = await this.getItems({ checked: true });
    return Promise.all(items.map(item => item.getLabel()));
  }

  /** The placeholder shown in a pane with no rows, or `null` while it has some. */
  async getEmptyText(): Promise<string | null> {
    const empty = await this.locatorForOptional('.wr-transfer__empty')();
    return empty ? empty.text() : null;
  }

  /** Whether this pane has a filter box — `[searchable]` puts one above both panes. */
  async hasSearch(): Promise<boolean> {
    return (await this.searchBox()) !== null;
  }

  /**
   * Type into the pane's filter box, narrowing it to the rows whose label contains
   * the query (case-insensitively).
   *
   * Pass `''` to clear it. No `change` is dispatched — `input` is the event the
   * component listens for, and the one a real keystroke carries; a browser defers
   * `change` on a text field to the commit, so nothing here depends on it. (The
   * keystrokes themselves come with the `keydown` / `keypress` / `keyup` the CDK
   * sends alongside, which this component ignores.)
   */
  async search(query: string): Promise<void> {
    const box = await this.searchBox();
    if (!box) {
      throw new Error(
        `WrTransferPaneHarness.search(): the ${await this.getSide()} pane has no filter box — ` +
          '`searchable` is off on the transfer, and it turns them on for both panes at once.'
      );
    }

    // `clear()` dispatches `input` on its own, and `sendKeys('')` throws, so an empty
    // query is the clear and nothing else.
    await box.clear();
    if (query.length > 0) await box.sendKeys(query);
  }

  /** What is currently typed in the pane's filter box, or `''`. Throws when there is none. */
  async getSearchValue(): Promise<string> {
    return (await this.searchOrThrow('getSearchValue')).getProperty<string>('value');
  }

  /** The filter box's placeholder — `[searchPlaceholder]`, or the i18n fallback. */
  async getSearchPlaceholder(): Promise<string> {
    return (await this.searchOrThrow('getSearchPlaceholder')).getProperty<string>('placeholder');
  }

  /**
   * The filter box's accessible name.
   *
   * Composed with the pane heading by the component, and it has to be: both panes
   * carry the same placeholder, so an unnamed pair announces as two identical
   * "Search" fields with no way to tell which list either one filters.
   */
  async getSearchLabel(): Promise<string | null> {
    return (await this.searchOrThrow('getSearchLabel')).getAttribute('aria-label');
  }

  /**
   * The select-all box's accessible name.
   *
   * It has one of its own — the heading names the LIST, so reusing it here would
   * leave a screen reader announcing two different controls identically.
   */
  async getSelectAllLabel(): Promise<string | null> {
    return (await this.selectAllBox()).getAttribute('aria-label');
  }

  /** Whether every row the pane is showing that CAN be staged is staged. */
  async isAllChecked(): Promise<boolean> {
    return (await this.selectAllBox()).getProperty<boolean>('checked');
  }

  /**
   * Whether some of the pane's stageable rows are staged and others are not.
   *
   * `indeterminate` is a DOM PROPERTY, not an attribute — reading the attribute
   * would report `null` for a box that is visibly dashed.
   */
  async isPartiallyChecked(): Promise<boolean> {
    return (await this.selectAllBox()).getProperty<boolean>('indeterminate');
  }

  /**
   * Whether the select-all box refuses interaction — a disabled transfer, or a pane
   * with nothing stageable in it (empty, filtered to nothing, or showing only
   * disabled rows).
   */
  async isSelectAllDisabled(): Promise<boolean> {
    return (await this.selectAllBox()).getProperty<boolean>('disabled');
  }

  /**
   * Click the select-all box once.
   *
   * Its scope is the rows the pane is SHOWING and can stage: a filtered-out row and
   * a disabled row are both outside it. Worth knowing before asserting on a partial
   * pane — the box reads UNchecked while the staging is partial, so one click there
   * stages everything rather than clearing it. {@link uncheckAll} handles that.
   */
  async toggleSelectAll(): Promise<void> {
    if (await this.isSelectAllDisabled()) {
      throw new Error(
        `WrTransferPaneHarness.toggleSelectAll(): the ${await this.getSide()} pane's select-all is disabled, ` +
          'so the click would change nothing — the transfer is disabled, or this pane shows no row that can be ' +
          'staged (empty, filtered to nothing, or every row disabled).'
      );
    }
    await (await this.selectAllBox()).click();
  }

  /** Stage every row the pane shows that can be staged. A pane already fully staged is left alone. */
  async checkAll(): Promise<void> {
    if (!(await this.isAllChecked())) await this.toggleSelectAll();
  }

  /** Clear the pane's staging. */
  async uncheckAll(): Promise<void> {
    if (await this.isAllChecked()) {
      await this.toggleSelectAll();
      return;
    }
    // Two clicks from a partial pane, and there is no shortcut: the box is UNchecked
    // there, so the first click stages the rest and only the second clears the lot.
    if (await this.isPartiallyChecked()) {
      await this.toggleSelectAll();
      await this.toggleSelectAll();
    }
  }

  /** The filter box, or a failure naming the input that turns it on. */
  private async searchOrThrow(method: string): Promise<TestElement> {
    const box = await this.searchBox();
    if (!box) {
      throw new Error(
        `WrTransferPaneHarness.${method}(): the ${await this.getSide()} pane has no filter box — ` +
          '`searchable` is off on the transfer.'
      );
    }
    return box;
  }
}
