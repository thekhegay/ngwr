/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** `2026`, `2026-01` and `2026-01-01`: the forms `new Date()` reads as UTC rather than local. */
const ISO_DATE_ONLY = /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/;

/**
 * A string or a timestamp as a `Date`, with one exception to `new Date()`: a
 * date-only ISO string names a calendar day, so it is read as that day's LOCAL
 * midnight — the instant a date picker emits for it.
 *
 * `new Date('2026-01-01')` is UTC midnight, which west of Greenwich is the evening
 * before and east of it is later than the picked day's midnight. So a due date from
 * an API printed a day early for every American reader of `wrDate`, and
 * `WrValidators.minDate('2026-01-01')` refused 1 January in Almaty while
 * `maxDate('2026-12-31')` refused 31 December in New York. Angular's `DatePipe`
 * makes the same exception. The engine still decides what is a valid date — an
 * invalid string comes back as an invalid `Date` — and only the zone moves.
 *
 * Shared by `ngwr/pipes` and `ngwr/validators` so the two read the same string as
 * the same day; not part of the public API.
 *
 * @internal
 */
export function toLocalDate(value: string | number): Date {
  const parsed = new Date(value);
  if (typeof value !== 'string' || !ISO_DATE_ONLY.test(value) || Number.isNaN(parsed.getTime())) return parsed;
  const local = new Date(0);
  local.setFullYear(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
  local.setHours(0, 0, 0, 0);
  return local;
}
