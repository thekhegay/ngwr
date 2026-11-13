/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrSchemaFormArrayHarnessFilters } from './types';
import { WrSchemaFormHarness } from './wr-schema-form-harness';

/**
 * Test harness for a repeating group of a `<wr-schema-form>`: a field of
 * `kind: 'array'`, drawn as one group per item with an Add and a Remove
 * button.
 *
 * Each item is a `<wr-schema-form>` of its own, so {@link getItem} hands back a
 * `WrSchemaFormHarness` scoped to that item. Every query here is scoped by the
 * id the group publishes, never by class: an item may hold a repeating group
 * itself, and a class query would count its items too.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSchemaFormArrayHarness extends ComponentHarness {
  static hostSelector = '.wr-schema-form__array';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSchemaFormArrayHarnessFilters = {}): HarnessPredicate<WrSchemaFormArrayHarness> {
    return new HarnessPredicate(WrSchemaFormArrayHarness, options).addOption('label', options.label, (harness, label) =>
      HarnessPredicate.stringMatches(harness.getLabel(), label)
    );
  }

  /** The group's label: the text of its `<legend>`, without the required marker. */
  async getLabel(): Promise<string> {
    return (await this.locatorFor('.wr-schema-form__legend')()).text({ exclude: '.wr-form-field__required' });
  }

  /** Whether the group is marked required. */
  async isRequired(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-schema-form__legend .wr-form-field__required')()) !== null;
  }

  /** The number of items drawn. */
  async getItemCount(): Promise<number> {
    return (await this.locatorForAll(`${await this.list()} > .wr-schema-form__item`)()).length;
  }

  /** The heading of every item, in order: "Address 1", "Address 2". */
  async getItemTitles(): Promise<string[]> {
    const titles = await this.locatorForAll(
      `${await this.list()} > .wr-schema-form__item > .wr-schema-form__item-head > .wr-schema-form__item-title`
    )();
    return Promise.all(titles.map(title => title.text()));
  }

  /** The form of every item, in order. */
  async getItems(): Promise<WrSchemaFormHarness[]> {
    return this.locatorForAll(
      WrSchemaFormHarness.with({ selector: `${await this.list()} > .wr-schema-form__item > wr-schema-form` })
    )();
  }

  /** The form of the item at this index, or a failure saying how many items there are. */
  async getItem(index: number): Promise<WrSchemaFormHarness> {
    const items = await this.getItems();
    const item = items[index];
    if (!item) {
      throw new Error(
        `WrSchemaFormArrayHarness.getItem(${index}): "${await this.getLabel()}" draws ${items.length} item(s).`
      );
    }
    return item;
  }

  /** Whether the Add button is drawn and enabled. It is not drawn when the spec has no `item`. */
  async canAdd(): Promise<boolean> {
    const button = await this.addButton();
    return button !== null && !(await button.getProperty<boolean>('disabled'));
  }

  /** Whether items can be removed: `false` at the schema's `minLength`, and with no item to remove. */
  async canRemove(): Promise<boolean> {
    const [button] = await this.removeButtons();
    return button !== undefined && !(await button.getProperty<boolean>('disabled'));
  }

  /** Click Add. Throws when the button is not drawn or is disabled, where a click would do nothing. */
  async add(): Promise<void> {
    const button = await this.addButton();
    if (!button) {
      throw new Error(
        `WrSchemaFormArrayHarness.add(): "${await this.getLabel()}" draws no Add button. ` +
          "The spec needs an `item` factory: { kind: 'array', item: () => ({ … }) }."
      );
    }
    if (await button.getProperty<boolean>('disabled')) {
      throw new Error(
        `WrSchemaFormArrayHarness.add(): the Add button of "${await this.getLabel()}" is disabled. ` +
          'The list is at its maxLength, or the field is disabled or read-only.'
      );
    }
    await button.click();
  }

  /** Click Remove on the item at this index. Throws when there is no such item or its button is disabled. */
  async remove(index: number): Promise<void> {
    const buttons = await this.removeButtons();
    const button = buttons[index];
    if (!button) {
      throw new Error(
        `WrSchemaFormArrayHarness.remove(${index}): "${await this.getLabel()}" draws ${buttons.length} item(s).`
      );
    }
    if (await button.getProperty<boolean>('disabled')) {
      throw new Error(
        `WrSchemaFormArrayHarness.remove(${index}): the Remove buttons of "${await this.getLabel()}" are disabled. ` +
          'The list is at its minLength, or the field is disabled or read-only.'
      );
    }
    await button.click();
  }

  /**
   * The accessible name of the Remove button at this index, resolved through
   * its `aria-labelledby`: its own text and then the item's heading.
   */
  async getRemoveName(index: number): Promise<string> {
    const button = (await this.removeButtons())[index];
    if (!button) throw new Error(`WrSchemaFormArrayHarness.getRemoveName(${index}): there is no such item.`);
    const ids = ((await button.getAttribute('aria-labelledby')) ?? '').split(/\s+/).filter(Boolean);
    const parts = await Promise.all(
      ids.map(async id => {
        const part = await this.locatorForOptional(`[id="${id}"]`)();
        if (!part) {
          throw new Error(
            `WrSchemaFormArrayHarness.getRemoveName(${index}): aria-labelledby names "${id}", which is not in the group.`
          );
        }
        return part.text();
      })
    );
    return parts.join(' ');
  }

  /** Whether the Add button holds focus, which is where it goes when the last item is removed. */
  async isAddFocused(): Promise<boolean> {
    return (await (await this.addButton())?.isFocused()) ?? false;
  }

  /**
   * The group's OWN error messages, a `minLength` on the list for one. An
   * item's errors are its fields', read off {@link getItem}.
   */
  async getErrors(): Promise<string[]> {
    const id = (await this.listId()).replace(/-items$/, '-errors');
    const errors = await this.locatorForAll(`[id="${id}"] > .wr-form-field__error`)();
    return Promise.all(errors.map(error => error.text()));
  }

  private async listId(): Promise<string> {
    const id = await (await this.locatorFor('.wr-schema-form__items')()).getAttribute('id');
    if (!id) throw new Error('WrSchemaFormArrayHarness: the item list carries no id to scope a query by.');
    return id;
  }

  private async list(): Promise<string> {
    return `[id="${await this.listId()}"]`;
  }

  private async addButton(): Promise<TestElement | null> {
    return this.locatorForOptional(`${await this.list()} > .wr-schema-form__add`)();
  }

  private async removeButtons(): Promise<TestElement[]> {
    return this.locatorForAll(
      `${await this.list()} > .wr-schema-form__item > .wr-schema-form__item-head > .wr-schema-form__remove`
    )();
  }
}
