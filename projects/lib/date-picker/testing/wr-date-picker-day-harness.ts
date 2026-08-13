/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The day cell of a date-picker's calendar, under the name it shipped as.
 *
 * There is one implementation, and it lives with the component that owns the
 * element: a picker's popup IS a `<wr-calendar>`, and `.wr-calendar__day` is its
 * cell. `ngwr/calendar/testing` is therefore the home, and this alias keeps
 * `WrDatePickerDayHarness` working for every spec that already imports it — the two
 * names are the same class, so a harness from either query is usable with either.
 */
export { WrCalendarDayHarness as WrDatePickerDayHarness } from 'ngwr/calendar/testing';
