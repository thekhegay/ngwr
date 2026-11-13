/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type WrDateAdapter, type WrDatePeriod, wrPeriodStart, wrWeekOfYear, wrWeekStart } from 'ngwr/date';
import { type WrI18nParams, useI18nFormatter } from 'ngwr/i18n';

import type { WrDateInputError } from '../types';

import type { WrDateInputRefusals } from './input-refusal';

/** First of the private-use code points that stand in for a placeholder while a template is read. */
const MARK = 0xe000;
const MARKS = /([\ue000-\ue00f])/;
const REGEX_META = /[.*+?^${}()|[\]\\]/g;

const PERIODS: ReadonlySet<string> = new Set<WrDatePeriod>(['week', 'month', 'quarter', 'year']);

function escapeRegex(value: string): string {
  return value.replace(REGEX_META, '\\$&');
}

/** A template's literal text as a pattern: its words exactly, any run of spaces between them. */
function literal(text: string): string {
  return text.split(/\s+/).map(escapeRegex).join('\\s*');
}

/**
 * Reads back what a catalog template wrote.
 *
 * The template is the app's, so its shape is not known here: `Q{{quarter}} {{year}}`
 * in English, `{{year}}年第{{quarter}}季度` in Chinese. It is asked to print
 * itself with a marker in each placeholder, and the printed text becomes the
 * pattern, so whatever the catalog writes is what the field reads. Returns the
 * captured text per placeholder, or `null` when `text` is not that shape.
 */
function readTemplate(
  text: string,
  format: (params?: WrI18nParams) => string,
  fields: Readonly<Record<string, string>>
): Record<string, string> | null {
  const names = Object.keys(fields);
  const marked = format(Object.fromEntries(names.map((name, i) => [name, String.fromCharCode(MARK + i)])));
  const order: string[] = [];
  let source = '';
  for (const piece of marked.split(MARKS)) {
    const name = piece.length === 1 ? names[piece.charCodeAt(0) - MARK] : undefined;
    if (name) {
      order.push(name);
      source += `(${fields[name]})`;
    } else {
      source += literal(piece);
    }
  }
  const match = new RegExp(`^\\s*${source}\\s*$`, 'iu').exec(text);
  if (!match || order.length !== names.length) return null;
  return Object.fromEntries(order.map((name, i) => [name, match[i + 1]]));
}

const YEAR = '\\d{4}';

/**
 * The period a picker mode names, or `null` for a mode that picks a day or a time.
 *
 * @internal
 */
export function wrPickerPeriod(mode: string): WrDatePeriod | null {
  return PERIODS.has(mode) ? (mode as WrDatePeriod) : null;
}

/** What a picker's field writes and reads, whichever mode it is in. */
export interface WrPickerText {
  /** `date` as the field shows it. */
  show(date: Date): string;
  /** The date the text names, a period as its first day, or `null` when it names none. */
  read(raw: string): Date | null;
  /** The refusal for text {@link read} could not use, with an example of what it can. */
  unreadable(): WrDateInputError;
  /** Changes whenever the same date would print differently. Reads signals, so an effect can track it. */
  key(): string;
}

/** What {@link usePickerText} asks of its picker. Functions, so each is read when the text is. */
export interface WrPickerTextSource {
  readonly adapter: () => WrDateAdapter<Date>;
  /** The period the mode names, `null` in a day or time mode. */
  readonly period: () => WrDatePeriod | null;
  /** The `[format]` the app set, if any: it wins in every mode. */
  readonly explicit: () => string | null;
  /** The format a day or time mode falls back to. */
  readonly format: () => string;
  readonly refusals: WrDateInputRefusals;
}

/**
 * The one place both pickers turn a date into field text and back.
 *
 * A day or time mode, and any mode with a `[format]`, goes through the adapter.
 * A period mode with no `[format]` writes the period instead: `March 2026`,
 * `2026`, `Q1 2026`, `Week 12, 2026`. The month and the year numbers are the
 * adapter's, and the arrangement around them is the catalog's (`calendar.header`,
 * `datePicker.quarterValue`, `datePicker.weekValue`), for the reason the calendar
 * header gives: word order is not a translation of any word. Nothing here asks an
 * adapter for a format key it may not know, so an adapter written before the
 * period modes still serves them.
 *
 * Must be called from an injection context.
 *
 * @internal
 */
