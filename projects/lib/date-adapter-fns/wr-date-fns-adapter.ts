/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Service, inject } from '@angular/core';

import {
  addDays as dfAddDays,
  addMonths as dfAddMonths,
  addYears as dfAddYears,
  compareAsc,
  format as dfFormat,
  getDate,
  getDay,
  getDaysInMonth,
  getHours,
  getMinutes,
  getMonth,
  getSeconds,
  getYear,
  isSameDay,
  isSameMonth,
  isValid,
  parse as dfParse,
  set as dfSet,
  startOfDay,
} from 'date-fns';
import { WrDateAdapter, WR_DATE_LOCALE, type WrDateFormat } from 'ngwr/date-adapter';

const NAMED_PATTERNS: Readonly<Record<WrDateFormat, string>> = {
  shortDate: 'P',
  mediumDate: 'PP',
  longDate: 'PPP',
  time: 'p',
  shortDateTime: 'P p',
  mediumDateTime: 'PP p',
};

function isNamedFormat(value: string): value is WrDateFormat {
  return value in NAMED_PATTERNS;
}

/**
 * {@link WrDateAdapter} backed by `date-fns`. Same `Date` value type as the
 * native adapter, but defers all math, formatting, and parsing to date-fns
 * — pick this when you want more robust locale-aware patterns (`P`, `PP`,
 * `PPP`, `p`) without writing them by hand.
 *
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [provideWrDateFnsAdapter()],
 * });
 * ```
 *
 * Peer dep: `date-fns@^3` (or `^4`).
 */
@Service()
export class WrDateFnsAdapter extends WrDateAdapter<Date> {
  private readonly locale = inject(WR_DATE_LOCALE);

  // Construction & identity

  today(): Date {
    return new Date();
  }

  clone(date: Date): Date {
    return new Date(date.getTime());
  }

  createDate(year: number, month: number, day: number): Date {
    const d = new Date(year, month, day);
    if (year >= 0 && year < 100) d.setFullYear(year);
    return d;
  }

  isValid(date: Date): boolean {
    return isValid(date);
  }

  // Accessors

  getYear(date: Date): number {
    return getYear(date);
  }
  getMonth(date: Date): number {
    return getMonth(date);
  }
  getDate(date: Date): number {
    return getDate(date);
  }
  getDayOfWeek(date: Date): number {
    return getDay(date);
  }
  getDaysInMonth(date: Date): number {
    return getDaysInMonth(date);
  }
  getHours(date: Date): number {
    return getHours(date);
  }
  getMinutes(date: Date): number {
    return getMinutes(date);
  }
  getSeconds(date: Date): number {
    return getSeconds(date);
  }

  // Immutable math

  addYears(date: Date, amount: number): Date {
    return dfAddYears(date, amount);
  }
  addMonths(date: Date, amount: number): Date {
    return dfAddMonths(date, amount);
  }
  addDays(date: Date, amount: number): Date {
    return dfAddDays(date, amount);
  }
  setTime(date: Date, hours: number, minutes: number, seconds: number): Date {
    return dfSet(date, { hours, minutes, seconds, milliseconds: 0 });
  }

  // Comparison

  isSameDay(a: Date, b: Date): boolean {
    return isSameDay(a, b);
  }
  isSameMonth(a: Date, b: Date): boolean {
    return isSameMonth(a, b);
  }
  compareDate(a: Date, b: Date): number {
    return compareAsc(startOfDay(a), startOfDay(b));
  }

  // Formatting / parsing

  format(date: Date, formatKeyOrString: WrDateFormat | (string & {})): string {
    const pattern = isNamedFormat(formatKeyOrString) ? NAMED_PATTERNS[formatKeyOrString] : formatKeyOrString;
    return dfFormat(date, pattern);
  }

  parse(value: string, formatKeyOrString: WrDateFormat | (string & {})): Date | null {
    const raw = value?.trim();
    if (!raw) return null;
    const pattern = isNamedFormat(formatKeyOrString) ? NAMED_PATTERNS[formatKeyOrString] : formatKeyOrString;
    const result = dfParse(raw, pattern, new Date());
    return isValid(result) ? result : null;
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
    const formatter = new Intl.DateTimeFormat(this.locale, { weekday: style });
    const first = this.getFirstDayOfWeek();
    const base = new Date(2024, 0, 7); // Sunday
    const out: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + ((first + i) % 7));
      out.push(formatter.format(d));
    }
    return out;
  }

  getMonthNames(style: 'narrow' | 'short' | 'long'): readonly string[] {
    const formatter = new Intl.DateTimeFormat(this.locale, { month: style });
    const out: string[] = [];
    for (let i = 0; i < 12; i++) out.push(formatter.format(new Date(2024, i, 15)));
    return out;
  }
}
