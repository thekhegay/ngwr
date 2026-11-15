/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrBoxplotStats } from '../types';

/** How far past the box, in interquartile ranges, a value may lie and still be reached by a whisker: Tukey's. */
const FENCE = 1.5;

/**
 * How many outliers a group DRAWS on each side of its box at the most. Past it the dots
 * are a sample; the summary, the tooltip's count and the data table keep them all.
 */
const DRAWN_PER_SIDE = 100;

/** The first index of ascending `sorted` whose value is at least `bound`, or its length. */
function firstAtLeast(sorted: Float64Array, bound: number): number {
  let from = 0;
  let to = sorted.length;
  while (from < to) {
    const middle = (from + to) >>> 1; // eslint-disable-line no-bitwise -- halving an index
    if (sorted[middle] < bound) from = middle + 1;
    else to = middle;
  }
  return from;
}

/** The first index of ascending `sorted` whose value is past `bound`, or its length. */
function firstPast(sorted: Float64Array, bound: number): number {
  let from = 0;
  let to = sorted.length;
  while (from < to) {
    const middle = (from + to) >>> 1; // eslint-disable-line no-bitwise -- halving an index
    if (sorted[middle] <= bound) from = middle + 1;
    else to = middle;
  }
  return from;
}

/** `limit` of ascending `run` from `start` up to `end`, evenly spread, both ends among them. */
function sample(run: readonly number[], start: number, end: number, limit: number, into: number[]): void {
  const count = end - start;
  if (count <= limit) {
    for (let i = start; i < end; i++) into.push(run[i]);
    return;
  }
  for (let k = 0; k < limit; k++) into.push(run[start + Math.round((k * (count - 1)) / (limit - 1))]);
}

/**
 * The `p` quantile of `sorted`, which is ascending and not empty, by LINEAR
 * INTERPOLATION between the two closest ranks — Hyndman and Fan's type 7, the default
 * of R's `quantile()` and NumPy's `quantile()` and what Excel's `QUARTILE.INC` computes.
 *
 * The quantile sits at the zero-based position `(n − 1) · p`: on a value where that
 * position is whole, and that share of the way between the two values either side
 * where it is not. So 1, 2, 3, 4 has its first quartile at position 0.75, three
 * quarters of the way from 1 to 2: 1.75.
 *
 * @internal
 */
export function quantile(sorted: ArrayLike<number>, p: number): number {
  const position = (sorted.length - 1) * p;
  const below = Math.floor(position);
  const above = Math.ceil(position);
  return sorted[below] + (position - below) * (sorted[above] - sorted[below]);
}

/**
 * The finite numbers of `values`, ascending, in a typed array of their own: the array
 * given is never reordered.
 *
 * A `Float64Array` sorts numerically with no comparator, in native code over unboxed
 * doubles: a hundred thousand values sort in about a quarter of the time
 * `number[].sort((a, b) => a - b)` takes, which calls back into script for every
 * comparison.
 *
 * @internal
 */
export function sortedFinite(values: ArrayLike<number>): Float64Array {
  const kept = new Float64Array(values.length);
  let count = 0;
  // An `ArrayLike` has an index and a length and no iterator.
  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (Number.isFinite(value)) kept[count++] = value;
  }
  return kept.subarray(0, count).sort();
}

/**
 * The summary a box plot draws for `values`: the quartiles by {@link quantile}, the
 * whiskers to the farthest value within 1.5 IQR of the box (Tukey's fences, inclusive),
 * and every value strictly past them as an outlier, ascending. Values that are not
 * finite numbers are left out; with none left, there is nothing to draw: `null`.
 *
 * A whisker never reaches INTO the box. Interpolated quartiles can sit past every value
 * on their side of the fence — 0, 100, 100, 100 has its first quartile at 75 and its
 * lowest value within the fence at 100 — so a whisker end on the wrong side of its
 * quartile is held at the quartile, as matplotlib holds it, and the whisker has no
 * length.
 *
 * One typed sort ({@link sortedFinite}) and two binary searches: the values inside the
 * fences are one run of the sorted array and the outliers the two runs either side of
 * it, so nothing is filtered a second and a third time.
 *
 * @internal
 */
export function boxplotStats(values: ArrayLike<number>): Required<WrBoxplotStats> | null {
  const sorted = sortedFinite(values);
  if (sorted.length === 0) return null;

  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const reach = FENCE * (q3 - q1);

  // The run inside the fences is never empty — the first value at or above the first
  // quartile lies within them for any count.
  const from = firstAtLeast(sorted, q1 - reach);
  const to = firstPast(sorted, q3 + reach);
  const min = Math.min(q1, sorted[from]);
  const max = Math.max(q3, sorted[to - 1]);

  const outliers = new Array<number>(from + sorted.length - to);
  for (let i = 0; i < from; i++) outliers[i] = sorted[i];
  for (let i = to; i < sorted.length; i++) outliers[from + i - to] = sorted[i];

  return { min, q1, median, q3, max, outliers };
}

/**
 * The outliers a group DRAWS, of its ascending `outliers`: every one up to a hundred on
 * each side of `median`, and past that a hundred of that side, evenly spread by rank,
 * with the farthest one and the one nearest the box always among them. The same input
 * draws the same dots.
 *
 * A dot is an element. A group of a million readings with a long tail has tens of
 * thousands of outliers, nearly all on the same few pixels: drawn one each they were
 * tens of thousands of elements for a line a hundred would draw. The extremes are kept
 * because they are what the axis is fitted to and what a reader looks for.
 *
 * @internal
 */
export function drawnOutliers(outliers: readonly number[], median: number, limit = DRAWN_PER_SIDE): readonly number[] {
  if (outliers.length <= limit) return outliers;
  let above = 0;
  while (above < outliers.length && outliers[above] < median) above++;
  if (above <= limit && outliers.length - above <= limit) return outliers;
  const drawn: number[] = [];
  sample(outliers, 0, above, limit, drawn);
  sample(outliers, above, outliers.length, limit, drawn);
  return drawn;
}