export function usePickerText(source: WrPickerTextSource): WrPickerText {
  const monthText = useI18nFormatter('calendar.header', '{{month}} {{year}}');
  const quarterText = useI18nFormatter('datePicker.quarterValue', 'Q{{quarter}} {{year}}');
  const weekText = useI18nFormatter('datePicker.weekValue', 'Week {{week}}, {{year}}');

  /** The period a period mode writes on its own, `null` where the adapter's format does. */
  const own = (): WrDatePeriod | null => (source.explicit() ? null : source.period());

  const showPeriod = (date: Date, period: WrDatePeriod): string => {
    const adapter = source.adapter();
    const year = adapter.getYear(date);
    const month = adapter.getMonth(date);
    switch (period) {
      case 'year':
        return String(year);
      case 'month':
        return monthText({ month: adapter.getMonthNames('long')[month], year });
      case 'quarter':
        return quarterText({ quarter: Math.floor(month / 3) + 1, year });
      case 'week':
        return weekText({ ...wrWeekOfYear(adapter, date) });
    }
  };

  const readPeriod = (raw: string, period: WrDatePeriod): Date | null => {
    const adapter = source.adapter();
    switch (period) {
      case 'year': {
        const text = raw.trim();
        return new RegExp(`^${YEAR}$`).test(text) ? adapter.createDate(Number(text), 0, 1) : null;
      }
      case 'month': {
        // The long names the field writes, and the short ones the panel's chips show.
        const long = adapter.getMonthNames('long').map(name => name.toLowerCase());
        const short = adapter.getMonthNames('short').map(name => name.toLowerCase());
        const names = [...long, ...short].sort((a, b) => b.length - a.length).map(escapeRegex);
        const read = readTemplate(raw, monthText, { month: names.join('|'), year: YEAR });
        if (!read) return null;
        const typed = read['month'].toLowerCase();
        const index = long.includes(typed) ? long.indexOf(typed) : short.indexOf(typed);
        return index < 0 ? null : adapter.createDate(Number(read['year']), index, 1);
      }
      case 'quarter': {
        const read = readTemplate(raw, quarterText, { quarter: '[1-4]', year: YEAR });
        return read ? adapter.createDate(Number(read['year']), (Number(read['quarter']) - 1) * 3, 1) : null;
      }
      case 'week': {
        const read = readTemplate(raw, weekText, { week: '\\d{1,2}', year: YEAR });
        return read ? wrWeekStart(adapter, Number(read['year']), Number(read['week'])) : null;
      }
    }
  };

  /** The last day of the current year: a month, a quarter and a week no reader mistakes for another. */
  const reference = (): Date => {
    const adapter = source.adapter();
    return adapter.createDate(adapter.getYear(adapter.today()), 11, 31);
  };

  return {
    show(date) {
      const period = own();
      return period ? showPeriod(date, period) : source.adapter().format(date, source.format());
    },
    read(raw) {
      const adapter = source.adapter();
      const period = own();
      const parsed = period ? readPeriod(raw, period) : adapter.parse(raw, source.format());
      if (!parsed || !adapter.isValid(parsed)) return null;
      // A `[format]` in a period mode reads a day: it stands for the period it is in.
      const snap = source.period();
      return snap ? wrPeriodStart(adapter, parsed, snap) : parsed;
    },
    unreadable() {
      const period = own();
      return period
        ? source.refusals.unreadableAs(showPeriod(reference(), period))
        : source.refusals.unreadable(source.format());
    },
    key() {
      const period = own();
      const adapter = source.adapter();
      return period
        ? `${period}|${showPeriod(reference(), period)}|${adapter.displayKey()}`
        : `${source.format()}|${adapter.displayKey()}`;
    },
  };
}
