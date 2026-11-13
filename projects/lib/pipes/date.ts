/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Pipe, inject } from '@angular/core';
import type { PipeTransform } from '@angular/core';

import { type WrDateFormat, type WrParseDateOptions, WrDateAdapter, wrIsDateOnly, wrParseDate } from 'ngwr/date';

/**
 * A date through a `WrDateAdapter`: the same output as the `wrDate` pipe, for a
 * string built in TypeScript. A date-only string (`'2026-01-01'`) is that day in
 * the local zone, as `DatePipe` reads it, and `'2026-01-01 14:30:00'` is read
 * as its `T` form: the value goes through `wrParseDate`. `null`, `undefined`,
 * an empty string and a date the engine refuses give an empty string.
 *
 * An instant is printed on the wall clock of `withDates({ timeZone })`, through
 * the adapter's `zoned()`. A date-only string is a calendar day and is not
 * moved: `'2026-01-01'` prints as 1 January in every zone.
 *
 * The value is read as `withDates()` says: `epochUnit` for a number and
 * `zonelessIn` for a date-time string with no offset. The last argument
 * overrides either for one call, for a field whose unit differs from the app's;
 * a key left `undefined` keeps the app's value.
 *
 * The adapter stands where `wrFormatNumber` takes a locale, because the output
 * is the adapter's: the native one formats in `WR_DATE_LOCALE`, and an app's own
 * adapter formats however it formats. Neither can be rebuilt from a locale
 * string, so the caller passes `inject(WrDateAdapter)` once.
 *
 * @example
 * ```ts
 * private readonly dates = inject(WrDateAdapter);
 *
 * wrFormatDate(row.createdAt, this.dates);                   // shortDate
 * wrFormatDate(row.createdAt, this.dates, 'mediumDateTime'); // named key
 * wrFormatDate(row.createdAt, this.dates, 'dd.MM.yyyy');     // raw token string
 * wrFormatDate(row.sentAt, this.dates, 'time', { epochUnit: 'us' }); // microseconds
 * ```
 */
export function wrFormatDate(
  value: Date | string | number | null | undefined,
  adapter: WrDateAdapter<Date>,
  format: WrDateFormat | (string & {}) = 'shortDate',
  options?: WrParseDateOptions
): string {
  const app = adapter.parseOptions();
  // Not a spread: a key set to `undefined` would erase the app's value.
  const date = wrParseDate(value, {
    epochUnit: options?.epochUnit ?? app.epochUnit,
    zonelessIn: options?.zonelessIn ?? app.zonelessIn,
    timeZone: options?.timeZone === undefined ? app.timeZone : options.timeZone,
  });
  if (date === null) return '';
  return (wrIsDateOnly(value) ? adapter : adapter.zoned()).format(date, format);
}

/**
 * Locale-aware date formatting. Delegates to `WrDateAdapter` — the native one
 * unless the app provides its own — so both the named format keys
 * (`'shortDate'`, `'longDate'`, …) and raw token strings work with nothing to
 * set up. A date-only string (`'2026-01-01'`) is that day in the local zone,
 * as `DatePipe` reads it, not UTC midnight, and a backend's
 * `'2026-01-01 14:30:00'` is read as its `T` form. {@link wrFormatDate} is the
 * same output as a function.
 *
 * An instant is printed in the time zone of `withDates({ timeZone })`, and the
 * output follows that zone and the adapter's locale when they change at
 * runtime. A pure pipe cannot: Angular calls it again only when an argument
 * changes. So the pipe is impure and keeps its last result, and a
 * change-detection pass with nothing new costs three comparisons, not a
 * format.
 *
 * @example
 * ```html
 * {{ now | wrDate }}                          <!-- shortDate            -->
 * {{ now | wrDate: 'mediumDateTime' }}        <!-- named key            -->
 * {{ now | wrDate: 'dd.MM.yyyy' }}            <!-- raw token string     -->
 * {{ sentAt | wrDate: 'time' : { epochUnit: 'us' } }}  <!-- microseconds -->
 * ```
 */
// eslint-disable-next-line @angular-eslint/no-pipe-impure -- a pure pipe cannot follow the zone or the locale; see above
@Pipe({ name: 'wrDate', pure: false })
export class WrDate implements PipeTransform {
  private readonly adapter = inject<WrDateAdapter<Date>>(WrDateAdapter);

  private value: unknown;
  private format = '';
  private key: string | null = null;
  private text = '';

  transform(
    value: Date | string | number | null | undefined,
    format: WrDateFormat | (string & {}) = 'shortDate',
    options?: WrParseDateOptions
  ): string {
    // A signal read on the native adapter, which is what makes the template run
    // again when the zone or the locale moves.
    const display = this.adapter.zoned().displayKey();
    const key = options ? `${display}|${options.epochUnit}|${options.zonelessIn}|${options.timeZone}` : display;
    if (key !== this.key || format !== this.format || !Object.is(value, this.value)) {
      this.text = wrFormatDate(value, this.adapter, format, options);
      this.value = value;
      this.format = format;
      this.key = key;
    }
    return this.text;
  }
}
