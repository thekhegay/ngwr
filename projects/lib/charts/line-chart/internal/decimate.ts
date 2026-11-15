/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** How many points a pixel column holds before a series is decimated. */
const DENSITY = 2;

/** What separates two unbroken runs in the list {@link wrLineChartKeep} returns. */
export const WR_LINE_CHART_BREAK = -1;

/**
 * Which points of a series are drawn, as positions in `values`, in order, with
 * {@link WR_LINE_CHART_BREAK} between two unbroken runs: a hole (`null`) breaks the line
 * and is never drawn across.
 *
 * `columns` is how many pixel columns the drawing is wide. While the series has at most
 * two points a column every point is kept. Past that, each column keeps four at the
 * most: the first point in it, the lowest, the highest and the last, in the order they
 * come. A screen cannot show more than that of a column - every stroke inside it lands
 * on the same pixels between its lowest and its highest point - so the line drawn is the
 * one the whole series drew, at a fraction of the path: ten thousand points on a 560px
 * drawing were ten thousand segments, 350 KB of `d` for one series, rebuilt on every
 * data tick. The global minimum and maximum, the first point and the last always
 * survive, since each is the extreme or the end of its own column. A hole starts a new
 * run, and a column is flushed at it, so a gap in the data is still a gap in the line.
 *
 * `columns` at 0 or less - a caller that wants no decimation - keeps every point.
 *
 * @internal
 */
export function wrLineChartKeep(values: readonly (number | null)[], columns: number): number[] {
  const count = values.length;
  const cols = Math.floor(columns);
  const every = !(cols > 0) || count <= cols * DENSITY;
  const kept: number[] = [];

  let column = -1;
  let first = -1;
  let low = -1;
  let high = -1;
  let last = -1;

  const flush = (): void => {
    if (first < 0) return;
    kept.push(first);
    const early = Math.min(low, high);
    const late = Math.max(low, high);
    if (early !== first && early !== last) kept.push(early);
    if (late !== early && late !== first && late !== last) kept.push(late);
    if (last !== first) kept.push(last);
    first = -1;
  };

  for (let i = 0; i < count; i++) {
    const value = values[i];
    if (value === null) {
      flush();
      column = -1;
      if (kept.length > 0 && kept[kept.length - 1] !== WR_LINE_CHART_BREAK) kept.push(WR_LINE_CHART_BREAK);
      continue;
    }
    if (every) {
      kept.push(i);
      continue;
    }
    const at = Math.min(cols - 1, Math.floor((i * cols) / count));
    if (at !== column) {
      flush();
      column = at;
      first = low = high = last = i;
      continue;
    }
    if (value < values[low]!) low = i;
    if (value > values[high]!) high = i;
    last = i;
  }
  flush();
  if (kept[kept.length - 1] === WR_LINE_CHART_BREAK) kept.pop();
  return kept;
}

/**
 * Whether the points of a series of `count` sit closer together than `spacing` px on a
 * drawing `width` px wide: where a dot per point stops being dots. Each dot is as wide
 * as a marker, so once the points are closer than that the dots touch, and a row of
 * touching dots is a thicker line that hides the one under it.
 *
 * @internal
 */
export function wrLineChartCrowded(count: number, width: number, spacing: number): boolean {
  return count > 1 && width > 0 && width / (count - 1) < spacing;
}
