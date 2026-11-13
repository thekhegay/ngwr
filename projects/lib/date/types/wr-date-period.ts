/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * A span of days a date can stand for: the week, month, quarter or year it is
 * in. `wrPeriodStart` and `wrPeriodEnd` give its two ends, and the period modes
 * of `<wr-date-picker>` hold its first day.
 */
export type WrDatePeriod = 'week' | 'month' | 'quarter' | 'year';

/** A week of the year: its number, and the year that number counts in. */
export interface WrWeekOfYear {
  /** 1 to 53. */
  readonly week: number;
  /**
   * The year the week belongs to, which near 1 January is not always the
   * year of the date: 29 December 2025 is in week 1 of 2026.
   */
  readonly year: number;
}
