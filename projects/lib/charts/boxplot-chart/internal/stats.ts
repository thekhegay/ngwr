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
export function quantile(sorted: readonly number[], p: number): number {
  const position = (sorted.length - 1) * p;
  const below = Math.floor(position);
  const above = Math.ceil(position);
  return sorted[below] + (position - below) * (sorted[above] - sorted[below]);
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
 * @internal
 */
export function boxplotStats(values: readonly number[]): Required<WrBoxplotStats> | null {
  const sorted = values.filter(value => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;

  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const reach = FENCE * (q3 - q1);
  const low = q1 - reach;
  const high = q3 + reach;

  const inside = sorted.filter(value => value >= low && value <= high);
  // Never empty — the first value at or above the first quartile lies within the fences
  // for any count — so the fallbacks are there for the type checker alone.
  const min = Math.min(q1, inside[0] ?? q1);
  const max = Math.max(q3, inside.at(-1) ?? q3);
  const outliers = sorted.filter(value => value < low || value > high);

  return { min, q1, median, q3, max, outliers };
}
