/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrCheckboxHarness } from 'ngwr/checkbox/testing';
import type { WrDatePickerHarness, WrDateRangePickerHarness } from 'ngwr/date-picker/testing';
import type { WrFileUploadHarness } from 'ngwr/file-upload/testing';
import type { WrInputHarness } from 'ngwr/input/testing';
import type { WrInputNumberHarness } from 'ngwr/input-number/testing';
import type { WrRadioGroupHarness } from 'ngwr/radio/testing';
import type { WrRatingHarness } from 'ngwr/rating/testing';
import type { WrSegmentedHarness } from 'ngwr/segmented/testing';
import type { WrSelectHarness } from 'ngwr/select/testing';
import type { WrSliderHarness } from 'ngwr/slider/testing';
import type { WrSwitchHarness } from 'ngwr/switch/testing';
import type { WrTextareaHarness } from 'ngwr/textarea/testing';

/**
 * The harness of the control each field kind draws. `array` is absent: a
 * repeating group draws no control of its own, and `WrSchemaFormArrayHarness`
 * drives it.
 */
export interface WrSchemaFormControlHarnesses {
  readonly input: WrInputHarness;
  readonly textarea: WrTextareaHarness;
  readonly number: WrInputNumberHarness;
  readonly select: WrSelectHarness;
  readonly multiselect: WrSelectHarness;
  readonly tags: WrSelectHarness;
  readonly checkbox: WrCheckboxHarness;
  readonly switch: WrSwitchHarness;
  readonly radio: WrRadioGroupHarness;
  readonly segmented: WrSegmentedHarness;
  readonly date: WrDatePickerHarness;
  readonly daterange: WrDateRangePickerHarness;
  readonly slider: WrSliderHarness;
  readonly rating: WrRatingHarness;
  readonly file: WrFileUploadHarness;
}

/** A field kind that draws a control: every `WrFieldKind` but `array`. */
export type WrSchemaFormControlKind = keyof WrSchemaFormControlHarnesses;
