/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { LOCALE_ID, Pipe, inject } from '@angular/core';
import type { PipeTransform } from '@angular/core';

import type { WrDurationStyle, WrDurationUnit } from './types';

/** Each unit's length in milliseconds, largest first. */
const UNIT_MS: readonly (readonly [WrDurationUnit, number])[] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
  ['second', 1000],
  ['millisecond', 1],
];

const CLOCK_UNITS: ReadonlySet<WrDurationUnit> = new Set(['hour', 'minute', 'second']);
const LIST_UNITS: ReadonlySet<WrDurationUnit> = new Set(['day', 'hour', 'minute', 'second']);

function formatClock(ms: number, locale: string): string {
  const { hour = 0, minute = 0, second = 0 } = wrSplitDuration(ms, CLOCK_UNITS);
  const digits = (n: number, width: number): string =>
    new Intl.NumberFormat(locale, { useGrouping: false, minimumIntegerDigits: width }).format(n);
  const tail = `${digits(minute, hour > 0 ? 2 : 1)}:${digits(second, 2)}`;
  return hour > 0 ? `${digits(hour, 1)}:${tail}` : tail;
}

function formatUnits(ms: number, locale: string): string {
  const parts = wrSplitDuration(ms, LIST_UNITS);
  const unit = (name: WrDurationUnit, n: number): string =>
    new Intl.NumberFormat(locale, { style: 'unit', unit: name, unitDisplay: 'short' }).format(n);

  const words = (Object.entries(parts) as [WrDurationUnit, number][])
    .filter(([, n]) => n > 0)
    .map(([name, n]) => unit(name, n));
  if (words.length === 0) return unit('second', 0);
  return new Intl.ListFormat(locale, { style: 'narrow', type: 'unit' }).format(words);
}

/**
 * Split a span of milliseconds into the units asked for. A unit left out is
 * carried into the next larger one that is kept, so `['hour', 'minute',
 * 'second']` over three days and an hour reads 73 hours; the smallest unit kept
 * floors whatever remains. Shared with `wr-statistic-countdown`, whose format
 * tokens pick the units.
 *
 * @internal
 */
export function wrSplitDuration(
  ms: number,
  units: ReadonlySet<WrDurationUnit>
): Readonly<Partial<Record<WrDurationUnit, number>>> {
  const out: Partial<Record<WrDurationUnit, number>> = {};
  let rest = ms;
  for (const [unit, size] of UNIT_MS) {
    if (!units.has(unit)) continue;
    const n = Math.floor(rest / size);
    out[unit] = n;
    rest -= n * size;
  }
  return out;
}

/**
 * A span of milliseconds as text, in the given locale.
 *
 * Two styles. `'clock'` is digits and colons: `1:30:00`, and `5:07` under an
 * hour; days are carried into the hours, since a clock has no day digit, so two
 * days read `48:00:00`. `'units'` is every non-zero unit as a word the locale
 * writes, `1 hr 30 min` in English and `1 h 30 min` in French, through
 * `Intl.NumberFormat`'s unit style and `Intl.ListFormat` — `Intl.DurationFormat`
 * is above the browser floor. The digits are the locale's own in both styles.
 *
 * Whole seconds: a fraction of a second is floored in both styles. Zero reads
 * `0:00` and `0 sec`. A negative span is its absolute value with the locale's
 * minus sign in front, `-5:07`. `null`, `undefined`, an empty string and a value
 * that is not a finite number give an empty string, as `wrFormatNumber` does.
 *
 * The same output as the `wrDuration` pipe, for a string built in TypeScript.
 *
 * @example
 * ```ts
 * wrFormatDuration(5_400_000, 'en-US');           // "1:30:00"
 * wrFormatDuration(5_400_000, 'en-US', 'units');  // "1 hr 30 min"
 * wrFormatDuration(307_000, 'fr-FR', 'units');    // "5 min 7 s"
 * ```
 */
export function wrFormatDuration(
  value: number | string | null | undefined,
  locale: string,
  style: WrDurationStyle = 'clock'
): string {
  if (value === null || value === undefined || value === '') return '';
  const ms = Number(typeof value === 'string' ? value.trim() : value);
  if (!Number.isFinite(ms)) return '';

  const span = Math.abs(ms);
  const body = style === 'units' ? formatUnits(span, locale) : formatClock(span, locale);
  // A span that floors to zero carries no sign: `-0:00` states nothing.
  if (ms >= 0 || span < 1000) return body;

  const minus = new Intl.NumberFormat(locale).formatToParts(-1).find(part => part.type === 'minusSign');
  return `${minus?.value ?? '-'}${body}`;
}

/**
 * A span of milliseconds as clock digits or as units, in Angular's `LOCALE_ID`.
 * See {@link wrFormatDuration} for the two styles and the edge cases.
 *
 * @example
 * ```html
 * {{ 5400000 | wrDuration }}            <!-- "1:30:00"      -->
 * {{ 5400000 | wrDuration: 'units' }}   <!-- "1 hr 30 min"  -->
 * {{ 307000 | wrDuration }}             <!-- "5:07"         -->
 * ```
 */
@Pipe({ name: 'wrDuration' })
export class WrDuration implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(value: number | string | null | undefined, style: WrDurationStyle = 'clock'): string {
    return wrFormatDuration(value, this.locale, style);
  }
}

export type { WrDurationStyle, WrDurationUnit } from './types';
