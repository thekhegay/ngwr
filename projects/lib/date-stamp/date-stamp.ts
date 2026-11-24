/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  Component,
  Injector,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
} from '@angular/core';

import {
  type WrDateFormat,
  type WrEpochUnit,
  WR_DATE_STAMP_DEFAULTS,
  WrDateAdapter,
  wrDateLocale,
  wrIsDateOnly,
  wrIsNamedFormat,
  wrParseDate,
} from 'ngwr/date';
import { useI18nText } from 'ngwr/i18n';
import { wrFormatRelativeTime } from 'ngwr/pipes';
import { wrCheckStyles } from 'ngwr/utils';

interface Stamp {
  readonly at: Date;
  readonly dayOnly: boolean;
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

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Milliseconds until the relative text of an instant `distance` away changes:
 * the next whole second under a minute, minute under an hour, hour under a
 * day, then day. `wrFormatRelativeTime` cuts the count, so the text of a past
 * value moves on a whole step and the text of a coming one right after it.
 */
function untilNextText(distance: number): number {
  const size = Math.abs(distance);
  const step = size < MINUTE ? SECOND : size < HOUR ? MINUTE : size < DAY ? HOUR : DAY;
  return distance > 0 ? (size % step) + 1 : step - (size % step);
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
 * `relative` shows how far the moment is from now instead ("5 minutes ago"),
 * and keeps that text current on a timer. The date and the time stay in the
 * `title` of the `<time>`.
 *
 * `withDates({ stamp })` sets the formats, `todayTimeOnly`, `seconds` and
 * `relative` for every stamp of the app; an input set here wins.
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
 * <wr-date-stamp [value]="comment.createdAt" relative />
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

    // The browser only, and after the first paint: the server renders the text once and keeps no timer.
    const injector = inject(Injector);
    afterNextRender(() => {
      effect(
        onCleanup => {
          // Re-armed by each tick. Measured from the real clock, not the sample: a restart for
          // another reason (a new format) must not push the next change a whole step away.
          this.now();
          const delay = this.untilNextText(Date.now());
          if (delay === null) return;
          const timer = setTimeout(() => this.now.set(Date.now()), delay);
          onCleanup(() => clearTimeout(timer));
        },
        { injector }
      );
    });
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
   * `withDates({ stamp })` changes the default.
   *
   * @default 'mediumDate'
   */
  readonly dateFormat = input<WrDateFormat | (string & {})>(this.defaults.dateFormat ?? 'mediumDate');

  /**
   * Format of the second line: a named key (`'time24hSeconds'`) or a token
   * string (`'HH:mm'`). `withDates({ stamp })` changes the default.
   *
   * @default 'time'
   */
  readonly timeFormat = input<WrDateFormat | (string & {})>(this.defaults.timeFormat ?? 'time');

  /**
   * Write the seconds in the time line: `'time'` is read as `'timeSeconds'`
   * and `'HH:mm'` as `'HH:mm:ss'`. A format that already has them is left
   * alone. `withDates({ stamp })` changes the default.
   *
   * @default false
   */
  readonly seconds = input(this.defaults.seconds ?? false, { transform: booleanAttribute });

  /**
   * Show the time alone for a value from today. Today is the day in the
   * display zone, read when the stamp renders: one left on screen past
   * midnight keeps its single line. A date-only value keeps its date.
   * `withDates({ stamp })` changes the default.
   *
   * @default false
   */
  readonly todayTimeOnly = input(this.defaults.todayTimeOnly ?? false, { transform: booleanAttribute });

  /**
   * Show how far the moment is from now ("5 minutes ago", "tomorrow") in
   * place of the two lines, as `wrFormatRelativeTime` writes it, in the
   * language the stamp formats in. The text is kept current: it is written
   * again each second under a minute, each minute under an hour, each hour
   * under a day and each day after that, from a timer that starts after the
   * first render and never on the server. The date and the time move to the
   * `title` of the `<time>`. A date-only value is compared as a day ("today",
   * "yesterday"). `withDates({ stamp })` changes the default.
   *
   * @default false
   */
  readonly relative = input(this.defaults.relative ?? false, { transform: booleanAttribute });

  /**
   * What a number in `value` counts since the epoch: `'ms'`, `'us'`, `'s'` or
   * `'auto'`, by size. `null` follows `withDates({ epochUnit })`.
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
        at: date,
        dayOnly: true,
        iso: `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
        date: this.adapter.format(date, this.dateFormat()),
        time: null,
      };
    }

    const zoned = this.adapter.zoned();
    const timeFormat = this.timeFormat();
    return {
      at: date,
      dayOnly: false,
      iso: date.toISOString(),
      date: this.todayTimeOnly() && zoned.isSameDay(date, zoned.today()) ? null : zoned.format(date, this.dateFormat()),
      time: zoned.format(date, this.seconds() ? withSeconds(timeFormat) : timeFormat),
    };
  });
  private readonly locale = wrDateLocale();

  /**
   * The current time the relative text is measured from. The timer moves it,
   * and a new value or `relative` turned on reads the clock again: a stamp of
   * last year ticks once a day, and must not measure the next value from then.
   */
  private readonly now = linkedSignal(() => {
    this.value();
    this.relative();
    return Date.now();
  });

  /** Midnight of today in the display zone, which a date-only value is compared with. */
  private readonly today = computed(() => {
    const zoned = this.adapter.zoned();
    const now = new Date(this.now());
    return zoned.createDate(zoned.getYear(now), zoned.getMonth(now), zoned.getDate(now));
  });

  protected readonly relativeText = computed<string | null>(() => {
    const stamp = this.parts();
    if (stamp === null || !this.relative()) return null;
    if (!stamp.dayOnly) return wrFormatRelativeTime(stamp.at, this.locale(), { now: this.now() });

    // A day is not moved by the zone: it is compared with the zone's today as two local days.
    const zoned = this.adapter.zoned();
    const today = this.today();
    const local = new Date(zoned.getYear(today), zoned.getMonth(today), zoned.getDate(today));
    return wrFormatRelativeTime(this.value(), this.locale(), { now: local });
  });

  /** The two lines as one, for the `title` a relative stamp keeps them in. */
  protected readonly title = computed<string | null>(() => {
    const stamp = this.parts();
    if (stamp === null || !this.relative()) return null;
    return [stamp.date, stamp.time].filter(line => line !== null).join(', ');
  });

  /** Milliseconds to the next change of the relative text, `null` when there is none to keep current. */
  private untilNextText(now: number): number | null {
    const stamp = this.parts();
    if (stamp === null || !this.relative()) return null;
    if (!stamp.dayOnly) return untilNextText(stamp.at.getTime() - now);
    // Built, not added: on a day whose midnight the zone skips, `addDays` would keep the 01:00 it starts at.
    const zoned = this.adapter.zoned();
    const today = this.today();
    const next = zoned.createDate(zoned.getYear(today), zoned.getMonth(today), zoned.getDate(today) + 1);
    return Math.max(1, next.getTime() - now);
  }
}
