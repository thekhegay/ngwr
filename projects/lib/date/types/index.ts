import type { Type } from '@angular/core';

import type { WrDateAdapter } from '../wr-date-adapter';

import type { WrDateFormat } from './wr-date-format';
import type { WrDatePeriod, WrWeekOfYear } from './wr-date-period';

/**
 * What a number counts since the epoch: milliseconds, microseconds or seconds.
 *
 * `'auto'` decides by magnitude: under `1e10` it is seconds, under `1e13`
 * milliseconds, and microseconds from there. `1e10` seconds and `1e13`
 * milliseconds are both 20 November 2286, and `1e10` milliseconds and `1e13`
 * microseconds are both 26 April 1970, so a date between those two reads the
 * same in every unit. Outside them `'auto'` guesses wrong: name the unit.
 */
type WrEpochUnit = 'ms' | 'us' | 's' | 'auto';

/**
 * The zone a date-time string with no offset (`2026-11-12 13:45:00`) was
 * written in: the display zone of `withDates({ timeZone })`, the browser's, or
 * UTC.
 */
type WrZonelessIn = 'display' | 'browser' | 'utc';

/** How `wrParseDate` reads a value. Every key is optional and defaults to what 16.1 did. */
interface WrParseDateOptions {
  /**
   * The unit of a number.
   *
   * @default 'ms'
   */
  readonly epochUnit?: WrEpochUnit;

  /**
   * The zone of a date-time string with no offset. A string with `Z` or an
   * offset, and a date-only string, are not affected.
   *
   * @default 'browser'
   */
  readonly zonelessIn?: WrZonelessIn;

  /**
   * The display zone `zonelessIn: 'display'` reads in: an IANA name or an
   * offset. `null`, `undefined` and a zone no engine knows are the browser's.
   */
  readonly timeZone?: string | null;
}

/** App-wide defaults of `wr-date-stamp`. The component's own inputs win. */
interface WrDateStampDefaults {
  /** Format of the date line. Default: `'mediumDate'`. */
  readonly dateFormat?: WrDateFormat | (string & {});
  /** Format of the time line. Default: `'time'`. */
  readonly timeFormat?: WrDateFormat | (string & {});
  /** Show the time alone for a value from today. Default: `false`. */
  readonly todayTimeOnly?: boolean;
  /** Write the seconds in the time line. Default: `false`. */
  readonly seconds?: boolean;
}

/**
 * Options for `withDates()`.
 */
interface WrDatesOptions {
  /**
   * Adapter class. Default: {@link WrNativeDateAdapter}.
   *
   * Pass your own {@link WrDateAdapter} subclass to work with another date
   * library — ngwr ships no adapter but the native one.
   */
  readonly adapter?: Type<WrDateAdapter<unknown>>;

  /**
   * BCP 47 locale tag (`'en-US'`, `'ru-RU'`, …).
   *
   * Default: Angular's own `LOCALE_ID`, which is what {@link WR_DATE_LOCALE}
   * resolves to. This line used to say `navigator.language` in the browser and
   * `'en-US'` on the server, which was true before v14 and has been wrong since
   * — v14 made `LOCALE_ID` the single locale source precisely so an app that
   * sets it correctly stops formatting dates in whatever language the visitor's
   * browser happens to be.
   */
  readonly locale?: string;

  /**
   * The time zone dates are SHOWN in: an IANA name (`'Asia/Almaty'`), an offset
   * (`'+05:00'`, `'+05:30'`), or a function returning one. The function runs in
   * an injection context, so it may `inject()` the service that holds the
   * value, and a signal is such a function: a zone that arrives from a runtime
   * config after bootstrap repaints what is on screen. Default, and for `null`
   * or `undefined`: the browser's zone.
   *
   * Display only. A `Date` stays the instant it is, and so does a picker's
   * `value`. `wrDate`, `wrFormatDate` and `wr-date-stamp` print an instant on
   * this zone's wall clock; `wr-date-picker` in `time` and `datetime` mode shows
   * and reads its field and panel on it; the calendar marks this zone's today.
   * A date-only value is a calendar day and does not shift: `mode="date"` and a
   * `'2026-11-12'` string are the 12th in every zone.
   *
   * A value no engine knows falls back to the browser's zone and warns once in
   * dev mode.
   */
  readonly timeZone?: string | (() => string | null | undefined);

  /**
   * What a NUMBER counts since the epoch, for `wrDate`, `wrFormatDate` and
   * `wr-date-stamp`: `'ms'`, `'us'` (microseconds, sixteen digits today), `'s'`,
   * or `'auto'`, which decides by magnitude, see {@link WrEpochUnit}.
   *
   * @default 'ms'
   */
  readonly epochUnit?: WrEpochUnit;

  /**
   * The zone a date-time string with NO offset (`'2026-11-12 13:45:00'`) is
   * read in, for `wrDate`, `wrFormatDate` and `wr-date-stamp`. `'display'`
   * reads it as a wall clock of `timeZone`, so it prints unchanged; `'utc'`
   * reads it as UTC; `'browser'` as the browser's local time. A string with
   * `Z` or an offset is the instant it names, and a date-only string stays a
   * day, whatever this says.
   *
   * @default 'browser'
   */
  readonly zonelessIn?: WrZonelessIn;

  /**
   * App-wide defaults of `wr-date-stamp`: `dateFormat`, `timeFormat`,
   * `todayTimeOnly` and `seconds`. An input set on a stamp wins.
   */
  readonly stamp?: WrDateStampDefaults;
}

export type { WrDateFormat, WrDatePeriod, WrWeekOfYear };
export type { WrDateStampDefaults, WrDatesOptions, WrEpochUnit, WrParseDateOptions, WrZonelessIn };
