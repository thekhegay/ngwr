/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive } from '@angular/core';

import { WR_FORM_FIELD } from 'ngwr/form';

/**
 * Hides the surrounding `<wr-form-field>` from the range's END input. Not part
 * of the public API.
 *
 * `wrInput` adopts the field's `controlId` whenever the element carries no `id`
 * of its own, and `<wr-date-range-picker>` renders two of them: both took the
 * same id, so the document held it twice and the field's `<label for>` resolved
 * to whichever input came first. One label names one value — the same call
 * `wr-slider` makes for its two thumbs — so the START input keeps the id and
 * the end input takes none.
 *
 * All or nothing, deliberately: `WrFormFieldContext.controlId` is a
 * `Signal<string>` with no way to say "no id" (an empty one is no more valid
 * than a duplicate), so shadowing the token is the only lever, and it drops the
 * field's `aria-describedby` / `aria-invalid` from this input too. The message
 * stays announced from the start input, exactly as the slider's upper thumb
 * leaves it on the lower one.
 *
 * @internal
 */
@Directive({
  selector: 'input[wrDateRangeEnd]',
  providers: [{ provide: WR_FORM_FIELD, useValue: null }],
})
export class WrDateRangeEndInput {}
