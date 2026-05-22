/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { LOCALE_ID, Pipe, inject } from '@angular/core';
import type { PipeTransform } from '@angular/core';

import { type WrDateFormat, WrDateAdapter } from 'ngwr/date-adapter';

/**
 * Locale-aware date formatting. Delegates to `WrDateAdapter` when
 * `provideWrDateAdapter()` is in the provider tree (giving access to named
 * format keys like `'shortDate'` and `'longDate'`), otherwise falls back to
 * a minimal `Intl.DateTimeFormat`-based formatter so the pipe still works
 * without the date-adapter package wired up.
 *
 * @example
 * ```html
 * {{ now | wrDate }}                          <!-- shortDate            -->
 * {{ now | wrDate: 'mediumDateTime' }}        <!-- named key            -->
 * {{ now | wrDate: 'dd.MM.yyyy' }}            <!-- raw token string     -->
 * ```
 */
@Pipe({ name: 'wrDate' })
export class WrDatePipe implements PipeTransform {
  private readonly adapter = inject<WrDateAdapter<Date> | null>(WrDateAdapter, { optional: true });
  private readonly locale = inject(LOCALE_ID);

  transform(
    value: Date | string | number | null | undefined,
    format: WrDateFormat | (string & {}) = 'shortDate'
  ): string {
    if (value === null || value === undefined || value === '') return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    if (this.adapter) return this.adapter.format(date, format);
    return this.fallback(date, format);
  }

  /** Tiny fallback for the named keys when no adapter is provided. */
  private fallback(date: Date, format: WrDateFormat | (string & {})): string {
    const named: Record<string, Intl.DateTimeFormatOptions> = {
      shortDate: { dateStyle: 'short' },
      mediumDate: { dateStyle: 'medium' },
      longDate: { dateStyle: 'long' },
      time: { timeStyle: 'short' },
      shortDateTime: { dateStyle: 'short', timeStyle: 'short' },
      mediumDateTime: { dateStyle: 'medium', timeStyle: 'short' },
    };
    const opts = named[format] ?? { dateStyle: 'short' };
    return new Intl.DateTimeFormat(this.locale, opts).format(date);
  }
}
