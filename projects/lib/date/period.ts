/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrDatePeriod, WrWeekOfYear } from './types';
import type { WrDateAdapter } from './wr-date-adapter';

function lastOfMonth<TDate>(adapter: WrDateAdapter<TDate>, first: TDate): TDate {
  return adapter.createDate(adapter.getYear(first), adapter.getMonth(first), adapter.getDaysInMonth(first));
}

/**
 * The first day of the week, month, quarter or year `date` is in, at the
 * adapter's start of day.
 *
 * A week starts on the adapter's `getFirstDayOfWeek()`, so it follows the
 * locale. Quarters are calendar quarters: January, April, July and October
 * open them.
 *
 * @example
 * ```ts
 * wrPeriodStart(adapter, new Date(2026, 4, 20), 'quarter'); // 1 April 2026
 * ```
 */
export function wrPeriodStart<TDate>(adapter: WrDateAdapter<TDate>, date: TDate, period: WrDatePeriod): TDate {
  const year = adapter.getYear(date);
  const month = adapter.getMonth(date);
  switch (period) {
    case 'week': {
      const offset = (adapter.getDayOfWeek(date) - adapter.getFirstDayOfWeek() + 7) % 7;
      return adapter.addDays(adapter.createDate(year, month, adapter.getDate(date)), -offset);
    }
    case 'month':
      return adapter.createDate(year, month, 1);
    case 'quarter':
      return adapter.createDate(year, month - (month % 3), 1);
    case 'year':
      return adapter.createDate(year, 0, 1);
  }
}

/**
 * The last day of the week, month, quarter or year `date` is in, at the
 * adapter's start of day: with {@link wrPeriodStart} it is the period as an
 * inclusive range of days.
 *
 * @example
 * ```ts
 * wrPeriodEnd(adapter, new Date(2026, 1, 3), 'month'); // 28 February 2026
 * ```
 */
export function wrPeriodEnd<TDate>(adapter: WrDateAdapter<TDate>, date: TDate, period: WrDatePeriod): TDate {
  const start = wrPeriodStart(adapter, date, period);
  switch (period) {
    case 'week':
      return adapter.addDays(start, 6);
    case 'month':
      return lastOfMonth(adapter, start);
    case 'quarter':
      return lastOfMonth(adapter, adapter.addMonths(start, 2));
    case 'year':
      return adapter.createDate(adapter.getYear(start), 11, 31);
  }
}

/**
 * The week of the year `date` is in.
 *
 * Week 1 is the week holding 4 January, so the first week with four or more
 * days of the new year. With Monday as the first day of the week that is the
 * ISO 8601 week; with another first day the same rule runs on that week.
 *
 * @example
 * ```ts
 * wrWeekOfYear(adapter, new Date(2026, 2, 18)); // { week: 12, year: 2026 }
 * ```
 */
export function wrWeekOfYear<TDate>(adapter: WrDateAdapter<TDate>, date: TDate): WrWeekOfYear {
  // The fourth day of a week decides its year: four days or more lie there.
  const middle = adapter.addDays(wrPeriodStart(adapter, date, 'week'), 3);
  const year = adapter.getYear(middle);
  let dayOfYear = adapter.getDate(middle);
  for (let month = 0; month < adapter.getMonth(middle); month++) {
    dayOfYear += adapter.getDaysInMonth(adapter.createDate(year, month, 1));
  }
  return { week: Math.floor((dayOfYear - 1) / 7) + 1, year };
}

/**
 * The first day of week `week` of `year`, counted as {@link wrWeekOfYear}
 * counts, or `null` when that year has no such week (week 53 of most years).
 *
 * @example
 * ```ts
 * wrWeekStart(adapter, 2026, 12); // Monday 16 March 2026, in a Monday-first locale
 * ```
 */
export function wrWeekStart<TDate>(adapter: WrDateAdapter<TDate>, year: number, week: number): TDate | null {
  if (!Number.isInteger(week) || week < 1 || week > 53) return null;
  const first = wrPeriodStart(adapter, adapter.createDate(year, 0, 4), 'week');
  const start = adapter.addDays(first, (week - 1) * 7);
  const found = wrWeekOfYear(adapter, start);
  return found.week === week && found.year === year ? start : null;
}
