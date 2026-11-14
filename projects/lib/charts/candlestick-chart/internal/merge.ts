/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** How many candles a pixel of the drawing holds before the candles are merged. */
const DENSITY = 2;

/** How wide the room of one merged candle is, in px: a 1px body and the gap beside it. */
const COLUMN = 2;

/** The four prices a candle is drawn from. */
interface Prices {
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
}

/** Whether a period can be drawn: all four prices finite. */
function drawable(d: Prices): boolean {
  return Number.isFinite(d.open) && Number.isFinite(d.high) && Number.isFinite(d.low) && Number.isFinite(d.close);
}

/**
 * How many fraction digits the shortest decimal that reads back as `value` has: 5 for
 * 1.08345, 0 for 120, 8 for 1.2e-7. `toString()` is that shortest form, written with an
 * exponent past 1e21 and below 1e-6, which this reads too.
 */
function fractionDigits(value: number): number {
  const [mantissa, exponent = '0'] = Math.abs(value).toString().split('e');
  return Math.max(0, (mantissa.split('.')[1]?.length ?? 0) - Number(exponent));
}

/**
 * One candle as it is drawn: the periods `start` up to `end` of the data, and the four
 * prices they come to. Unmerged, one period.
 *
 * @internal
 */
export interface WrCandlestickMerged extends Prices {
  /** The first period it stands for, as a position in the data. */
  readonly start: number;
  /** One past the last period it stands for. */
  readonly end: number;
}

/**
 * How many periods one drawn candle stands for on a drawing `width` px wide: 1 while
 * `count` periods are at most two a pixel, which is every chart of ordinary size. Past
 * that the candles overlap into one smear whatever is drawn, and each costs two elements,
 * so the periods are merged {@link COLUMN} px at a time: enough of them per drawn candle
 * that no more than one candle is drawn per two pixels, a 1px body with a gap beside it.
 *
 * A number of periods rather than a width, so a resize that leaves it alone rebuilds
 * nothing.
 *
 * @internal
 */
export function wrCandlestickPer(count: number, width: number): number {
  if (!(width > 0) || count <= width * DENSITY) return 1;
  return Math.ceil(count / Math.max(1, Math.floor(width / COLUMN)));
}

/**
 * The candles drawn for `data`, `per` periods to each, in order: a period that cannot be
 * drawn - a price that is not a finite number - is left out, and a run of `per` with
 * none that can draws nothing.
 *
 * A merged candle is the candle of the longer period its run covers: it opens where its
 * first period opened and closes where its last one closed, and its high and low are the
 * highest high and the lowest low among them. So the chart's highest high and lowest
 * low, its first open and its last close all survive, each in the candle of its own run,
 * and the axis fitted to the merged candles is the one fitted to the data.
 *
 * `per` at 1 or less keeps every period as its own candle.
 *
 * @internal
 */
export function wrCandlestickMerge(data: readonly Prices[], per: number): WrCandlestickMerged[] {
  const size = per > 1 ? Math.floor(per) : 1;
  const merged: WrCandlestickMerged[] = [];
  for (let start = 0; start < data.length; start += size) {
    const end = Math.min(data.length, start + size);
    let open = Number.NaN;
    let close = Number.NaN;
    let high = Number.NEGATIVE_INFINITY;
    let low = Number.POSITIVE_INFINITY;
    let found = false;
    for (let i = start; i < end; i++) {
      const d = data[i];
      if (!drawable(d)) continue;
      if (!found) {
        open = d.open;
        found = true;
      }
      close = d.close;
      if (d.high > high) high = d.high;
      if (d.low < low) low = d.low;
    }
    if (found) merged.push({ start, end, open, high, low, close });
  }
  return merged;
}

/**
 * The most fraction digits any finite price of `data` is written with, at least `least`
 * and at most `most`: what an exact price is written to.
 *
 * One pass that stops at `most`, and that reads a price's digits off its text only when
 * the price does not already round-trip at the digits found so far - which, once the
 * first few periods have set them, is none of the rest. Reading every price's text was
 * forty thousand strings for ten thousand candles, on every change to the data.
 *
 * @internal
 */
export function wrCandlestickDigits(data: readonly Prices[], least: number, most: number): number {
  let digits = Math.min(Math.max(0, least), most);
  let factor = 10 ** digits;
  const read = (price: number): void => {
    if (!Number.isFinite(price) || Math.round(price * factor) / factor === price) return;
    digits = Math.min(most, Math.max(digits, fractionDigits(price)));
    factor = 10 ** digits;
  };
  for (const d of data) {
    if (digits >= most) return most;
    read(d.open);
    read(d.high);
    read(d.low);
    read(d.close);
  }
  return digits;
}
