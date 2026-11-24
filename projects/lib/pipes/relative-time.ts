/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { LOCALE_ID, Pipe, inject } from '@angular/core';
import type { PipeTransform } from '@angular/core';

import { WrDateAdapter, wrIsDateOnly, wrParseDate } from 'ngwr/date';

import type { WrRelativeTimeOptions } from './types';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const YEAR = 365 * DAY;
const MONTH = YEAR / 12;

/** Each unit, its length, and the distance it stops at. Smallest first. */
const UNITS: readonly (readonly [unit: Intl.RelativeTimeFormatUnit, length: number, below: number])[] = [
  ['second', SECOND, MINUTE],
  ['minute', MINUTE, HOUR],
  ['hour', HOUR, DAY],
  ['day', DAY, 7 * DAY],
  ['week', 7 * DAY, MONTH],
  ['month', MONTH, YEAR],
  ['year', YEAR, Infinity],
];
const FIRST_DAY_UNIT = 3;

/**
 * How far a date is from now, in words, through `Intl.RelativeTimeFormat` in
 * the given locale: the same output as the `wrRelativeTime` pipe, for a string
 * built in TypeScript. The value is read by `wrParseDate`, as `wrDate` reads
 * it: a number is epoch milliseconds unless `epochUnit` says otherwise, and
 * `zonelessIn` reads a date-time string with no offset. `null`, `undefined`, a
 * blank string and a value that is not a date give an empty string.
 *
 * The unit follows the distance: seconds under a minute, minutes under an
 * hour, hours under a day, days under a week, weeks under a month, months
 * under a year, then years. A year is 365 days and a month a twelfth of it.
 * The count is cut, never rounded: 119 seconds is "1 minute ago", and it turns
 * to "2 minutes ago" at the 120th. So a unit never shows its own limit
 * ("60 minutes ago"), and what is not over yet is not announced.
 *
 * The distance is elapsed time, not a calendar: "yesterday" is 24 to 48 hours
 * ago. A date-only string (`'2026-11-12'`) is a day and has no hour to count
 * from, so it is compared with today as a day and reads "today", "yesterday"
 * or "in 3 days". Today is the day of `now` in the browser's zone.
 *
 * `numeric: 'auto'`, the default, lets the language say "now", "yesterday" and
 * "tomorrow"; `'always'` keeps the number ("1 day ago"). Under a second it
 * reads "now", or "in 0 seconds" and "0 seconds ago" by the side it is on.
 *
 * @example
 * ```ts
 * const now = new Date('2026-11-12T12:00:00Z');
 *
 * wrFormatRelativeTime('2026-11-12T11:55:00Z', 'en-US', { now });   // "5 minutes ago"
 * wrFormatRelativeTime('2026-11-13T12:00:00Z', 'en-US', { now });   // "tomorrow"
 * wrFormatRelativeTime('2026-11-13T12:00:00Z', 'en-US', { now, numeric: 'always' }); // "in 1 day"
 * wrFormatRelativeTime('2026-11-12T09:00:00Z', 'ru', { now });      // "3 часа назад"
 * wrFormatRelativeTime('2026-11-12T09:00:00Z', 'en-US', { now, style: 'narrow' });   // "3h ago"
 * wrFormatRelativeTime(row.createdAt, 'en-US');                     // from the current time
 * ```
 */
export function wrFormatRelativeTime(
  value: Date | string | number | null | undefined,
  locale: string,
  options: WrRelativeTimeOptions = {}
): string {
  const date = wrParseDate(value, options);
  if (date === null) return '';
  const now = wrParseDate(options.now)?.getTime() ?? Date.now();

  let distance = date.getTime() - now;
  let first = 0;
  if (wrIsDateOnly(value)) {
    const today = new Date(now).setHours(0, 0, 0, 0);
    // Rounded: two midnights across a clock change are 23 or 25 hours apart.
    distance = Math.round((date.getTime() - today) / DAY) * DAY;
    first = FIRST_DAY_UNIT;
  }

  const size = Math.abs(distance);
  const [unit, length] = UNITS.find(([, , below], index) => index >= first && size < below)!;
  // `Math.trunc` keeps the sign of a zero, which is what tells "in 0 seconds" from "0 seconds ago".
  return new Intl.RelativeTimeFormat(locale, {
    numeric: options.numeric ?? 'auto',
    style: options.style ?? 'long',
  }).format(Math.trunc(distance / length), unit);
}

/**
 * How far a date is from now, in words ("5 minutes ago", "tomorrow"), via
 * `Intl.RelativeTimeFormat`. Uses Angular's `LOCALE_ID` as the default locale,
 * and reads the value as `wrDate` does, under the `epochUnit` and `zonelessIn`
 * of `withDates()`. {@link wrFormatRelativeTime} is the same output as a
 * function, and says how the unit is chosen.
 *
 * The pipe does not update by itself. It is pure: Angular runs it again only
 * when the value or the options change, so "5 minutes ago" still reads so an
 * hour later. For text that stays current use `<wr-date-stamp relative>`,
 * which re-renders on a timer, or pass a `now` that the app moves.
 *
 * @example
 * ```html
 * {{ comment.createdAt | wrRelativeTime }}                          <!-- "5 minutes ago" -->
 * {{ task.dueAt | wrRelativeTime: { numeric: 'always' } }}          <!-- "in 1 day"      -->
 * {{ comment.createdAt | wrRelativeTime: { style: 'narrow' } }}     <!-- "5m ago"        -->
 * {{ comment.createdAt | wrRelativeTime: { now: clock() } }}        <!-- follows a signal -->
 * ```
 */
@Pipe({ name: 'wrRelativeTime' })
export class WrRelativeTime implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);
  private readonly adapter = inject<WrDateAdapter<Date>>(WrDateAdapter);

  transform(value: Date | string | number | null | undefined, options?: WrRelativeTimeOptions): string {
    const app = this.adapter.parseOptions();
    // Not a spread: a key set to `undefined` would erase the app's value.
    return wrFormatRelativeTime(value, this.locale, {
      ...options,
      epochUnit: options?.epochUnit ?? app.epochUnit,
      zonelessIn: options?.zonelessIn ?? app.zonelessIn,
      timeZone: options?.timeZone === undefined ? app.timeZone : options.timeZone,
    });
  }
}

export type { WrRelativeTimeOptions } from './types';
