/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrSchemaFormFieldHarnessFilters, WrSchemaFormSectionHarnessFilters } from './types';
import { WrSchemaFormFieldHarness } from './wr-schema-form-field-harness';

/**
 * Test harness for one section of a `<wr-schema-form>`: the `<fieldset>` the
 * fields naming one `section` are drawn in.
 *
 * A section whose every field the schema hides is not drawn, so it is not
 * found.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSchemaFormSectionHarness extends ComponentHarness {
  static hostSelector = '.wr-schema-form__section';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSchemaFormSectionHarnessFilters = {}): HarnessPredicate<WrSchemaFormSectionHarness> {
    return new HarnessPredicate(WrSchemaFormSectionHarness, options).addOption(
      'title',
      options.title,
      (harness, title) => HarnessPredicate.stringMatches(harness.getTitle(), title)
    );
  }

  /** The section's title: the text of its `<legend>`, which is also the group's accessible name. */
  async getTitle(): Promise<string> {
    return (await this.locatorFor('.wr-schema-form__legend')()).text();
  }

  /**
   * The line under the title, or `null`. Read through the fieldset's
   * `aria-describedby`, so a description the group does not announce reads as
   * none.
   */
  async getDescription(): Promise<string | null> {
    const id = await (await this.host()).getAttribute('aria-describedby');
    if (!id) return null;
    const description = await this.locatorForOptional(`[id="${id}"]`)();
    if (!description) {
      throw new Error(
        `WrSchemaFormSectionHarness.getDescription(): the section's aria-describedby names "${id}", ` +
          'which is not an element inside it.'
      );
    }
    return description.text();
  }

  /** The fields drawn in the section, in order. */
  async getFields(filters: WrSchemaFormFieldHarnessFilters = {}): Promise<WrSchemaFormFieldHarness[]> {
    return this.locatorForAll(WrSchemaFormFieldHarness.with(filters))();
  }

  /** The label of every field drawn in the section, in order. */
  async getLabels(): Promise<string[]> {
    const fields = await this.getFields();
    return Promise.all(fields.map(field => field.getLabel()));
  }

  /** The number of columns of the section's own grid, from the track list the component wrote on it. */
  async getColumns(): Promise<number> {
    const style = (await (await this.locatorFor('.wr-schema-form__grid')()).getAttribute('style')) ?? '';
    return Number(/grid-template-columns:\s*repeat\(\s*(\d+)/.exec(style)?.[1] ?? Number.NaN);
  }
}
