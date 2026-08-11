/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Which boxes of a time stepper to type into. Omitted fields are left alone, so
 * `{ minutes: 45 }` changes the minutes and nothing else.
 *
 * Hours are given the way the stepper SHOWS them: 0-23 for a 24-hour panel,
 * 1-12 for a 12-hour one (where AM/PM stays where it was — flip it with
 * `toggleMeridiem()`).
 */
export interface WrDatePickerTimeFields {
  readonly hours?: number;
  readonly minutes?: number;
  readonly seconds?: number;
}
