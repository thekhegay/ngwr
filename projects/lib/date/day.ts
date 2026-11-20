/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrToLocalDate } from './local-date';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

/**
 * The calendar day of a `Date` as `YYYY-MM-DD`, read in the browser's zone.
 *
 * `date.toISOString().slice(0, 10)` reads the day in UTC: just after midnight in
 * Almaty it is still yesterday there, and in the evening in New York it is
 * already tomorrow. This reads the local year, month and day, so the string is
 * the day the user sees on the calendar.
 *
 * An Invalid Date, and a year outside 0 to 9999, give `''`: neither has a
 * `YYYY-MM-DD` form.
 *
 * @example
 * ```ts
 * wrToDay(new Date(2026, 2, 1, 0, 30)); // '2026-03-01', in every zone
 * wrToDay(new Date(NaN));               // ''
 * ```
 *
 * @see https://ngwr.dev/reference/pipes/wr-date
 */
export function wrToDay(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  if (year < 0 || year > 9999) return '';
  return `${pad(year, 4)}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`;
}

/**
 * Today as `YYYY-MM-DD`, in the browser's zone: `wrToDay(new Date())`.
 *
 * @see https://ngwr.dev/reference/pipes/wr-date
 */
export function wrToday(): string {
  return wrToDay(new Date());
}

/**
 * A `YYYY-MM-DD` string as a `Date` at that day's LOCAL midnight, the instant a
 * date picker emits for it. The reverse of {@link wrToDay}.
 *
 * `null` for anything that is not a day on the calendar in exactly that form:
 * `2026-02-30`, `2026-3-1`, `2026-03`, a string with a time, an empty string,
 * `null` and `undefined`. Use `wrParseDate` for a value that may be any of the
 * forms a backend sends.
 *
 * @example
 * ```ts
 * wrFromDay('2026-03-01');           // 1 March 2026, 00:00 local
 * wrFromDay('2026-02-30');           // null
 * wrFromDay('2026-03-01T09:30:00Z'); // null
 * ```
 *
 * @see https://ngwr.dev/reference/pipes/wr-date
 */
export function wrFromDay(day: string | null | undefined): Date | null {
  if (typeof day !== 'string' || !DAY.test(day)) return null;
  const date = wrToLocalDate(day);
  // An engine may refuse 30 February or carry it over into March; neither is that day.
  return wrToDay(date) === day ? date : null;
}
