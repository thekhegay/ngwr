/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Pipe, inject } from '@angular/core';
import type { PipeTransform } from '@angular/core';

import { type WrDateFormat, WrDateAdapter, toLocalDate } from 'ngwr/date';

/**
 * Locale-aware date formatting. Delegates to `WrDateAdapter` — the native one
 * unless the app provides its own — so both the named format keys
 * (`'shortDate'`, `'longDate'`, …) and raw token strings work with nothing to
 * set up. A date-only string (`'2026-01-01'`) is that day in the local zone,
 * as `DatePipe` reads it, not UTC midnight.
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
    if (value === null || value === undefined || value === '') return '';
    const date = value instanceof Date ? value : toLocalDate(value);
    if (Number.isNaN(date.getTime())) return '';

    return this.adapter.format(date, format);
  }
}
