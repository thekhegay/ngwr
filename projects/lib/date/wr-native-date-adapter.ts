/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Service, inject } from '@angular/core';

import type { WrDateFormat } from './interfaces';
import { WR_DATE_LOCALE } from './tokens';
import { WrDateAdapter } from './wr-date-adapter';

const NAMED_KEYS = new Set<WrDateFormat>([
  'shortDate',
  'mediumDate',
  'longDate',
  'time',
  'shortDateTime',
  'mediumDateTime',
]);

/**
 * Bidi control marks ICU embeds in a right-to-left date pattern — ar-SA writes its
 * separator as U+200F followed by a slash. No keyboard produces one, so both the
 * pattern and the typed string drop them before they are compared.
 */
const BIDI_RE = /[\u200e\u200f\u061c\u2066-\u2069]/g;

const REGEX_META_RE = /[.*+?^${}()|[\]\\]/g;

function stripBidi(value: string): string {
  return value.replace(BIDI_RE, '');
}

function escapeRegex(value: string): string {
  return value.replace(REGEX_META_RE, '\\$&');
}

/**
 * One literal run of an `Intl` pattern, as a regex fragment.
 *
 * Whitespace inside a literal is advisory, not exact: ICU separates `02:30` from `PM`
 * with a NARROW NO-BREAK SPACE (U+202F) and no keyboard emits one, so every whitespace
 * run matches `\s*`. A literal that is nothing BUT whitespace keeps `\s+` — relaxing it
 * there would let `15 2026` also read as `152026`, which is how a lenient parser invents
 * a date nobody typed.
 */
function literalToRegex(literal: string): string {
  const text = stripBidi(literal);
  if (!text) return '';
  if (!text.trim()) return '\\s+';
  return text.split(/\s+/).map(escapeRegex).join('\\s*');
}

/** Longest first, so `March` is never consumed as `Mar` with `ch` left over. */
function alternation(names: readonly string[]): string {
  return [...new Set(names)]
    .sort((a, b) => b.length - a.length)
    .map(name => escapeRegex(stripBidi(name)))
    .join('|');
}

/**
 * The ten digits a locale's numbering system writes, index 0 to 9 — `null` when the
 * system is algorithmic (roman, hebrew) and there is no digit-by-digit reading to do.
 */
function numeralsFor(locale: string, numberingSystem: string): readonly string[] | null {
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(locale, { numberingSystem, useGrouping: false });
  } catch {
    return null;
  }
  const digits: string[] = [];
  for (let i = 0; i < 10; i++) {
    const digit = formatter.format(i);
    if ([...digit].length !== 1 || digits.includes(digit)) return null;
    digits.push(digit);
  }
  return digits;
}

/** A character class accepting the locale's own digits AND ASCII ones. */
function digitClass(numerals: readonly string[]): string {
  const extra = numerals
    .filter(digit => digit < '0' || digit > '9')
    .map(digit => `\\u${digit.codePointAt(0)!.toString(16).padStart(4, '0')}`)
    .join('');
  return `[0-9${extra}]`;
}

/** `١٥` to `15`, and ASCII through unchanged. `NaN` for anything else. */
function digitsToNumber(text: string, numerals: readonly string[]): number {
  let out = '';
  for (const ch of text) {
    if (ch >= '0' && ch <= '9') {
      out += ch;
      continue;
    }
    const index = numerals.indexOf(ch);
    if (index < 0) return Number.NaN;
    out += String(index);
  }
  return out ? Number(out) : Number.NaN;
}

function isAllDigits(text: string, numerals: readonly string[]): boolean {
  return text.length > 0 && !Number.isNaN(digitsToNumber(text, numerals));
}

/** What one capture group of a named-format parser holds. */
interface NamedField {
  readonly kind: 'year' | 'month' | 'monthName' | 'day' | 'hour' | 'minute' | 'second' | 'dayPeriod';
  /** Month names (12) or day-period names (`[am, pm]`), matched case-insensitively. */
  readonly names?: readonly string[];
}

interface NamedParser {
  readonly regex: RegExp;
  readonly fields: readonly NamedField[];
  readonly numerals: readonly string[];
  readonly hourCycle: string | undefined;
}

/** The parts assembled into a `Date`, whatever route read them. */
interface DateParts {
  year?: number;
  month?: number;
  day?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  hour12?: number;
  isPm?: boolean;
}

