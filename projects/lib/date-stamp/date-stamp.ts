/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, inject, input } from '@angular/core';

import { type WrDateFormat, WrDateAdapter, wrIsDateOnly, wrParseDate } from 'ngwr/date';
import { useI18nText } from 'ngwr/i18n';
import { wrCheckStyles } from 'ngwr/utils';

interface Stamp {
  readonly iso: string;
  readonly date: string;
  readonly time: string | null;
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

/**
 * A moment in two lines, for a table cell: the date over the time.
 *
 * Both lines are written by the date adapter, so they are in the interface
 * language and, for an instant, on the wall clock of
 * `withDates({ timeZone })`, and they follow both at runtime. The value is read
 * as `wrDate` reads it: a `Date`, epoch milliseconds or a string. A date-only
 * string (`'2026-11-12'`) is a day, so it shows the date line alone and does
 * not shift with the zone.
 *
 * The lines sit in one `<time>` whose `datetime` is the instant in ISO 8601,
 * or the day for a date-only string. `null`, `undefined`, `''` and a value
 * that is not a date are empty: the component shows `emptyLabel`.
 *
 * @example
 * ```html
 * <wr-date-stamp [value]="row.createdAt" />
 * <wr-date-stamp [value]="row.createdAt" dateFormat="d MMM yyyy" timeFormat="time24hSeconds" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/date-stamp
 */
@Component({
  selector: 'wr-date-stamp',
  templateUrl: './date-stamp.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-date-stamp', '[class.wr-date-stamp--empty]': 'parts() === null' },
})
export class WrDateStamp {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('date-stamp');
  }

  /**
   * The moment shown: a `Date`, epoch milliseconds, or a string `wrParseDate`
   * reads. `null`, `undefined`, `''` and a value that is not a date are empty.
   *
   * @default null
   */
  readonly value = input<Date | string | number | null | undefined>(null);

  /**
   * Format of the first line: a named key or a token string (`'d MMM yyyy'`).
   *
   * @default 'mediumDate'
   */
  readonly dateFormat = input<WrDateFormat | (string & {})>('mediumDate');

  /**
   * Format of the second line: a named key (`'time24hSeconds'`) or a token
   * string (`'HH:mm'`).
   *
   * @default 'time'
   */
  readonly timeFormat = input<WrDateFormat | (string & {})>('time');

  /** What stands in for an empty value. Falls back to `copyValue.empty`, then `'-'`. */
  readonly emptyLabel = input<string | null>(null);

  // The key `wr-copy-value` reads: one placeholder for an empty cell, whatever fills the cell.
  protected readonly resolvedEmptyLabel = useI18nText(this.emptyLabel, 'copyValue.empty', '-');

  private readonly adapter = inject<WrDateAdapter<Date>>(WrDateAdapter);

  protected readonly parts = computed<Stamp | null>(() => {
    const value = this.value();
    const date = wrParseDate(value);
    if (date === null) return null;

    if (wrIsDateOnly(value)) {
      return {
        iso: `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
        date: this.adapter.format(date, this.dateFormat()),
        time: null,
      };
    }

    const zoned = this.adapter.zoned();
    return {
      iso: date.toISOString(),
      date: zoned.format(date, this.dateFormat()),
      time: zoned.format(date, this.timeFormat()),
    };
  });
}
