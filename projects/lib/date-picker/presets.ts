/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrDateAdapter } from 'ngwr/date';

import type { WrDateRangePresetFn } from './types';

function endOfDay(adapter: WrDateAdapter<Date>, day: Date): Date {
  return adapter.setTime(day, 23, 59, 59);
}

function startOfMonth(adapter: WrDateAdapter<Date>, date: Date): Date {
  return adapter.createDate(adapter.getYear(date), adapter.getMonth(date), 1);
}

function wholeMonth(adapter: WrDateAdapter<Date>, first: Date): readonly [Date, Date] {
  return [first, endOfDay(adapter, adapter.addDays(first, adapter.getDaysInMonth(first) - 1))];
}

/**
 * The last `days` days, today included: `wrLastDays(7)` is today and the six
 * days before it, and `wrLastDays(1)` is today.
 *
 * @example
 * ```ts
 * readonly presets: WrDateRangePreset[] = [{ label: 'Last 7 days', range: wrLastDays(7) }];
 * ```
 */
export function wrLastDays(days: number): WrDateRangePresetFn {
  const back = Math.max(1, Math.trunc(days)) - 1;
  return ({ adapter, today }) => [adapter.addDays(today, -back), endOfDay(adapter, today)];
}

/** The week today is in, from the locale's first day of the week to its last. */
export function wrThisWeek(): WrDateRangePresetFn {
  return ({ adapter, today }) => {
    const offset = (adapter.getDayOfWeek(today) - adapter.getFirstDayOfWeek() + 7) % 7;
    const first = adapter.addDays(today, -offset);
    return [first, endOfDay(adapter, adapter.addDays(first, 6))];
  };
}

/** The month today is in, from its first day to its last. */
export function wrThisMonth(): WrDateRangePresetFn {
  return ({ adapter, today }) => wholeMonth(adapter, startOfMonth(adapter, today));
}

/** The month before the one today is in, from its first day to its last. */
export function wrLastMonth(): WrDateRangePresetFn {
  return ({ adapter, today }) => wholeMonth(adapter, adapter.addMonths(startOfMonth(adapter, today), -1));
}
