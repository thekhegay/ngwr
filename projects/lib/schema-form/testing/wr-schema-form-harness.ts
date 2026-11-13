/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type {
  WrSchemaFormArrayHarnessFilters,
  WrSchemaFormControlHarnesses,
  WrSchemaFormControlKind,
  WrSchemaFormFieldHarnessFilters,
  WrSchemaFormHarnessFilters,
  WrSchemaFormSectionHarnessFilters,
} from './types';
import { WrSchemaFormArrayHarness } from './wr-schema-form-array-harness';
import { WrSchemaFormFieldHarness } from './wr-schema-form-field-harness';
import { WrSchemaFormSectionHarness } from './wr-schema-form-section-harness';

/**
 * Test harness for `<wr-schema-form>`, the form drawn from a Signal Forms
 * schema.
 *
 * Fields are found by LABEL, not by their key in the model. The key never
 * reaches the page: the component draws `spec.label`, or the key
 * de-camel-cased when there is none, and that text is also what a user and a
 * screen reader find the field by.
 *
 * There is no `submit()`. The component renders fields and nothing else: no
 * `<form>` element and no button, so submitting belongs to the page around it.
 * A field hidden by the schema's `hidden()` is not drawn, so it is not found.
 *
 * A repeating group draws each item as a `<wr-schema-form>` of its own, inside
 * this one. {@link getFields} and {@link getErrors} read everything this form
 * draws, items included, so two items answer two fields labelled "City":
 * {@link getItem} is the form of one item alone.
 *
 * @example
 * ```ts
 * const form = await loader.getHarness(WrSchemaFormHarness);
 *
 * const role = await form.getControl('Role', 'select');
 * await role.selectOption({ text: 'Admin' });
 * expect(await form.getErrors()).toEqual([]);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSchemaFormHarness extends ComponentHarness {
  static hostSelector = 'wr-schema-form';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSchemaFormHarnessFilters = {}): HarnessPredicate<WrSchemaFormHarness> {
    return new HarnessPredicate(WrSchemaFormHarness, options).addOption(
      'fieldLabel',
      options.fieldLabel,
      async (harness, label) => (await harness.getFields({ label })).length > 0
    );
  }

  /** The fields drawn, in the order they are drawn, with the fields of a repeating group's items among them. */
  async getFields(filters: WrSchemaFormFieldHarnessFilters = {}): Promise<WrSchemaFormFieldHarness[]> {
    return this.locatorForAll(WrSchemaFormFieldHarness.with(filters))();
  }

  /** The label of every field drawn, in order. */
  async getLabels(): Promise<string[]> {
    const fields = await this.getFields();
    return Promise.all(fields.map(field => field.getLabel()));
  }

  /** The first field with this label, or a failure naming the fields that are drawn. */
  async getField(label: string | RegExp): Promise<WrSchemaFormFieldHarness> {
    const [field] = await this.getFields({ label });
    if (!field) {
      throw new Error(
        `WrSchemaFormHarness.getField(): no field is labelled ${String(label)}. A field is found by the label ` +
          `it draws, not by its key. This form draws: ${(await this.getLabels()).join(', ')}.`
      );
    }
    return field;
  }

  /**
   * The harness of the control in the field with this label, typed by the kind
   * named: `getControl('Role', 'select')` is a `WrSelectHarness`. Throws when
   * the field draws another kind.
   */
  async getControl<K extends WrSchemaFormControlKind>(
    label: string | RegExp,
    kind: K
  ): Promise<WrSchemaFormControlHarnesses[K]> {
    return (await this.getField(label)).getControl(kind);
  }

  /** Every error message the form is showing, in the order drawn: each field's, and a repeating group's own. */
  async getErrors(): Promise<string[]> {
    const errors = await this.locatorForAll('.wr-form-field__error:not(.wr-form-field__error--hidden)')();
    return Promise.all(errors.map(error => error.text()));
  }

  /** The sections drawn, in order. */
  async getSections(filters: WrSchemaFormSectionHarnessFilters = {}): Promise<WrSchemaFormSectionHarness[]> {
    return this.locatorForAll(WrSchemaFormSectionHarness.with(filters))();
  }

  /** The first section with this title, or a failure naming the sections that are drawn. */
  async getSection(title: string | RegExp): Promise<WrSchemaFormSectionHarness> {
    const [section] = await this.getSections({ title });
    if (!section) {
      const drawn = await Promise.all((await this.getSections()).map(each => each.getTitle()));
      throw new Error(
        `WrSchemaFormHarness.getSection(): no section is titled ${String(title)}. ` +
          `This form draws: ${drawn.join(', ') || 'no section'}.`
      );
    }
    return section;
  }

  /** The repeating groups drawn, in order. */
  async getArrays(filters: WrSchemaFormArrayHarnessFilters = {}): Promise<WrSchemaFormArrayHarness[]> {
    return this.locatorForAll(WrSchemaFormArrayHarness.with(filters))();
  }

  /** The first repeating group with this label, or a failure naming the groups that are drawn. */
  async getArray(label: string | RegExp): Promise<WrSchemaFormArrayHarness> {
    const [array] = await this.getArrays({ label });
    if (!array) {
      const drawn = await Promise.all((await this.getArrays()).map(each => each.getLabel()));
      throw new Error(
        `WrSchemaFormHarness.getArray(): no repeating group is labelled ${String(label)}. ` +
          `This form draws: ${drawn.join(', ') || 'no repeating group'}.`
      );
    }
    return array;
  }

  /** Click Add on the repeating group with this label. Throws when it cannot take another item. */
  async addItem(arrayLabel: string | RegExp): Promise<void> {
    return (await this.getArray(arrayLabel)).add();
  }

  /** Click Remove on one item of the repeating group with this label. Throws when it cannot be removed. */
  async removeItem(arrayLabel: string | RegExp, index: number): Promise<void> {
    return (await this.getArray(arrayLabel)).remove(index);
  }

  /** The number of items the repeating group with this label draws. */
  async getItemCount(arrayLabel: string | RegExp): Promise<number> {
    return (await this.getArray(arrayLabel)).getItemCount();
  }

  /** The form of one item of the repeating group with this label: its fields, and nothing around them. */
  async getItem(arrayLabel: string | RegExp, index: number): Promise<WrSchemaFormHarness> {
    return (await this.getArray(arrayLabel)).getItem(index);
  }

  /**
   * The number of grid columns, from the track list the component wrote on the
   * host.
   */
  async getColumns(): Promise<number> {
    const style = (await (await this.host()).getAttribute('style')) ?? '';
    return Number(/grid-template-columns:\s*repeat\(\s*(\d+)/.exec(style)?.[1] ?? Number.NaN);
  }
}
