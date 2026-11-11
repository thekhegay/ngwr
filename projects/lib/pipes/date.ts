/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Pipe, inject } from '@angular/core';
import type { PipeTransform } from '@angular/core';

import { type WrDateFormat, WrDateAdapter, wrToLocalDate } from 'ngwr/date';

/**
 * A date through a `WrDateAdapter`: the same output as the `wrDate` pipe, for a
 * string built in TypeScript. A date-only string (`'2026-01-01'`) is that day in
 * the local zone, as `DatePipe` reads it. `null`, `undefined`, an empty string
 * and a date the engine refuses give an empty string.
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
 * ```
 */
export function wrFormatDate(
  value: Date | string | number | null | undefined,
  adapter: WrDateAdapter<Date>,
  format: WrDateFormat | (string & {}) = 'shortDate'
): string {
  if (value === null || value === undefined || value === '') return '';
  const date = value instanceof Date ? value : wrToLocalDate(value);
  if (Number.isNaN(date.getTime())) return '';

  return adapter.format(date, format);
}

/**
 * Locale-aware date formatting. Delegates to `WrDateAdapter` — the native one
 * unless the app provides its own — so both the named format keys
 * (`'shortDate'`, `'longDate'`, …) and raw token strings work with nothing to
 * set up. A date-only string (`'2026-01-01'`) is that day in the local zone,
 * as `DatePipe` reads it, not UTC midnight. {@link wrFormatDate} is the same
 * output as a function.
 *
 * @example
 * ```html
 * {{ now | wrDate }}                          <!-- shortDate            -->
 * {{ now | wrDate: 'mediumDateTime' }}        <!-- named key            -->
 * {{ now | wrDate: 'dd.MM.yyyy' }}            <!-- raw token string     -->
 * ```
 */
@Pipe({ name: 'wrDate' })
export class WrDate implements PipeTransform {
  private readonly adapter = inject<WrDateAdapter<Date>>(WrDateAdapter);

  transform(
    value: Date | string | number | null | undefined,
    format: WrDateFormat | (string & {}) = 'shortDate'
  ): string {
    return wrFormatDate(value, this.adapter, format);
  }
}
