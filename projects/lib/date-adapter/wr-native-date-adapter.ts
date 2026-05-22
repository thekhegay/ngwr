/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Injectable, inject } from '@angular/core';

import { WR_DATE_LOCALE } from './tokens';
import type { WrDateFormat } from './types';
import { WrDateAdapter } from './wr-date-adapter';

const NAMED_KEYS = new Set<WrDateFormat>([
  'shortDate',
  'mediumDate',
  'longDate',
  'time',
  'shortDateTime',
  'mediumDateTime',
]);

const INTL_OPTIONS: Readonly<Record<WrDateFormat, Intl.DateTimeFormatOptions>> = {
  shortDate: { year: 'numeric', month: 'numeric', day: 'numeric' },
  mediumDate: { year: 'numeric', month: 'short', day: 'numeric' },
  longDate: { year: 'numeric', month: 'long', day: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit' },
  shortDateTime: { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  mediumDateTime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
};

/** Recognised tokens, longest first so `MMMM` matches before `MMM`. */
const TOKEN_RE = /yyyy|yy|MMMM|MMM|MM|M|dd|d|HH|H|hh|h|mm|ss|a/g;

const MS_PER_DAY = 86_400_000;

function pad(n: number, width = 2): string {
  return String(Math.abs(n)).padStart(width, '0');
}

function isNamedFormat(value: string): value is WrDateFormat {
  return NAMED_KEYS.has(value as WrDateFormat);
}

function tokenToRegex(token: string): string {
  switch (token) {
    case 'yyyy':
      return '(\\d{4})';
    case 'yy':
      return '(\\d{2})';
    case 'MM':
    case 'dd':
    case 'HH':
    case 'hh':
    case 'mm':
    case 'ss':
      return '(\\d{2})';
    case 'M':
    case 'd':
    case 'H':
    case 'h':
      return '(\\d{1,2})';
    case 'a':
      return '(am|pm|AM|PM)';
    default:
      return '(.+)';
  }
}

/**
 * Reference {@link WrDateAdapter} implementation backed by the native `Date`
 * object and `Intl.DateTimeFormat`. Zero external dependencies. Suitable for
 * most apps — swap to a `date-fns` / `luxon` adapter only when you need
 * timezone-aware math or richer parsing.
 */
@Injectable({ providedIn: 'root' })
export class WrNativeDateAdapter extends WrDateAdapter<Date> {
  private readonly locale = inject(WR_DATE_LOCALE);

  // ──────── Construction & identity ────────

  today(): Date {
    return new Date();
  }

  clone(date: Date): Date {
    return new Date(date.getTime());
  }

  createDate(year: number, month: number, day: number): Date {
    // Native Date constructor with year < 100 maps to 1900 + year unless we explicitly setFullYear.
    const d = new Date(year, month, day);
    if (year >= 0 && year < 100) d.setFullYear(year);
    return d;
  }

  isValid(date: Date): boolean {
    return date instanceof Date && !Number.isNaN(date.getTime());
  }

  // ──────── Accessors ────────

  getYear(date: Date): number {
    return date.getFullYear();
  }

  getMonth(date: Date): number {
    return date.getMonth();
  }

  getDate(date: Date): number {
    return date.getDate();
  }

  getDayOfWeek(date: Date): number {
    return date.getDay();
  }

  getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  getHours(date: Date): number {
    return date.getHours();
  }

  getMinutes(date: Date): number {
    return date.getMinutes();
  }

  getSeconds(date: Date): number {
    return date.getSeconds();
  }

  // ──────── Immutable math ────────

  addYears(date: Date, amount: number): Date {
    const d = this.clone(date);
    d.setFullYear(d.getFullYear() + amount);
    return d;
  }

  addMonths(date: Date, amount: number): Date {
    const d = this.clone(date);
    const desiredDay = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + amount);
    // Clamp day to the new month's length (Jan 31 + 1 month → Feb 28/29).
    d.setDate(Math.min(desiredDay, this.getDaysInMonth(d)));
    return d;
  }

  addDays(date: Date, amount: number): Date {
    return new Date(date.getTime() + amount * MS_PER_DAY);
  }

  setTime(date: Date, hours: number, minutes: number, seconds: number): Date {
    const d = this.clone(date);
    d.setHours(hours, minutes, seconds, 0);
    return d;
  }

  // ──────── Comparison ────────

  isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  isSameMonth(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }

  compareDate(a: Date, b: Date): number {
    const ay = a.getFullYear();
    const by = b.getFullYear();
    if (ay !== by) return ay - by;
    const am = a.getMonth();
    const bm = b.getMonth();
    if (am !== bm) return am - bm;
    return a.getDate() - b.getDate();
  }

  // ──────── Formatting / parsing ────────

  // `(string & {})` keeps autocomplete for the WrDateFormat literals
  // while still accepting any other string as a raw token pattern.
  format(date: Date, formatKeyOrString: WrDateFormat | (string & {})): string {
    if (isNamedFormat(formatKeyOrString)) {
      return new Intl.DateTimeFormat(this.locale, INTL_OPTIONS[formatKeyOrString]).format(date);
    }
    return this.formatWithTokens(date, formatKeyOrString);
  }

  parse(value: string, formatKeyOrString: WrDateFormat | (string & {})): Date | null {
    const raw = value?.trim();
    if (!raw) return null;

    // Named formats fall back to `new Date()` parsing — best-effort, locale-fragile.
    if (isNamedFormat(formatKeyOrString)) {
      const d = new Date(raw);
      return this.isValid(d) ? d : null;
    }

    return this.parseWithTokens(raw, formatKeyOrString);
  }

  // ──────── Locale info ────────

  getFirstDayOfWeek(): number {
    // `Intl.Locale.prototype.getWeekInfo` is Stage 3 — not in TS lib types yet,
    // so we probe at runtime through an unknown cast.
    try {
      const locale = new Intl.Locale(this.locale) as unknown as { getWeekInfo?: () => { firstDay: number } };
      const info = locale.getWeekInfo?.();
      if (info && typeof info.firstDay === 'number') {
        // Intl uses 1 (Mon) – 7 (Sun); we use 0 (Sun) – 6 (Sat).
        return info.firstDay % 7;
      }
    } catch {
      // Browser doesn't support Intl.Locale or getWeekInfo — fall through.
    }
    return this.locale.toLowerCase().startsWith('en-us') ? 0 : 1;
  }

  getDayOfWeekNames(style: 'narrow' | 'short' | 'long'): readonly string[] {
    const formatter = new Intl.DateTimeFormat(this.locale, { weekday: style });
    const first = this.getFirstDayOfWeek();
    // Pick a reference Sunday and walk seven days.
    const base = new Date(2024, 0, 7); // Sunday 7 Jan 2024
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
    for (let i = 0; i < 12; i++) {
      out.push(formatter.format(new Date(2024, i, 15)));
    }
    return out;
  }

  // ──────── Internals: token-based format / parse ────────

  private formatWithTokens(date: Date, pattern: string): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const hours24 = date.getHours();
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const monthNames = this.getMonthNames('long');
    const monthShort = this.getMonthNames('short');

    return pattern.replace(TOKEN_RE, token => {
      switch (token) {
        case 'yyyy':
          return pad(year, 4);
        case 'yy':
          return pad(year % 100, 2);
        case 'MMMM':
          return monthNames[month] ?? '';
        case 'MMM':
          return monthShort[month] ?? '';
        case 'MM':
          return pad(month + 1);
        case 'M':
          return String(month + 1);
        case 'dd':
          return pad(day);
        case 'd':
          return String(day);
        case 'HH':
          return pad(hours24);
        case 'H':
          return String(hours24);
        case 'hh':
          return pad(hours12);
        case 'h':
          return String(hours12);
        case 'mm':
          return pad(minutes);
        case 'ss':
          return pad(seconds);
        case 'a':
          return hours24 < 12 ? 'am' : 'pm';
      }
      return token;
    });
  }

  private parseWithTokens(value: string, pattern: string): Date | null {
    const tokens: string[] = [];
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = escaped.replace(TOKEN_RE, token => {
      tokens.push(token);
      return tokenToRegex(token);
    });

    const match = new RegExp(`^${regex}$`).exec(value);
    if (!match) return null;

    let year = new Date().getFullYear();
    let month = 0;
    let day = 1;
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    let isPm = false;
    let hadHour12 = false;
    let hour12 = 0;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const raw = match[i + 1];
      const n = Number(raw);
      switch (token) {
        case 'yyyy':
          year = n;
          break;
        case 'yy':
          year = 2000 + n;
          break;
        case 'MM':
        case 'M':
          month = n - 1;
          break;
        case 'dd':
        case 'd':
          day = n;
          break;
        case 'HH':
        case 'H':
          hours = n;
          break;
        case 'hh':
        case 'h':
          hadHour12 = true;
          hour12 = n;
          break;
        case 'mm':
          minutes = n;
          break;
        case 'ss':
          seconds = n;
          break;
        case 'a':
          isPm = raw.toLowerCase() === 'pm';
          break;
      }
    }

    if (hadHour12) {
      hours = (hour12 % 12) + (isPm ? 12 : 0);
    }

    const out = new Date(year, month, day, hours, minutes, seconds);
    return this.isValid(out) ? out : null;
  }
}
