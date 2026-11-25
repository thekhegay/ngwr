/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrToLocalDate } from './local-date';
import { wrResolveZone, wrUtcTime, wrZoneInstant, wrZoneWallTime } from './time-zone';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

/** The epoch time of a `YYYY-MM-DD` day read as UTC midnight, or `null` for a string that is not a calendar day. */
function dayTime(day: unknown): number | null {
  if (typeof day !== 'string' || !DAY.test(day)) return null;
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  const date = Number(day.slice(8, 10));
  const time = wrUtcTime(year, month - 1, date);
  const check = new Date(time);
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === date
    ? time
    : null;
}

function utcDay(time: number): string {
  const date = new Date(time);
  const year = date.getUTCFullYear();
  if (Number.isNaN(year) || year < 0 || year > 9999) return '';
  return `${pad(year, 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}`;
}

/**
 * The calendar day of a `Date` as `YYYY-MM-DD`, read in the browser's zone, or
 * in `timeZone` when one is given.
 *
 * `date.toISOString().slice(0, 10)` reads the day in UTC: just after midnight in
 * Almaty it is still yesterday there, and in the evening in New York it is
 * already tomorrow. This reads the local year, month and day, so the string is
 * the day the user sees on the calendar.
 *
 * `timeZone` is what `withDates({ timeZone })` takes, an IANA name or an offset
 * such as `'+05:00'`: the day is then the one on that zone's wall clock. An
 * unknown zone reads in the browser's, as `withDates` does.
 *
 * An Invalid Date, and a year outside 0 to 9999, give `''`: neither has a
 * `YYYY-MM-DD` form.
 *
 * @example
 * ```ts
 * wrToDay(new Date(2026, 2, 1, 0, 30)); // '2026-03-01', in every zone
 * wrToDay(new Date('2026-03-01T22:00:00Z'), 'Asia/Almaty'); // '2026-03-02'
 * wrToDay(new Date(NaN));               // ''
 * ```
 *
 * @see https://ngwr.dev/reference/pipes/wr-date
 */
export function wrToDay(date: Date, timeZone?: string): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const zone = wrResolveZone(timeZone);
  if (zone) return utcDay(wrZoneWallTime(date.getTime(), zone));
  const year = date.getFullYear();
  if (year < 0 || year > 9999) return '';
  return `${pad(year, 4)}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`;
}

/**
 * Today as `YYYY-MM-DD`, in the browser's zone or in `timeZone`:
 * `wrToDay(new Date(), timeZone)`.
 *
 * @example
 * ```ts
 * wrToday('Asia/Almaty'); // the day it is in Almaty now
 * ```
 *
 * @see https://ngwr.dev/reference/pipes/wr-date
 */
export function wrToday(timeZone?: string): string {
  return wrToDay(new Date(), timeZone);
}

/**
 * A `YYYY-MM-DD` string as a `Date` at that day's LOCAL midnight, the instant a
 * date picker emits for it, or at its midnight in `timeZone` when one is given.
 * The reverse of {@link wrToDay}.
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
 *
 * // The end-exclusive range of a month, in Almaty: from its first midnight to
 * // the midnight after its last day.
 * const from = wrFromDay('2026-03-01', 'Asia/Almaty');
 * const to = wrFromDay(wrAddDays('2026-03-31', 1), 'Asia/Almaty');
 * ```
 *
 * @see https://ngwr.dev/reference/pipes/wr-date
 */
export function wrFromDay(day: string | null | undefined, timeZone?: string): Date | null {
  if (typeof day !== 'string' || !DAY.test(day)) return null;
  const zone = wrResolveZone(timeZone);
  if (zone) {
    const wall = dayTime(day);
    if (wall === null) return null;
    const instant = wrZoneInstant(wall, zone);
    return Number.isNaN(new Date(instant).getTime()) ? null : new Date(instant);
  }
  const date = wrToLocalDate(day);
  // An engine may refuse 30 February or carry it over into March; neither is that day.
  return wrToDay(date) === day ? date : null;
}

/**
 * A `YYYY-MM-DD` day moved by whole days on the calendar. The arithmetic runs on
 * UTC fields, so a daylight-saving change in any zone cannot repeat or skip a day.
 * `''` for a string that is not a day, a `days` that is not a finite number, and
 * a result outside the years 0 to 9999. A fraction of a day is dropped.
 *
 * @example
 * ```ts
 * wrAddDays('2026-02-28', 1);  // '2026-03-01'
 * wrAddDays('2026-01-01', -1); // '2025-12-31'
 *
 * // End-exclusive range over the last day of a report, in a zone:
 * wrFromDay(wrAddDays('2026-03-31', 1), 'America/New_York');
 * ```
 *
 * @see https://ngwr.dev/reference/pipes/wr-date
 */
export function wrAddDays(day: string, days: number): string {
  const time = dayTime(day);
  if (time === null || !Number.isFinite(days)) return '';
  return utcDay(time + Math.trunc(days) * 86_400_000);
}

/**
 * A `YYYY-MM-DD` day moved by whole months. When the target month is shorter the
 * day clamps to its last one: 31 January plus one month is 28 or 29 February.
 * `''` for a string that is not a day, a `months` that is not a finite number, and
 * a result outside the years 0 to 9999. A fraction of a month is dropped.
 *
 * @example
 * ```ts
 * wrAddMonths('2026-01-31', 1);  // '2026-02-28'
 * wrAddMonths('2028-01-31', 1);  // '2028-02-29'
 * wrAddMonths('2026-03-15', -3); // '2025-12-15'
 * ```
 *
 * @see https://ngwr.dev/reference/pipes/wr-date
 */
export function wrAddMonths(day: string, months: number): string {
  const time = dayTime(day);
  if (time === null || !Number.isFinite(months)) return '';
  const from = new Date(time);
  const index = from.getUTCFullYear() * 12 + from.getUTCMonth() + Math.trunc(months);
  const year = Math.floor(index / 12);
  const month = index - year * 12;
  if (year < 0 || year > 9999) return '';
  const last = new Date(wrUtcTime(year, month + 1, 0)).getUTCDate();
  return utcDay(wrUtcTime(year, month, Math.min(from.getUTCDate(), last)));
}
