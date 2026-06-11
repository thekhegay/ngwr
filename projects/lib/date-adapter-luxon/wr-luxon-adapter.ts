/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Service, inject } from '@angular/core';

import { DateTime, Info } from 'luxon';
import { WrDateAdapter, WR_DATE_LOCALE, type WrDateFormat } from 'ngwr/date-adapter';

const NAMED_PATTERNS: Readonly<Record<WrDateFormat, string>> = {
  shortDate: 'D',
  mediumDate: 'DD',
  longDate: 'DDD',
  time: 't',
  shortDateTime: 'f',
  mediumDateTime: 'ff',
};

function isNamedFormat(value: string): value is WrDateFormat {
  return value in NAMED_PATTERNS;
}

/**
 * Token translation table — our token grammar (matches the native adapter)
 * mapped to luxon's. Notably `MMMM`/`MMM` (month names) become luxon's
 * standalone-month tokens `LLLL`/`LLL`.
 */
const TOKEN_MAP: Readonly<Record<string, string>> = {
  yyyy: 'yyyy',
  yy: 'yy',
  MMMM: 'LLLL',
  MMM: 'LLL',
  MM: 'MM',
  M: 'M',
  dd: 'dd',
  d: 'd',
  HH: 'HH',
  H: 'H',
  hh: 'hh',
  h: 'h',
  mm: 'mm',
  ss: 'ss',
  a: 'a',
};

const TOKEN_RE = /yyyy|yy|MMMM|MMM|MM|M|dd|d|HH|H|hh|h|mm|ss|a/g;

function translatePattern(pattern: string): string {
  return pattern.replace(TOKEN_RE, t => TOKEN_MAP[t] ?? t);
}

/**
 * {@link WrDateAdapter} backed by Luxon `DateTime`. Use this when you need
 * proper timezone-aware math or IANA zone handling (the native + date-fns
 * adapters both work on plain `Date` and inherit JS quirks).
 *
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [provideWrLuxonAdapter()],
 * });
 * ```
 *
 * Peer dep: `luxon@^3`.
 */
@Service()
export class WrLuxonAdapter extends WrDateAdapter<DateTime> {
  private readonly locale = inject(WR_DATE_LOCALE);

  // Construction & identity

  today(): DateTime {
    return DateTime.now().setLocale(this.locale);
  }

  clone(date: DateTime): DateTime {
    return DateTime.fromMillis(date.toMillis(), { zone: date.zone, locale: this.locale });
  }

  createDate(year: number, month: number, day: number): DateTime {
    // `month` is 0-based on our API; luxon's months are 1-based.
    return DateTime.fromObject({ year, month: month + 1, day }, { locale: this.locale });
  }

  isValid(date: DateTime): boolean {
    return date.isValid;
  }

  // Accessors

  getYear(date: DateTime): number {
    return date.year;
  }
  getMonth(date: DateTime): number {
    return date.month - 1;
  }
  getDate(date: DateTime): number {
    return date.day;
  }
  getDayOfWeek(date: DateTime): number {
    // Luxon weekday: 1 (Mon) – 7 (Sun). Our API: 0 (Sun) – 6 (Sat).
    return date.weekday % 7;
  }
  getDaysInMonth(date: DateTime): number {
    return date.daysInMonth ?? 30;
  }
  getHours(date: DateTime): number {
    return date.hour;
  }
  getMinutes(date: DateTime): number {
    return date.minute;
  }
  getSeconds(date: DateTime): number {
    return date.second;
  }

  // Immutable math

  addYears(date: DateTime, amount: number): DateTime {
    return date.plus({ years: amount });
  }
  addMonths(date: DateTime, amount: number): DateTime {
    return date.plus({ months: amount });
  }
  addDays(date: DateTime, amount: number): DateTime {
    return date.plus({ days: amount });
  }
  setTime(date: DateTime, hours: number, minutes: number, seconds: number): DateTime {
    return date.set({ hour: hours, minute: minutes, second: seconds, millisecond: 0 });
  }

  // Comparison

  isSameDay(a: DateTime, b: DateTime): boolean {
    return a.hasSame(b, 'day');
  }
  isSameMonth(a: DateTime, b: DateTime): boolean {
    return a.hasSame(b, 'month');
  }
  compareDate(a: DateTime, b: DateTime): number {
    return a.startOf('day').toMillis() - b.startOf('day').toMillis();
  }

  // Formatting / parsing

  format(date: DateTime, formatKeyOrString: WrDateFormat | (string & {})): string {
    if (isNamedFormat(formatKeyOrString)) {
      return date.setLocale(this.locale).toFormat(NAMED_PATTERNS[formatKeyOrString]);
    }
    return date.setLocale(this.locale).toFormat(translatePattern(formatKeyOrString));
  }

  parse(value: string, formatKeyOrString: WrDateFormat | (string & {})): DateTime | null {
    const raw = value?.trim();
    if (!raw) return null;
    const pattern = isNamedFormat(formatKeyOrString)
      ? NAMED_PATTERNS[formatKeyOrString]
      : translatePattern(formatKeyOrString);
    const parsed = DateTime.fromFormat(raw, pattern, { locale: this.locale });
    return parsed.isValid ? parsed : null;
  }

  // Locale info

  getFirstDayOfWeek(): number {
    try {
      const locale = new Intl.Locale(this.locale) as unknown as { getWeekInfo?: () => { firstDay: number } };
      const info = locale.getWeekInfo?.();
      if (info && typeof info.firstDay === 'number') return info.firstDay % 7;
    } catch {
      // Intl.Locale unsupported — fall through.
    }
    return this.locale.toLowerCase().startsWith('en-us') ? 0 : 1;
  }

  getDayOfWeekNames(style: 'narrow' | 'short' | 'long'): readonly string[] {
    // Luxon returns Mon-first; reorder according to our locale's first day.
    const names = Info.weekdays(style, { locale: this.locale });
    const first = this.getFirstDayOfWeek();
    // Convert Mon-first (index 0 = Mon) to our Sun-first then rotate.
    // Easier: pad to Sun-first using known offset (luxon Mon=0, Sun=6).
    const sunFirst = [names[6], ...names.slice(0, 6)];
    return [...sunFirst.slice(first), ...sunFirst.slice(0, first)];
  }

  getMonthNames(style: 'narrow' | 'short' | 'long'): readonly string[] {
    return Info.months(style, { locale: this.locale });
  }
}
