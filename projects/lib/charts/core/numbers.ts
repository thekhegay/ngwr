/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { LOCALE_ID, type Signal, inject } from '@angular/core';

import { clamp } from 'ngwr/utils';

import type { WrChartNumbers } from './types';

/**
 * The fewest fraction digits that write `value` exactly, up to six: the precision of a
 * step no power of ten divides, such as the third a flat range is centred with.
 */
function fractionDigits(value: number): number {
  for (let d = 0; d <= 6; d++) if (Math.abs(value * 10 ** d - Math.round(value * 10 ** d)) < 1e-9) return d;
  return 6;
}

/** The power of ten of `value`'s leading digit: 2 for 750, -2 for 0.025. */
function magnitude(value: number): number {
  const abs = Math.abs(value);
  let m = Math.floor(Math.log10(abs));
  // `log10` is a float: guard the exact powers of ten from landing one off.
  if (10 ** (m + 1) <= abs) m++;
  if (10 ** m > abs) m--;
  return m;
}

/**
 * The power of ten of `step`'s LAST significant digit: 1 for 250, -1 for 2.5. Every tick
 * is a whole multiple of the step, so no tick has a digit below it, and a tick written to
 * that digit is written exactly.
 */
function lastDigit(step: number): number {
  for (let e = magnitude(step); e > -21; e--) {
    const scaled = step / 10 ** e;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-6) return e;
  }
  return -21;
}

/**
 * The number writers of one chart: its axis ticks, the labels it prints in tight
 * spaces, and the figures of its tooltip and its accessible names — every one
 * through the chart's `valueFormat` when it has one, else through `Intl` in
 * `locale`.
 *
 * Seven charts kept their own copy of the `Intl` half until 15.1, each with the
 * same two formatters and the same `formatValue`, and the line chart a second,
 * axis-wide copy for its ticks. The rules are theirs, unchanged:
 *
 * - `value` is never compact, and is `Intl`'s default otherwise: up to three
 *   fraction digits, and below one three SIGNIFICANT digits, since three fraction
 *   digits write a reading of 0.0004 as `0`. It is not the exact figure: 1.08345
 *   is `1.083`, and an axis stepping by 0.00025 is finer than it. A chart that has
 *   to write a figure to a known precision asks `exact`.
 * - `label` is compact from a thousand up, where a bar is too narrow for
 *   `1,234,567`, and below a thousand it is `value`: compact rounding would print
 *   12.5 as `13`, and there is nothing to abbreviate.
 * - `ticks` is decided for the AXIS. Compact, through `Intl` (`1.2K`, `3.4M`,
 *   `4 Mio.`, `5 тыс.`), with each tick to exactly the significant digits the step
 *   needs — a fixed count printed 1250 beside 1000 as `1.3k` and `1k` on an axis
 *   stepping by 250. And when abbreviating would make the labels LONGER (a fine
 *   step on large numbers, where `-1.025K` is wider than `-1,025`) the whole axis
 *   is written in full instead, so no axis mixes `-1K` with `-1,025`. Written in
 *   full, a tick has as many fraction digits as the step's last digit needs, however
 *   fine: they stopped at six, so an axis stepping by 2.5e-7 printed `0.000013` twice.
 * - `exact` writes a figure to a precision the chart decides — the step of its axis,
 *   a price's tick size — never compact, through `valueFormat` when there is one.
 *
 * `valueFormat` takes whatever extra arguments the chart passes it, so a chart can
 * tell its formatter which axis a number is for while a `(value) => string`
 * written for another chart still fits. Call in an injection context: `locale`
 * defaults to `LOCALE_ID`.
 *
 * @internal
 */
export function useChartNumbers<A extends readonly unknown[] = []>(
  valueFormat: Signal<((value: number, ...args: A) => string) | null | undefined>,
  locale: string = inject(LOCALE_ID)
): WrChartNumbers<A> {
  const numbers = new Intl.NumberFormat(locale);
  /** Below one, by significant digits, which keep 0.0004 from rounding to `0`. */
  const smallNumbers = new Intl.NumberFormat(locale, { maximumSignificantDigits: 3 });
  const compactNumbers = new Intl.NumberFormat(locale, { notation: 'compact' });

  const value = (v: number, ...args: A): string => {
    const custom = valueFormat();
    if (custom) return custom(v, ...args);
    return (v !== 0 && Math.abs(v) < 1 ? smallNumbers : numbers).format(v);
  };

  const label = (v: number, ...args: A): string => {
    if (valueFormat() || Math.abs(v) < 1000) return value(v, ...args);
    return compactNumbers.format(v);
  };

  const ticks = (values: readonly number[], step: number, ...args: A): string[] => {
    const custom = valueFormat();
    if (custom) return values.map(v => custom(v, ...args));
    if (values.length === 0) return [];

    const last = lastDigit(step);
    // A CEILING rather than a fixed count, so trailing zeros are dropped: a 0.25 step
    // wants two digits on 0.25 and none on 1, and `1.00` beside `0.25` reads as
    // spurious precision. Down to the step's last digit, however fine — the six digits
    // `fractionDigits` stops at printed a 2.5e-7 step as `0.000013` twice, and called
    // a step below 1e-9 whole. A step with no last digit (a third) keeps those six.
    const digits = last <= -21 ? fractionDigits(step) : clamp(-last, 0, 20);
    const full = new Intl.NumberFormat(locale, { maximumFractionDigits: digits });
    const plain = values.map(v => full.format(v));
    const compact = values.map(v =>
      v === 0
        ? full.format(0)
        : new Intl.NumberFormat(locale, {
            notation: 'compact',
            maximumSignificantDigits: clamp(magnitude(v) - last + 1, 1, 21),
          }).format(v)
    );
    const longest = (labels: readonly string[]): number => Math.max(...labels.map(text => text.length));
    return longest(compact) <= longest(plain) ? compact : plain;
  };

  /** One formatter per precision asked for, since a chart asks with the same one on every pass. */
  const exactNumbers = new Map<number, Intl.NumberFormat>();

  const exact = (v: number, fractionDigits: number, ...args: A): string => {
    const custom = valueFormat();
    if (custom) return custom(v, ...args);
    const digits = Number.isFinite(fractionDigits) ? clamp(Math.round(fractionDigits), 0, 20) : 3;
    let writer = exactNumbers.get(digits);
    if (!writer) {
      writer = new Intl.NumberFormat(locale, { maximumFractionDigits: digits });
      exactNumbers.set(digits, writer);
    }
    return writer.format(v);
  };

  return { value, label, ticks, exact };
}
