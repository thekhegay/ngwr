/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, booleanAttribute, computed, inject, input } from '@angular/core';

import {
  type WrDateFormat,
  type WrEpochUnit,
  WR_DATE_STAMP_DEFAULTS,
  WrDateAdapter,
  wrIsDateOnly,
  wrIsNamedFormat,
  wrParseDate,
} from 'ngwr/date';
import { useI18nText } from 'ngwr/i18n';
import { wrCheckStyles } from 'ngwr/utils';

interface Stamp {
  readonly iso: string;
  readonly date: string | null;
  readonly time: string | null;
}

/** The format with seconds: the `Seconds` twin of a named key, `ss` after the minutes of a token string. */
function withSeconds(format: string): string {
  if (wrIsNamedFormat(format)) return /^(?:time|shortDateTime)(?:12h|24h)?$/.test(format) ? `${format}Seconds` : format;
  return format.includes('ss') ? format : format.replace('mm', 'mm:ss');
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
 * as `wrDate` reads it: a `Date`, an epoch number or a string, under the
 * `epochUnit` and `zonelessIn` of `withDates()`. A date-only string
 * (`'2026-11-12'`) is a day, so it shows the date line alone and does not
 * shift with the zone.
 *
 * `withDates({ stamp })` sets the formats, `todayTimeOnly` and `seconds` for
 * every stamp of the app; an input set here wins.
 *
 * The lines sit in one `<time>` whose `datetime` is the instant in ISO 8601,
 * or the day for a date-only string. `null`, `undefined`, `''` and a value
 * that is not a date are empty: the component shows `emptyLabel`.
 *
 * @example
 * ```html
 * <wr-date-stamp [value]="row.createdAt" />
 * <wr-date-stamp [value]="row.createdAt" dateFormat="d MMM yyyy" timeFormat="time24hSeconds" />
 * <wr-date-stamp [value]="message.sentAt" todayTimeOnly seconds />
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

  private readonly defaults = inject(WR_DATE_STAMP_DEFAULTS);

  /**
   * The moment shown: a `Date`, an epoch number, or a string `wrParseDate`
   * reads. `null`, `undefined`, `''` and a value that is not a date are empty.
   *
   * @default null
   */
  readonly value = input<Date | string | number | null | undefined>(null);

  /**
   * Format of the first line: a named key or a token string (`'d MMM yyyy'`).
   * The default is `withDates({ stamp: { dateFormat } })` when the app sets it.
   *
   * @default 'mediumDate'
   */
  readonly dateFormat = input<WrDateFormat | (string & {})>(this.defaults.dateFormat ?? 'mediumDate');

  /**
   * Format of the second line: a named key (`'time24hSeconds'`) or a token
   * string (`'HH:mm'`). The default is `withDates({ stamp: { timeFormat } })`
   * when the app sets it.
   *
   * @default 'time'
   */
  readonly timeFormat = input<WrDateFormat | (string & {})>(this.defaults.timeFormat ?? 'time');

  /**
   * Write the seconds in the time line: a named `timeFormat` becomes its
   * `Seconds` twin (`'time'` is read as `'timeSeconds'`) and a token string
   * gets `:ss` after its minutes (`'HH:mm'` is read as `'HH:mm:ss'`). A format
   * that already has them is left alone. The default is
   * `withDates({ stamp: { seconds } })` when the app sets it.
   *
   * @default false
   */
  readonly seconds = input(this.defaults.seconds ?? false, { transform: booleanAttribute });

  /**
   * Show the time alone when the value is from today, as a message list does.
   * Today is the day of the display zone (`withDates({ timeZone })`), read when
   * the stamp renders: one left on screen past midnight keeps its single line
   * until its value or the zone changes. A date-only value keeps its date. The
   * default is `withDates({ stamp: { todayTimeOnly } })` when the app sets it.
   *
   * @default false
   */
  readonly todayTimeOnly = input(this.defaults.todayTimeOnly ?? false, { transform: booleanAttribute });

  /**
   * What a number in `value` counts since the epoch: `'ms'`, `'us'`, `'s'` or
   * `'auto'`, by magnitude. `null` follows `withDates({ epochUnit })`, which
   * is milliseconds unless the app says otherwise.
   *
   * @default null
   */
  readonly epochUnit = input<WrEpochUnit | null>(null);

  /** What stands in for an empty value. Falls back to `copyValue.empty`, then `'-'`. */
  readonly emptyLabel = input<string | null>(null);

  // The key `wr-copy-value` reads: one placeholder for an empty cell, whatever fills the cell.
  protected readonly resolvedEmptyLabel = useI18nText(this.emptyLabel, 'copyValue.empty', '-');

  private readonly adapter = inject<WrDateAdapter<Date>>(WrDateAdapter);

  protected readonly parts = computed<Stamp | null>(() => {
    const value = this.value();
    const epochUnit = this.epochUnit();
    const date = wrParseDate(value, { ...this.adapter.parseOptions(), ...(epochUnit ? { epochUnit } : {}) });
    if (date === null) return null;

    if (wrIsDateOnly(value)) {
      return {
        iso: `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
        date: this.adapter.format(date, this.dateFormat()),
        time: null,
      };
    }

    const zoned = this.adapter.zoned();
    const timeFormat = this.timeFormat();
    return {
      iso: date.toISOString(),
      date: this.todayTimeOnly() && zoned.isSameDay(date, zoned.today()) ? null : zoned.format(date, this.dateFormat()),
      time: zoned.format(date, this.seconds() ? withSeconds(timeFormat) : timeFormat),
    };
  });
}
