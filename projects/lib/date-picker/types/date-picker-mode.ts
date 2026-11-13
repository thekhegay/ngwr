/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * What `<wr-date-picker>` picks:
 *
 * - `date`, `time`, `datetime`: a day, a time of day, or both
 * - `week`, `month`, `quarter`, `year`: a period, held as its first day
 */
export type WrDatePickerMode = 'date' | 'time' | 'datetime' | 'week' | 'month' | 'quarter' | 'year';

/**
 * What each end of `<wr-date-range-picker>` picks:
 *
 * - `date`, `datetime`: a day, or a day and a time
 * - `month`, `quarter`, `year`: a period. The range runs from the first day of
 *   the start period to the last day of the end period.
 */
export type WrDateRangePickerMode = 'date' | 'datetime' | 'month' | 'quarter' | 'year';
