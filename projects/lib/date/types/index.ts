import type { Type } from '@angular/core';

import type { WrDateAdapter } from '../wr-date-adapter';

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
}

export type { WrDateFormat } from './wr-date-format';
export type { WrDatesOptions };
