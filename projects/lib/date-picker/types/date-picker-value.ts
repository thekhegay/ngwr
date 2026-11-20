/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * What `<wr-date-picker>` holds in its `value` model: `'date'` is a `Date`,
 * `'day'` is a `YYYY-MM-DD` string, the browser-local day `wrToDay` writes.
 */
export type WrDatePickerValueFormat = 'date' | 'day';

/** The `value` type of `<wr-date-picker>` under a {@link WrDatePickerValueFormat}. */
export type WrDatePickerValue<F extends WrDatePickerValueFormat = 'date'> = F extends 'day' ? string : Date;
