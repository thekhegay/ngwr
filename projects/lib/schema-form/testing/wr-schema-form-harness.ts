/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrFieldKind } from 'ngwr/form';

import type {
  WrSchemaFormControlHarnesses,
  WrSchemaFormFieldHarnessFilters,
  WrSchemaFormHarnessFilters,
} from './types';
import { WrSchemaFormFieldHarness } from './wr-schema-form-field-harness';

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

  /** The fields drawn, in the model's key order. */
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
  async getControl<K extends WrFieldKind>(label: string | RegExp, kind: K): Promise<WrSchemaFormControlHarnesses[K]> {
    return (await this.getField(label)).getControl(kind);
  }

  /** Every error message the form is showing, in field order. */
  async getErrors(): Promise<string[]> {
    const fields = await this.getFields();
    return (await Promise.all(fields.map(field => field.getErrors()))).flat();
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
