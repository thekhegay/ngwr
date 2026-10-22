/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Pipe, inject } from '@angular/core';
import type { PipeTransform } from '@angular/core';

import { type WrDateFormat, WrDateAdapter } from 'ngwr/date';

/** `2026`, `2026-01` and `2026-01-01`: the forms `new Date()` reads as UTC rather than local. */
const ISO_DATE_ONLY = /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/;

/**
 * A date-only string names a calendar day, so it is read as LOCAL midnight.
 * `new Date('2026-01-01')` is UTC midnight, which west of Greenwich is the
 * evening before — a due date from an API printed a day early for every
 * American reader. Angular's `DatePipe` makes the same exception. The engine
 * still decides what is a valid date; only the zone moves.
 */
function toDate(value: string | number): Date {
  const parsed = new Date(value);
  if (typeof value !== 'string' || !ISO_DATE_ONLY.test(value) || Number.isNaN(parsed.getTime())) return parsed;
  const local = new Date(0);
  local.setFullYear(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
  local.setHours(0, 0, 0, 0);
  return local;
}

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
    const date = value instanceof Date ? value : toDate(value);
    if (Number.isNaN(date.getTime())) return '';

    return this.adapter.format(date, format);
  }
}
