/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Service, inject, isDevMode } from '@angular/core';

import type { Locale } from 'date-fns';
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
import { WrDateAdapter, WR_DATE_LOCALE, type WrDateFormat, isNamedFormat } from 'ngwr/date';

import { WR_DATE_FNS_LOCALE } from './tokens';

const NAMED_PATTERNS: Readonly<Record<WrDateFormat, string>> = {
  shortDate: 'P',
  mediumDate: 'PP',
  longDate: 'PPP',
  time: 'p',
  shortDateTime: 'P p',
  mediumDateTime: 'PP p',
};

/**
 * {@link WrDateAdapter} backed by `date-fns`. Same `Date` value type as the
 * native adapter, but defers all math, formatting, and parsing to date-fns —
 * pick this when you want its long patterns (`P`, `PP`, `PPP`, `p`) without
 * writing them by hand.
 *
 * **Localising it takes TWO settings, and that is a property of date-fns rather
 * than a wart here.** `WR_DATE_LOCALE` is a BCP 47 tag; date-fns resolves its
 * patterns against a `Locale` OBJECT, and the objects are separate modules, so
 * mapping a tag onto one would mean importing all of them and defeating the
 * tree-shaking that is the reason this is an opt-in entry point. Pass the object
 * as `dateFnsLocale` and it reaches `format` and `parse`; leave it out and they
 * stay on date-fns's own module default, which is what keeps
 * `setDefaultOptions({ locale })` working for apps that already use it.
 *
 * Half-localising is the failure mode this is designed to make loud: with only a
 * tag, `getFirstDayOfWeek`, `getDayOfWeekNames` and `getMonthNames` go through
 * `Intl` and answer in the locale while the trigger beside them reads
 * `08/11/2025`, and READING is the sharper edge — `11/08/2025` typed by a user in
 * a dd/MM locale parses as 8 November, valid and wrong. A non-English tag with no
 * object warns once in dev mode for exactly that reason.
 *
 * @example
 * ```ts
 * import { ru } from 'date-fns/locale/ru';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [provideWrDateFnsAdapter({ locale: 'ru-RU', dateFnsLocale: ru })],
 * });
 * ```
 *
 * Peer dep: `date-fns@^3` (or `^4`).
 */
@Service()
export class WrDateFnsAdapter extends WrDateAdapter<Date> {
  private readonly locale = inject(WR_DATE_LOCALE);
  private readonly dateFnsLocale = inject(WR_DATE_FNS_LOCALE);

  constructor() {
    super();
    if (isDevMode() && !this.dateFnsLocale && !this.locale.toLowerCase().startsWith('en')) {
      // eslint-disable-next-line no-console -- dev-mode validation
      console.warn(
        `[NGWR] provideWrDateFnsAdapter({ locale: '${this.locale}' }) localises the calendar ` +
          `headings but not the field: date-fns needs its own Locale OBJECT. Pass one — ` +
          `provideWrDateFnsAdapter({ locale: '${this.locale}', dateFnsLocale: <import from ` +
          `'date-fns/locale/…'> }) — or set date-fns's module default with setDefaultOptions().`
      );
    }
  }

  /** What date-fns is handed. `{}` leaves its module default in charge. */
  private get options(): { locale?: Locale } {
    return this.dateFnsLocale ? { locale: this.dateFnsLocale } : {};
  }

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
    return dfFormat(date, pattern, this.options);
  }

  parse(value: string, formatKeyOrString: WrDateFormat | (string & {})): Date | null {
    const raw = value?.trim();
    if (!raw) return null;
    const pattern = isNamedFormat(formatKeyOrString) ? NAMED_PATTERNS[formatKeyOrString] : formatKeyOrString;
    // The same options as `format`, so whatever the one wrote the other reads — the
    // pattern `P` means `MM/dd/y` in enUS and `dd.MM.y` in ru, and a picker that writes
    // one and reads the other is the native adapter's blocker wearing another hat.
    const result = dfParse(raw, pattern, new Date(), this.options);
    return isValid(result) ? result : null;
  }

  // Locale info

  getFirstDayOfWeek(): number {
    // The object wins where there is one: it is what `format` and `parse` compute with,
    // and a grid starting on a different day from the strings beside it is the same
    // half-localisation this adapter is trying to stop shipping.
    const fromLocale = this.dateFnsLocale?.options?.weekStartsOn;
    if (typeof fromLocale === 'number') return fromLocale;
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
