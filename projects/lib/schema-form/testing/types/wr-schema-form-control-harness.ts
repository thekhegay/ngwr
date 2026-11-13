/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrCheckboxHarness } from 'ngwr/checkbox/testing';
import type { WrDatePickerHarness } from 'ngwr/date-picker/testing';
import type { WrInputHarness } from 'ngwr/input/testing';
import type { WrInputNumberHarness } from 'ngwr/input-number/testing';
import type { WrRadioGroupHarness } from 'ngwr/radio/testing';
import type { WrSelectHarness } from 'ngwr/select/testing';
import type { WrSliderHarness } from 'ngwr/slider/testing';
import type { WrSwitchHarness } from 'ngwr/switch/testing';
import type { WrTextareaHarness } from 'ngwr/textarea/testing';

/** The harness of the control each field kind draws. */
export interface WrSchemaFormControlHarnesses {
  readonly input: WrInputHarness;
  readonly textarea: WrTextareaHarness;
  readonly number: WrInputNumberHarness;
  readonly select: WrSelectHarness;
  readonly checkbox: WrCheckboxHarness;
  readonly switch: WrSwitchHarness;
  readonly radio: WrRadioGroupHarness;
  readonly date: WrDatePickerHarness;
  readonly slider: WrSliderHarness;
}
