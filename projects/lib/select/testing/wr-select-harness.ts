/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  ComponentHarness,
  type HarnessLoader,
  HarnessPredicate,
  TestKey,
  type TestElement,
} from '@angular/cdk/testing';

import type { WrOptionHarnessFilters, WrSelectHarnessFilters } from './interfaces';
import { WrOptionHarness } from './wr-option-harness';

/**
 * Test harness for `<wr-select>` — single, multi, tag and search modes.
 *
 * The panel is NOT inside the select: it is a template portal in the overlay
 * container, a sibling of the whole app. So the options are reached through the
 * document root, scoped by the `aria-controls` id the trigger already publishes
 * — which is what keeps two selects on one page from reading each other's
 * options.
 *
 * @example
 * ```ts
 * const select = await loader.getHarness(WrSelectHarness);
 *
 * await select.open();
 * await select.selectOption({ text: 'Medium' });
 *
 * expect(await select.getValueText()).toBe('Medium');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSelectHarness extends ComponentHarness {
  static hostSelector = 'wr-select';

  /** Build a predicate that narrows the query. */
  static with(options: WrSelectHarnessFilters = {}): HarnessPredicate<WrSelectHarness> {
    return new HarnessPredicate(WrSelectHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getValueText(), text))
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled)
      .addOption('open', options.open, async (harness, open) => (await harness.isOpen()) === open);
  }

  /** Whether the panel is showing. */
  async isOpen(): Promise<boolean> {
    return (await this.host()).hasClass('wr-select--open');
  }

  /** Whether the select refuses interaction. */
  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass('wr-select--disabled');
  }

  /** Whether the select takes more than one value (multi or tag mode). */
  async isMultiple(): Promise<boolean> {
    return (await this.host()).hasClass('wr-select--multi');
  }

  /**
   * What the trigger currently shows as the selection: the chip labels joined by
   * `', '` in multi and tag modes, the label in single mode, the input's text in
   * search mode, and `''` when nothing is selected (the placeholder is showing).
   */
  async getValueText(): Promise<string> {
    const chips = await this.getChipLabels();
    if (chips.length > 0) return chips.join(', ');

    const value = await this.locatorForOptional('.wr-select__value')();
    if (value) return value.text();

    // Search mode keeps the display text in the input's value, not in the DOM.
    const search = await this.locatorForOptional('.wr-select__search-input')();
    return search ? search.getProperty<string>('value') : '';
  }

  /** The placeholder, or `null` when a selection is hiding it. */
  async getPlaceholder(): Promise<string | null> {
    const placeholder = await this.locatorForOptional('.wr-select__placeholder')();
    if (placeholder) return placeholder.text();

    const input = await this.searchInput();
    return input ? input.getProperty<string>('placeholder') : null;
  }

  /** The visible chip labels, in order. The `+N more` overflow chip is not one. */
  async getChipLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-select__chip-label')();
    return Promise.all(labels.map(label => label.text()));
  }

  /**
   * Open the panel.
   *
   * Throws rather than resolving quietly when the panel does not appear, because
   * the two reasons it would not are both worth failing on: a tag-mode select
   * has no panel at all, and a searchable one with `minChars` opens on the query
   * rather than on focus.
   */
  async open(): Promise<void> {
    if (await this.isOpen()) return;

    await (await this.locatorFor('.wr-select__trigger')()).click();
    if (await this.isOpen()) return;

    throw new Error(
      'WrSelectHarness.open(): the panel did not open. A tag-mode select has no panel, and a ' +
        'searchable select with `minChars` opens on the query — call typeSearch() instead.'
    );
  }

  /** Close the panel. A closed select is left alone. */
  async close(): Promise<void> {
    if (!(await this.isOpen())) return;
    // Escape reaches the select through the CDK's keyboard dispatcher, so it
    // works for the button trigger and the search input alike.
    await (await this.locatorFor('.wr-select__trigger')()).sendKeys(TestKey.ESCAPE);
  }

  /**
   * The options currently offered, in DOM order.
   *
   * Filtered-out options are dropped: a client-side search leaves them in the
   * DOM (registration order has to survive a query) and collapses them with CSS,
   * so counting raw elements would answer with the unfiltered list.
   */
  async getOptions(filters: WrOptionHarnessFilters = {}): Promise<WrOptionHarness[]> {
    const loader = await this.panelLoader();
    const all = await loader.getAllHarnesses(WrOptionHarness.with(filters));

    const visible: WrOptionHarness[] = [];
    for (const option of all) {
      if (!(await option.isHidden())) visible.push(option);
    }
    return visible;
  }

  /** The labels of the options currently offered, in DOM order. */
  async getOptionLabels(): Promise<string[]> {
    const options = await this.getOptions();
    return Promise.all(options.map(option => option.getText()));
  }

  /** Open the panel if needed, then click the first option matching the filters. */
  async selectOption(filters: WrOptionHarnessFilters): Promise<void> {
    await this.open();

    const [option] = await this.getOptions(filters);
    if (!option) throw new Error(`WrSelectHarness.selectOption(): no option matched ${JSON.stringify(filters)}.`);

    await option.click();
  }

  /** Type into a search or tag select's input, replacing whatever is there. */
  async typeSearch(query: string): Promise<void> {
    const input = await this.searchInput();
    if (!input) throw new Error('WrSelectHarness.typeSearch(): this select has no text input.');

    await input.clear();
    if (query) await input.sendKeys(query);
  }

  /** Click the clear (×) control. It only exists on a `clearable` select with a selection. */
  async clear(): Promise<void> {
    await (await this.locatorFor('.wr-select__clear')()).click();
  }

  /** Remove one chip by its label. */
  async removeChip(label: string): Promise<void> {
    const labels = await this.getChipLabels();
    const index = labels.indexOf(label);
    if (index < 0) throw new Error(`WrSelectHarness.removeChip(): no chip labelled "${label}".`);

    // Label and remove control are emitted once per chip by the same loop, so
    // the two lists line up by index.
    const removes = await this.locatorForAll('.wr-select__chip-remove')();
    await removes[index].click();
  }

  /** The "no results" message, or `null` when the panel is showing options. */
  async getNoResultsText(): Promise<string | null> {
    const empty = await this.inPanel('.wr-select-panel__empty');
    return empty ? empty.text() : null;
  }

  /** Whether the panel is showing its async loading row. */
  async isLoading(): Promise<boolean> {
    return (await this.inPanel('.wr-select-panel__loading')) !== null;
  }

  /** Move keyboard focus to the select. */
  async focus(): Promise<void> {
    const input = await this.searchInput();
    return (input ?? (await this.locatorFor('.wr-select__trigger')())).focus();
  }

  /** The text input of a search or tag select, or `null` for the button trigger. */
  private async searchInput(): Promise<TestElement | null> {
    return this.locatorForOptional('.wr-select__search-input, .wr-select__tag-input')();
  }

  /** One element inside THIS select's panel, or `null`. */
  private async inPanel(selector: string): Promise<TestElement | null> {
    return this.documentRootLocatorFactory().locatorForOptional(`#${await this.panelId()} ${selector}`)();
  }

  /**
   * A loader scoped to THIS select's panel.
   *
   * Scoped by the `aria-controls` id rather than by `.wr-select-panel`: the
   * overlay container is shared, so a bare class query would happily return the
   * options of a different select that happens to be open.
   */
  private async panelLoader(): Promise<HarnessLoader> {
    return this.documentRootLocatorFactory().harnessLoaderFor(`#${await this.panelId()}`);
  }

  /** The id the trigger publishes as `aria-controls`, which the panel carries. */
  private async panelId(): Promise<string> {
    const combobox = await this.locatorForOptional('[role="combobox"]')();
    const id = combobox ? await combobox.getAttribute('aria-controls') : null;

    if (!id) {
      throw new Error('WrSelectHarness: this select has no panel — tag mode renders its options inline.');
    }
    if (!(await this.isOpen())) {
      throw new Error('WrSelectHarness: the panel is closed — call open() first.');
    }

    return id;
  }
}