const INTL_OPTIONS: Readonly<Record<WrDateFormat, Intl.DateTimeFormatOptions>> = {
  shortDate: { year: 'numeric', month: 'numeric', day: 'numeric' },
  mediumDate: { year: 'numeric', month: 'short', day: 'numeric' },
  longDate: { year: 'numeric', month: 'long', day: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit' },
  shortDateTime: { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  mediumDateTime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
};

/** Recognised tokens, longest first so `MMMM` matches before `MMM`. */
/**
 * Every token, with single-quoted runs taken FIRST so they win.
 *
 * Without that, the one-letter tokens match letters inside literal text: `'yyyy [year]'`
 * came out as `2025 [yeamr]`, because the `a` in "year" was read as the meridiem token.
 * Quote literals the way `DatePipe` and LDML do — `'at'` — and `''` for a real quote.
 */
const PART_RE = /'([^']*)'|yyyy|yy|MMMM|MMM|MM|M|dd|d|HH|H|hh|h|mm|ss|a/g;

function pad(n: number, width = 2): string {
  return String(Math.abs(n)).padStart(width, '0');
}

/** Whether `value` is one of the shared named format keys. */
function isNamedFormat(value: string): value is WrDateFormat {
  return NAMED_KEYS.has(value as WrDateFormat);
}

/**
 * `digits` is a character class rather than `\d`, and it always accepts ASCII as well as
 * the locale's own numerals. The token formatter WRITES ASCII, so the round trip never
 * needed more — but a reader on an Arabic keyboard types `١٥` into the same field, and
 * `\d` made that silently unparseable with no feedback anywhere.
 */
