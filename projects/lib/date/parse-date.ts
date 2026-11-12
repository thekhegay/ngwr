/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrToLocalDate } from './local-date';
import type { WrEpochUnit, WrParseDateOptions } from './types';

// 1e10 s and 1e13 ms are both 20 November 2286; 1e10 ms and 1e13 us are both 26 April 1970.
const SECONDS_BELOW = 1e10;
const MILLISECONDS_BELOW = 1e13;

function fromNumber(value: number, unit: WrEpochUnit): Date {
  const size = Math.abs(value);
  const resolved = unit !== 'auto' ? unit : size < SECONDS_BELOW ? 's' : size < MILLISECONDS_BELOW ? 'ms' : 'us';
  return new Date(resolved === 's' ? value * 1000 : resolved === 'us' ? value / 1000 : value);
}

/**
 * `2026-03-01 14:30`, with optional seconds, a fraction and a zone (`Z`, `+05`,
 * `+0500`, `+05:00`): the SQL form of a date-time, a space where ISO 8601 has a `T`.
 */
const SPACE_SEPARATED =
  /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})(?::(\d{2})(?:\.(\d+))?)?(?:(Z)|([+-]\d{2})(?::?(\d{2}))?)?$/i;

function fromString(value: string): Date | null {
  const text = String(value).trim();
  if (text === '') return null;
  const match = SPACE_SEPARATED.exec(text);
  if (match === null) return wrToLocalDate(text);
  const [, day, time, seconds = '00', fraction, utc, hours, minutes = '00'] = match;
  const millis = fraction === undefined ? '' : `.${fraction.slice(0, 3).padEnd(3, '0')}`;
  const zone = utc !== undefined ? 'Z' : hours === undefined ? '' : `${hours}:${minutes}`;
  return new Date(`${day}T${time}:${seconds}${millis}${zone}`);
}

/**
 * What a backend sends for a date, as a `Date`, or `null` when it holds none.
 * Never an Invalid Date, so the result needs one check rather than two.
 *
 * - A `Date` comes back as it is, the same object; an Invalid Date gives `null`.
 * - A number is epoch milliseconds, or what `epochUnit` says: `'s'`, `'us'`
 *   (microseconds), or `'auto'`, which reads a number under `1e10` as seconds,
 *   under `1e13` as milliseconds and anything larger as microseconds, right
 *   for a date from 26 April 1970 to 20 November 2286. `NaN`, an infinity and
 *   a number outside the range of `Date` give `null`.
 * - `2026-03-01 14:30:00`, a space where ISO 8601 has a `T`, is rewritten to the
 *   ISO form first. Chrome reads the space form and Safari gives an Invalid Date
 *   for it. Seconds, a fraction and a zone are optional; the fraction is cut to
 *   milliseconds and a zone of hours alone (`+05`, as PostgreSQL prints it) is
 *   completed. Without a zone it is local time, as the `T` form is.
 * - A date-only string (`2026-03-01`, `2026-03`, `2026`) is that day's LOCAL
 *   midnight, as `wrDate` and `WrValidators.minDate` read it. `new Date()` would
 *   make it UTC midnight, the evening before for a reader west of Greenwich.
 * - Any other string is left to `new Date()`, so an ISO string with `Z` or an
 *   offset is the instant it names.
 * - `null`, `undefined`, an empty or blank string and a string the engine
 *   refuses give `null`.
 *
 * Surrounding whitespace is ignored. A plain function: no adapter and no
 * injection context, so it runs in a mapper, a resolver or a store. For the
 * same reason it does not see `withDates()`: pass the options, or
 * `inject(WrDateAdapter).parseOptions()` for the app's.
 *
 * @example
 * ```ts
 * wrParseDate('2026-03-01 14:30:00');       // 1 March 2026, 14:30 local
 * wrParseDate('2026-03-01');                // 1 March 2026, 00:00 local
 * wrParseDate('2026-03-01T09:30:00+05:00'); // that instant
 * wrParseDate(1772343000000);               // epoch milliseconds
 * wrParseDate(1772343000000123, { epochUnit: 'auto' });  // microseconds, by magnitude
 * wrParseDate('n/a');                       // null
 * ```
 *
 * @see https://ngwr.dev/reference/pipes/wr-date
 */
export function wrParseDate(
  value: Date | string | number | null | undefined,
  options: WrParseDateOptions = {}
): Date | null {
  if (value === null || value === undefined) return null;
  const date =
    value instanceof Date
      ? value
      : typeof value === 'number'
        ? fromNumber(value, options.epochUnit ?? 'ms')
        : fromString(value);
  return date === null || Number.isNaN(date.getTime()) ? null : date;
}
