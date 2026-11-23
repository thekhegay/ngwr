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

/**
 * The `value` type of `<wr-date-picker>` under a {@link WrDatePickerValueFormat}:
 * `Date` for `'date'`, a string for `'day'`, either for a format that can be both.
 * The first check is on `[F]`, not `F`: with no `valueFormat` binding the
 * template type-checker passes the format as `any`, which a conditional on a
 * bare `F` reads as both branches, and the value must then be the default `Date`.
 */
export type WrDatePickerValue<F extends WrDatePickerValueFormat = 'date'> = [F] extends ['date']
  ? Date
  : 'date' extends F
    ? Date | string
    : string;
