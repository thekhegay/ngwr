/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrDateFormat } from './types';

/**
 * Abstraction over a date object so the calendar, date picker and time picker
 * can work with `Date`, `date-fns`, `luxon`, or any other library a consumer
 * prefers — without changing component code.
 *
 * Default implementation: {@link WrNativeDateAdapter} (native `Date`,
 * `Intl.DateTimeFormat`). Register a different adapter via
 * `provideWrDateAdapter({ adapter: MyAdapter })`.
 *
 * Used as both the type and the DI token — `inject(WrDateAdapter)` works
 * directly thanks to Angular's class-as-token resolution.
 *
 * Every "mutating" method (`addX`, `setTime`) returns a **new** value;
 * adapters never mutate in place so consumers can pass dates around safely.
 */
export abstract class WrDateAdapter<TDate = Date> {
  // Construction & identity

  /** Current moment. */
  abstract today(): TDate;

  /** Defensive clone — must return an independent value, never the same reference. */
  abstract clone(date: TDate): TDate;

  /** Build a date from year / month (0-based) / day. */
  abstract createDate(year: number, month: number, day: number): TDate;

  /** `false` for `NaN` / invalid input. */
  abstract isValid(date: TDate): boolean;

  // Accessors

  abstract getYear(date: TDate): number;
  /** `0` (January) – `11` (December). */
  abstract getMonth(date: TDate): number;
  /** Day of the month, `1`-`31`. */
  abstract getDate(date: TDate): number;
  /** `0` (Sunday) – `6` (Saturday). */
  abstract getDayOfWeek(date: TDate): number;
  abstract getDaysInMonth(date: TDate): number;
  abstract getHours(date: TDate): number;
  abstract getMinutes(date: TDate): number;
  abstract getSeconds(date: TDate): number;

  // Immutable math

  abstract addYears(date: TDate, amount: number): TDate;
  abstract addMonths(date: TDate, amount: number): TDate;
  abstract addDays(date: TDate, amount: number): TDate;
  /** Returns a new date with the time portion replaced. */
  abstract setTime(date: TDate, hours: number, minutes: number, seconds: number): TDate;

  // Comparison

  abstract isSameDay(a: TDate, b: TDate): boolean;
  abstract isSameMonth(a: TDate, b: TDate): boolean;
  /** Negative if `a < b`, positive if `a > b`, zero if equal (compared at day precision). */
  abstract compareDate(a: TDate, b: TDate): number;

  /**
   * Convenience used by the calendar's range UI. Inclusive on both ends.
   * Implementation can stay on the base class because it delegates to
   * `compareDate`.
   */
  isWithinRange(date: TDate, start: TDate, end: TDate): boolean {
    return this.compareDate(date, start) >= 0 && this.compareDate(date, end) <= 0;
  }

  // Formatting / parsing

  /**
   * Format a date. Accepts either a named {@link WrDateFormat} key (which the
   * adapter resolves locale-aware) or a raw format string (`'dd.MM.yyyy'`).
   *
   * Supported tokens for raw strings: `yyyy`, `yy`, `MMMM`, `MMM`, `MM`, `M`,
   * `dd`, `d`, `HH`, `H`, `hh`, `h`, `mm`, `ss`, `a` (am / pm).
   */
  abstract format(date: TDate, formatKeyOrString: WrDateFormat | (string & {})): string;

  /**
   * Parse a string into a date. Returns `null` when parsing fails. Accepts
   * the same `formatKeyOrString` set as {@link format}.
   */
  abstract parse(value: string, formatKeyOrString: WrDateFormat | (string & {})): TDate | null;

  // Locale info

  /** `0` Sunday, `1` Monday — locale-dependent. */
  abstract getFirstDayOfWeek(): number;

  /** Names ordered from `getFirstDayOfWeek()` onwards. Length 7. */
  abstract getDayOfWeekNames(style: 'narrow' | 'short' | 'long'): readonly string[];

  /** Names from January (index `0`) to December (`11`). Length 12. */
  abstract getMonthNames(style: 'narrow' | 'short' | 'long'): readonly string[];
}