function tokenToRegex(token: string, digits: string): string {
  switch (token) {
    case 'yyyy':
      return `(${digits}{4})`;
    case 'yy':
      return `(${digits}{2})`;
    case 'MM':
    case 'dd':
    case 'HH':
    case 'hh':
    case 'mm':
    case 'ss':
      return `(${digits}{2})`;
    case 'M':
    case 'd':
    case 'H':
    case 'h':
      return `(${digits}{1,2})`;
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
@Service()
export class WrNativeDateAdapter extends WrDateAdapter<Date> {
  private readonly locale = inject(WR_DATE_LOCALE);

  // Construction & identity

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

  // Accessors

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

  // Immutable math

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
    // A calendar day, not 86 400 000 ms. Where daylight saving applies a day can be 23 or
    // 25 hours long, so millisecond arithmetic drifts the wall clock and — across an
    // autumn change — lands back on the same calendar date, which makes a month grid
    // repeat a day and lose one. Not observable in a fixed-offset timezone, which is why
    // the reason lives here rather than only in a test.
    const d = this.clone(date);
    d.setDate(d.getDate() + amount);
    return d;
  }

  setTime(date: Date, hours: number, minutes: number, seconds: number): Date {
    const d = this.clone(date);
    d.setHours(hours, minutes, seconds, 0);
    return d;
  }

  // Comparison

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

  // Formatting / parsing

  // `(string & {})` keeps autocomplete for the WrDateFormat literals
  // while still accepting any other string as a raw token pattern.
  format(date: Date, formatKeyOrString: WrDateFormat | (string & {})): string {
    if (isNamedFormat(formatKeyOrString)) {
      return this.intl(formatKeyOrString).format(date);
    }
    return this.formatWithTokens(date, formatKeyOrString);
  }

  /**
   * Read back what {@link format} wrote.
   *
   * A named format used to delegate to `new Date(raw)`, which understands only
   * Anglo-American forms — so the field could not read its own output anywhere else.
   * `new Date('15.3.2026')` and `new Date('14:30')` are both `Invalid Date`, while
   * `new Date('1')` is 1 January 2001: retyping a de-DE date committed the year 2001 on
   * the first keystroke and then refused every one after it, and `mode="time"` collapsed
   * to midnight in EVERY locale, en-US included. The named branch now builds its parser
   * from the SAME `Intl.DateTimeFormat` that printed the string, so the round trip holds
   * by construction rather than by luck.
   *
   * Returns `null` rather than a guess whenever the string does not match — the caller's
   * committed value is then left exactly as it was, which is the contract
   * `wr-input-number` follows for unparseable text.
   */
  parse(value: string, formatKeyOrString: WrDateFormat | (string & {})): Date | null {
    const raw = value?.trim();
    if (!raw) return null;

    if (isNamedFormat(formatKeyOrString)) {
      return this.parseNamed(raw, formatKeyOrString);
    }

    return this.parseWithTokens(raw, formatKeyOrString);
  }

  // Locale info

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

  /**
   * One `Intl.DateTimeFormat` per named format, built once.
   *
   * Constructing one is the expensive part of `format()`, and this adapter is
   * called per CELL: `wr-event-calendar` builds an `aria-label` for every time
   * slot on every day, so a week view asked for hundreds of identical
   * formatters. `locale` is injected once and never changes for the life of the
   * adapter, so the cache needs no invalidation — that is the whole reason it
   * can be this simple.
   */
  private readonly formatters = new Map<string, Intl.DateTimeFormat>();

  /**
   * Every `Intl` call this adapter makes pins `calendar: 'gregory'`, and that is a
   * correctness fix rather than a preference.
   *
   * The value type is a JS `Date`, every accessor on this class (`getYear`,
   * `getMonth`, `getDate`) is Gregorian, `createDate` builds a Gregorian date and the
   * calendar grid draws Gregorian months. A locale whose DEFAULT calendar is something
   * else — `fa-IR` resolves to `persian`, `th-TH` to `buddhist`, `ar-SA` to
   * `islamic-umalqura` in several engines — printed a field the grid beside it could
   * never agree with (`۱۴۰۴/۱۲/۲۴` over a grid headed 2026), and no parser can turn
   * that back into the `Date` it came from. Pinning the calendar makes format and parse
   * describe the same one.
   */
  private intlOptions(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions {
    return { ...options, calendar: 'gregory' };
  }

  private intl(key: WrDateFormat): Intl.DateTimeFormat {
    let found = this.formatters.get(key);
    if (!found) {
      found = new Intl.DateTimeFormat(this.locale, this.intlOptions(INTL_OPTIONS[key]));
      this.formatters.set(key, found);
    }
    return found;
  }

  getDayOfWeekNames(style: 'narrow' | 'short' | 'long'): readonly string[] {
    const formatter = new Intl.DateTimeFormat(this.locale, this.intlOptions({ weekday: style }));
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

  /**
   * Month names in the STANDALONE (nominative) form — what a calendar heading wants.
   * Inside a date the same name often declines; {@link monthNames} serves that form to
   * the token formatter, and this method deliberately keeps the heading one.
   */
  getMonthNames(style: 'narrow' | 'short' | 'long'): readonly string[] {
    return this.monthNames(style, 'standalone');
  }

  private numeralsCache: readonly string[] | null = null;

  /** The locale's own ten digits, cached — empty when its system is algorithmic. */
  private localeNumerals(): readonly string[] {
    this.numeralsCache ??=
      numeralsFor(this.locale, new Intl.NumberFormat(this.locale).resolvedOptions().numberingSystem) ?? [];
    return this.numeralsCache;
  }

  private dayPeriodCache: readonly [string, string] | null = null;

  /**
   * `[am, pm]` as the LOCALE writes them — `PM`, `م`, `午後`.
   *
   * The `a` token used to return a hard-coded lowercase `pm`, byte for byte identical in
   * every locale, which made it the one token in the pattern language that could not be
   * localised at all. `Intl` is the source rather than the i18n catalog because
   * `ngwr/date` deliberately depends on nothing: the panel next to it reads
   * `datePicker.am` / `datePicker.pm`, so an app that wants its own wording overrides it
   * there and passes a 24-hour pattern here.
   */
  private dayPeriods(): readonly [string, string] {
    if (this.dayPeriodCache) return this.dayPeriodCache;
    let periods: [string, string] = ['AM', 'PM'];
    try {
      const formatter = new Intl.DateTimeFormat(this.locale, this.intlOptions({ hour: 'numeric', hour12: true }));
      const read = (hour: number): string =>
        formatter.formatToParts(new Date(2024, 0, 15, hour)).find(p => p.type === 'dayPeriod')?.value ?? '';
      const [am, pm] = [read(9), read(21)];
      if (am && pm && am !== pm) periods = [am, pm];
    } catch {
      // No `Intl` day period for this locale — the English pair stays.
    }
    this.dayPeriodCache = periods;
    return periods;
  }

  private readonly monthNameCache = new Map<string, readonly string[]>();

  /**
   * `context: 'format'` asks `Intl` for the month name as it appears BESIDE A DAY, which
   * is where a case language stops using the nominative: ru writes `15 марта`, not
   * `15 март`, and fi writes `maaliskuuta`, not `maaliskuu`. The name comes out of a
   * `{ day, month }` formatter's parts, because a `{ month }` formatter alone can only
   * ever answer with the standalone form.
   *
   * Some locales write the month NUMERICALLY in that position — fi abbreviates `15.3.`,
   * ja writes `3` with `月` as a separate literal — and there the standalone name is the
   * only name there is, so a purely numeric answer falls back to it. Without that guard
   * `dd MMMM yyyy` would render `15 3 2026` in Japanese.
   */
  private monthNames(style: 'narrow' | 'short' | 'long', context: 'standalone' | 'format'): readonly string[] {
    const cacheKey = `${style}:${context}`;
    const cached = this.monthNameCache.get(cacheKey);
    if (cached) return cached;

    const standaloneFormatter = new Intl.DateTimeFormat(this.locale, this.intlOptions({ month: style }));
    const standalone: string[] = [];
    for (let i = 0; i < 12; i++) standalone.push(standaloneFormatter.format(new Date(2024, i, 15)));

    let out: readonly string[] = standalone;
    if (context === 'format') {
      const numerals = numeralsFor(this.locale, standaloneFormatter.resolvedOptions().numberingSystem) ?? [];
      const inDate = new Intl.DateTimeFormat(this.locale, this.intlOptions({ day: 'numeric', month: style }));
      out = standalone.map((name, i) => {
        const part = inDate.formatToParts(new Date(2024, i, 15)).find(p => p.type === 'month')?.value;
        if (!part || isAllDigits(part, numerals)) return name;
        return part;
      });
    }

    this.monthNameCache.set(cacheKey, out);
    return out;
  }

  // Internals: token-based format / parse

  /** Whether a token pattern also writes the day, which decides the month's form. */
  private hasDayToken(pattern: string): boolean {
    let found = false;
    pattern.replace(PART_RE, (part: string, quoted?: string) => {
      if (quoted === undefined && (part === 'd' || part === 'dd')) found = true;
      return part;
    });
    return found;
  }

  private formatWithTokens(date: Date, pattern: string): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const hours24 = date.getHours();
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    // A pattern that writes the day wants the month declined for that position — `MMMM`
    // used to hand `15 март 2026` to a Russian field, which reads as machine output.
    const context = this.hasDayToken(pattern) ? 'format' : 'standalone';
    const monthNames = this.monthNames('long', context);
    const monthShort = this.monthNames('short', context);

    return pattern.replace(PART_RE, (part, quoted?: string) => {
      // A quoted run is emitted as-is; `''` is how a single quote is written.
      if (quoted !== undefined) return quoted === '' ? "'" : quoted;
      const token = part;
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
          return this.dayPeriods()[hours24 < 12 ? 0 : 1];
      }
      return token;
    });
  }

  private parseWithTokens(value: string, pattern: string): Date | null {
    const tokens: string[] = [];
    // Both forms are accepted on the way IN: the formatter writes the declined one beside
    // a day (`15 марта`), and a heading or an older stored string carries the nominative.
    const monthLong = [this.monthNames('long', 'format'), this.monthNames('long', 'standalone')];
    const monthShort = [this.monthNames('short', 'format'), this.monthNames('short', 'standalone')];
    const numerals = this.localeNumerals();
    const digits = digitClass(numerals);
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = escaped.replace(PART_RE, (part, quoted?: string) => {
      if (quoted !== undefined) {
        // Literal text matches itself and captures nothing, so the token indices stay
        // aligned with the groups below.
        return quoted === '' ? "'" : quoted;
      }
      tokens.push(part);
      // `a` is the one token whose text is locale-dependent, so its alternation is built
      // here rather than in the pure `tokenToRegex`: the marker this adapter now PRINTS
      // has to be one the same adapter can read.
      if (part === 'a') return `(${alternation([...this.dayPeriods(), 'am', 'pm'])})`;
      return tokenToRegex(part, digits);
    });

    const match = new RegExp(`^${regex}$`, 'i').exec(value);
    if (!match) return null;

    const parts: DateParts = {};

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const raw = match[i + 1];
      const n = digitsToNumber(raw, numerals);
      switch (token) {
        case 'yyyy':
          parts.year = n;
          break;
        case 'yy':
          parts.year = 2000 + n;
          break;
        case 'MM':
        case 'M':
          parts.month = n - 1;
          break;
        case 'MMM':
        case 'MMMM': {
          const sets = token === 'MMM' ? monthShort : monthLong;
          const wanted = raw.toLowerCase();
          const found = sets
            .map(names => names.findIndex(name => name.toLowerCase() === wanted))
            .find(index => index >= 0);
          if (found === undefined) return null;
          parts.month = found;
          break;
        }
        case 'dd':
        case 'd':
          parts.day = n;
          break;
        case 'HH':
        case 'H':
          parts.hours = n;
          break;
        case 'hh':
        case 'h':
          parts.hour12 = n;
          break;
        case 'mm':
          parts.minutes = n;
          break;
        case 'ss':
          parts.seconds = n;
          break;
        case 'a': {
          const marker = raw.toLowerCase();
          parts.isPm = marker === 'pm' || marker === this.dayPeriods()[1].toLowerCase();
          break;
        }
      }
    }

    return this.compose(parts);
  }

  /**
   * Build the parser for one named format out of the very formatter that prints it.
   *
   * `formatToParts` is the only honest source for a locale's field ORDER and its
   * literals — ru writes `dd.MM.y` with a two-digit month while its own
   * `{ month: 'numeric' }` request says one digit, ja puts the year first, and ar-SA
   * separates fields with U+200F. Names (a month, AM/PM) become an alternation of the
   * real strings; numbers accept the locale's digits AND ASCII, because a physical
   * keyboard produces the latter whatever the display shows.
   *
   * Returns `null` — meaning "this format cannot be read back" — rather than guessing,
   * for a field type nothing here asks for (an era, a weekday) or a numbering system
   * with no digit-by-digit reading (roman numerals). `parse` then refuses, which leaves
   * the caller's committed value untouched.
   */
  private buildNamedParser(key: WrDateFormat): NamedParser | null {
    const formatter = this.intl(key);
    const resolved = formatter.resolvedOptions();
    const numerals = numeralsFor(this.locale, resolved.numberingSystem);
    if (!numerals) return null;
    const digits = digitClass(numerals);

    // Distinct values in every field, so nothing below can read one field's reference
    // value out of another's position.
    const reference = new Date(2024, 0, 15, 13, 45, 56);
    const fields: NamedField[] = [];
    const fragments: { readonly source: string; readonly literal: boolean }[] = [];

    for (const part of formatter.formatToParts(reference)) {
      switch (part.type) {
        case 'literal':
          fragments.push({ source: literalToRegex(part.value), literal: true });
          break;
        case 'year':
          fields.push({ kind: 'year' });
          // Exactly two digits or exactly four — the shapes a year is actually written
          // in. `{1,4}` would let the third keystroke of `15.3.2026` read as the year 2
          // and commit it, which is a smaller version of the defect this replaces.
          fragments.push({ source: `(${digits}{2}|${digits}{4})`, literal: false });
          break;
        case 'month': {
          const names = this.namedMonthNames(formatter);
          if (names.every(name => isAllDigits(name, numerals))) {
            fields.push({ kind: 'month' });
            fragments.push({ source: `(${digits}{1,2})`, literal: false });
          } else {
            fields.push({ kind: 'monthName', names });
            fragments.push({ source: `(${alternation(names)})`, literal: false });
          }
          break;
        }
        case 'day':
          fields.push({ kind: 'day' });
          fragments.push({ source: `(${digits}{1,2})`, literal: false });
          break;
        case 'hour':
          fields.push({ kind: 'hour' });
          fragments.push({ source: `(${digits}{1,2})`, literal: false });
          break;
        case 'minute':
          fields.push({ kind: 'minute' });
          fragments.push({ source: `(${digits}{1,2})`, literal: false });
          break;
        case 'second':
          fields.push({ kind: 'second' });
          fragments.push({ source: `(${digits}{1,2})`, literal: false });
          break;
        case 'dayPeriod': {
          const names = this.dayPeriodNames(formatter);
          fields.push({ kind: 'dayPeriod', names });
          fragments.push({ source: `(${alternation(names)})`, literal: false });
          break;
        }
        default:
          return null;
      }
    }

    if (!fields.length) return null;

    // A trailing literal is optional. ru's medium date ends ` г.` and fi's short date
    // ends with a bare `.`; someone retyping the field types the fields and stops, and
    // refusing that would reintroduce the very "cannot read its own output" defect for
    // the one part of the string that carries no information.
    const source = fragments
      .map((fragment, i) =>
        i === fragments.length - 1 && fragment.literal && fragment.source ? `(?:${fragment.source})?` : fragment.source
      )
      .join('');

    return { regex: new RegExp(`^${source}$`, 'iu'), fields, numerals, hourCycle: resolved.hourCycle };
  }

  /** The twelve month strings THIS formatter writes, in its own style and context. */
  private namedMonthNames(formatter: Intl.DateTimeFormat): readonly string[] {
    const out: string[] = [];
    for (let i = 0; i < 12; i++) {
      out.push(formatter.formatToParts(new Date(2024, i, 15)).find(p => p.type === 'month')?.value ?? '');
    }
    return out;
  }

  /** `[am, pm]` as THIS formatter writes them — `ص` / `م` in Arabic, not AM / PM. */
  private dayPeriodNames(formatter: Intl.DateTimeFormat): readonly string[] {
    const read = (hour: number): string =>
      formatter.formatToParts(new Date(2024, 0, 15, hour, 30)).find(p => p.type === 'dayPeriod')?.value ?? '';
    return [read(9), read(21)];
  }

  private readonly namedParsers = new Map<WrDateFormat, NamedParser | null>();

  private parseNamed(raw: string, key: WrDateFormat): Date | null {
    let parser = this.namedParsers.get(key);
    if (parser === undefined) {
      parser = this.buildNamedParser(key);
      this.namedParsers.set(key, parser);
    }
    if (!parser) return null;

    const match = parser.regex.exec(stripBidi(raw));
    if (!match) return null;

    const parts: DateParts = {};
    const twelveHour = parser.fields.some(field => field.kind === 'dayPeriod');

    for (let i = 0; i < parser.fields.length; i++) {
      const field = parser.fields[i];
      const captured = match[i + 1] ?? '';
      if (field.kind === 'monthName' || field.kind === 'dayPeriod') {
        const wanted = stripBidi(captured).toLowerCase();
        const index = (field.names ?? []).findIndex(name => stripBidi(name).toLowerCase() === wanted);
        if (index < 0) return null;
        if (field.kind === 'monthName') parts.month = index;
        else parts.isPm = index === 1;
        continue;
      }

      const n = digitsToNumber(captured, parser.numerals);
      if (Number.isNaN(n)) return null;
      switch (field.kind) {
        case 'year':
          // Two digits mean this century, the same reading the `yy` token gives — the
          // picker's own doc promises `1/5/25` cleans up to 2025.
          parts.year = captured.length <= 2 ? 2000 + n : n;
          break;
        case 'month':
          parts.month = n - 1;
          break;
        case 'day':
          parts.day = n;
          break;
        case 'hour':
          if (twelveHour) parts.hour12 = n;
          // `hourCycle: 'h24'` numbers midnight 24 rather than 0.
          else parts.hours = n === 24 && parser.hourCycle === 'h24' ? 0 : n;
          break;
        case 'minute':
          parts.minutes = n;
          break;
        case 'second':
          parts.seconds = n;
          break;
      }
    }

    return this.compose(parts);
  }

  /**
   * Assemble whatever was read into a `Date`, or refuse.
   *
   * `new Date(2025, 12, 45)` does not fail — it rolls forward into the next year — and
   * `isValid` is happy with the result, so a text field used to turn nonsense into a
   * confident wrong answer. The clock parts are range-checked directly; the month and the
   * day are checked by comparing what came back, which catches every rollover including a
   * month of 12 or -1.
   */
  private compose(parts: DateParts): Date | null {
    const now = new Date();
    const year = parts.year ?? now.getFullYear();
    const month = parts.month ?? now.getMonth();

    let hours = parts.hours ?? 0;
    if (parts.hour12 !== undefined) hours = (parts.hour12 % 12) + (parts.isPm ? 12 : 0);
    const minutes = parts.minutes ?? 0;
    const seconds = parts.seconds ?? 0;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return null;

    // A time-only format carries no date, and the date it should imply is TODAY — the
    // previous default was 1 January, so a picker in `mode="time"` moved the model back
    // to New Year's Day as a side effect of reading a clock. The default is clamped to
    // the month it lands in, because an unclamped 31st would roll a February string
    // forward and the rollover check below would then refuse a well-formed string.
    const monthLength = new Date(year, month + 1, 0).getDate();
    const day = parts.day ?? Math.min(now.getDate(), monthLength);

    const out = new Date(year, month, day, hours, minutes, seconds);
    // Same trap `createDate` documents: a year under 100 maps onto 1900 + year unless it
    // is written back explicitly, so `0025-08-11` used to parse as 1925.
    if (year >= 0 && year < 100) out.setFullYear(year);
    if (!this.isValid(out)) return null;
    if (out.getMonth() !== month || out.getDate() !== day) return null;
    return out;
  }
}

export { isNamedFormat };
