/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, type HarnessQuery, HarnessPredicate } from '@angular/cdk/testing';

import { WrCheckboxHarness } from 'ngwr/checkbox/testing';
import { WrDatePickerHarness, WrDateRangePickerHarness } from 'ngwr/date-picker/testing';
import { WrFileUploadHarness } from 'ngwr/file-upload/testing';
import { WrFormFieldHarness } from 'ngwr/form/testing';
import { WrInputHarness } from 'ngwr/input/testing';
import { WrInputNumberHarness } from 'ngwr/input-number/testing';
import { WrRadioGroupHarness } from 'ngwr/radio/testing';
import { WrRatingHarness } from 'ngwr/rating/testing';
import { WrSegmentedHarness } from 'ngwr/segmented/testing';
import { WrSelectHarness } from 'ngwr/select/testing';
import { WrSliderHarness } from 'ngwr/slider/testing';
import { WrSwitchHarness } from 'ngwr/switch/testing';
import { WrTextareaHarness } from 'ngwr/textarea/testing';

import type { WrSchemaFormControlHarnesses, WrSchemaFormControlKind, WrSchemaFormFieldHarnessFilters } from './types';

/**
 * The element each kind draws, and the harness that drives it. `input` is
 * last and has no element of its own to look for: it is the kind left when
 * none of the others matched, as it is in the component's template. The two
 * `wr-select` modes come before the plain one, which matches all three.
 */
const CONTROLS: readonly (readonly [WrSchemaFormControlKind, string, HarnessQuery<ComponentHarness>])[] = [
  ['textarea', 'wr-textarea', WrTextareaHarness],
  ['number', 'wr-input-number', WrInputNumberHarness],
  ['multiselect', 'wr-select.wr-select--multi', WrSelectHarness],
  ['tags', 'wr-select.wr-select--tag', WrSelectHarness],
  ['select', 'wr-select', WrSelectHarness],
  ['checkbox', 'wr-checkbox', WrCheckboxHarness],
  ['switch', 'wr-switch', WrSwitchHarness],
  ['radio', 'wr-radio-group', WrRadioGroupHarness],
  ['segmented', 'wr-segmented', WrSegmentedHarness],
  ['date', 'wr-date-picker', WrDatePickerHarness],
  ['daterange', 'wr-date-range-picker', WrDateRangePickerHarness],
  ['slider', 'wr-slider', WrSliderHarness],
  ['rating', 'wr-rating', WrRatingHarness],
  ['file', 'wr-file-upload', WrFileUploadHarness],
  ['input', 'input[wrInput]', WrInputHarness],
];

/**
 * Test harness for one field of a `<wr-schema-form>`: its label, its control
 * and its errors.
 *
 * It answers nothing about the control itself. {@link getControl} hands back
 * the harness that control already has, `WrSelectHarness` for a select and so
 * on, and {@link getFormField} the `WrFormFieldHarness` around it, so a value
 * is read and written in one place.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSchemaFormFieldHarness extends ComponentHarness {
  static hostSelector = '.wr-schema-form__field';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSchemaFormFieldHarnessFilters = {}): HarnessPredicate<WrSchemaFormFieldHarness> {
    return new HarnessPredicate(WrSchemaFormFieldHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('kind', options.kind, async (harness, kind) => (await harness.getKind()) === kind)
      .addOption('invalid', options.invalid, async (harness, invalid) => (await harness.isInvalid()) === invalid);
  }

  private readonly formField = this.locatorFor(WrFormFieldHarness);

  /**
   * The field's label: the one above the control, or, for a checkbox and a
   * switch, the one they carry inside themselves.
   */
  async getLabel(): Promise<string> {
    const above = await (await this.formField()).getLabel();
    if (above !== null) return above;
    const kind = await this.getKind();
    if (kind === 'checkbox') return (await this.getControl('checkbox')).getLabel();
    if (kind === 'switch') return (await this.getControl('switch')).getLabel();
    return '';
  }

  /** The kind of control the field draws, from the element in it. */
  async getKind(): Promise<WrSchemaFormControlKind> {
    for (const [kind, selector] of CONTROLS) {
      if (await this.locatorForOptional(selector)()) return kind;
    }
    throw new Error(`WrSchemaFormFieldHarness.getKind(): the field draws no control this harness knows.`);
  }

  /**
   * The harness of the field's control. Name the kind and the result is typed:
   * `getControl('select')` is a `WrSelectHarness`. Throws when the field draws
   * another kind, and says which.
   */
  async getControl<K extends WrSchemaFormControlKind>(kind: K): Promise<WrSchemaFormControlHarnesses[K]> {
    const drawn = await this.getKind();
    if (drawn !== kind) {
      throw new Error(
        `WrSchemaFormFieldHarness.getControl('${kind}'): "${await this.labelOrEmpty()}" draws a '${drawn}' control.`
      );
    }
    const query = CONTROLS.find(([each]) => each === kind)![2];
    return await this.locatorFor(query)();
  }

  /** The `<wr-form-field>` around the control: label wiring, hint, required mark and errors. */
  async getFormField(): Promise<WrFormFieldHarness> {
    return this.formField();
  }

  /** The hint under the control, or `null`. */
  async getHint(): Promise<string | null> {
    return (await this.formField()).getHint();
  }

  /** Whether the field is marked required. */
  async isRequired(): Promise<boolean> {
    return (await this.formField()).isRequired();
  }

  /** Whether the field is showing an error. A field nobody touched shows none, valid or not. */
  async isInvalid(): Promise<boolean> {
    return (await this.formField()).isInvalid();
  }

  /** The error messages the field is showing, in order. */
  async getErrors(): Promise<string[]> {
    return (await this.formField()).getErrorTexts();
  }

  /**
   * How many grid columns the field spans, from the `grid-column` the
   * component wrote on it, already clamped to the form's `columns`.
   */
  async getSpan(): Promise<number> {
    const style = (await (await this.host()).getAttribute('style')) ?? '';
    return Number(/grid-column:\s*span\s+(\d+)/.exec(style)?.[1] ?? Number.NaN);
  }

  /** The label for an error message, where a missing one must not throw a second error. */
  private async labelOrEmpty(): Promise<string> {
    return (await (await this.formField()).getLabel()) ?? '';
  }
}
