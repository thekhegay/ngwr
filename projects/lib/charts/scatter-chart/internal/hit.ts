/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** The most cells along one side of the grid: past it a cell is under half a percent of the drawing. */
const MAX_SIDE = 256;

const cellOf = (percent: number, side: number): number =>
  Math.min(side - 1, Math.max(0, Math.floor((percent / 100) * side)));

/** A point as the index needs it: where its centre is, and how far from it the pointer still reads it. */
export interface WrScatterHitPoint {
  /** Its centre, as percentages of the drawing's width from the left and height from the top. */
  readonly left: number;
  readonly top: number;
  /** How far from its centre the pointer still reads it, in px. */
  readonly reach: number;
}

/**
 * The points of a scatter chart, bucketed for {@link wrScatterHit}: a uniform grid over
 * the drawing in PERCENT, so it is built once per change to the points and survives every
 * resize, with each cell's points in one flat array.
 */
export interface WrScatterIndex {
  readonly columns: number;
  readonly rows: number;
  /** Where each cell's points start in `items`: cell `c` holds `items[starts[c]]` up to `items[starts[c + 1]]`. */
  readonly starts: Int32Array;
  /** The points' positions in the list the index was built from, cell by cell. */
  readonly items: Int32Array;
  readonly lefts: Float64Array;
  readonly tops: Float64Array;
  readonly reaches: Float64Array;
  /** The farthest any point reaches, in px: how far round the pointer a search has to look. */
  readonly reach: number;
}

/**
 * Buckets `points` into a grid of about one point a cell.
 *
 * Finding the point under the pointer by measuring every one cost 25 ms a move at a
 * hundred thousand points; a search that looks only in the cells the pointer can reach
 * looks at a few hundred of them.
 */
export function wrScatterIndex(points: readonly WrScatterHitPoint[]): WrScatterIndex {
  const count = points.length;
  const side = Math.min(MAX_SIDE, Math.max(1, Math.ceil(Math.sqrt(count))));
  const lefts = new Float64Array(count);
  const tops = new Float64Array(count);
  const reaches = new Float64Array(count);
  const cells = new Int32Array(count);
  const starts = new Int32Array(side * side + 1);
  let reach = 0;
  for (let i = 0; i < count; i++) {
    const point = points[i];
    lefts[i] = point.left;
    tops[i] = point.top;
    reaches[i] = point.reach;
    if (point.reach > reach) reach = point.reach;
    const cell = cellOf(point.top, side) * side + cellOf(point.left, side);
    cells[i] = cell;
    starts[cell + 1]++;
  }
  for (let cell = 0; cell < side * side; cell++) starts[cell + 1] += starts[cell];
  const items = new Int32Array(count);
  const next = starts.slice(0, side * side);
  for (let i = 0; i < count; i++) items[next[cells[i]]++] = i;
  return { columns: side, rows: side, starts, items, lefts, tops, reaches, reach };
}

/**
 * The point nearest a position in the drawing, among those whose reach takes it in, or
 * `null`: the position is in percent of the drawing, as the points are, and the drawing's
 * size in px turns the distance into the px a reach is measured in. Of two points equally
 * near, the one earlier in the list, as a scan of the whole list would answer.
 */
export function wrScatterHit(
  index: WrScatterIndex,
  left: number,
  top: number,
  width: number,
  height: number
): number | null {
  if (!(width > 0) || !(height > 0) || index.items.length === 0) return null;
  const { columns, rows, starts, items, lefts, tops, reaches } = index;
  const acrossReach = (index.reach / width) * 100;
  const downReach = (index.reach / height) * 100;
  const firstColumn = cellOf(left - acrossReach, columns);
  const lastColumn = cellOf(left + acrossReach, columns);
  const firstRow = cellOf(top - downReach, rows);
  const lastRow = cellOf(top + downReach, rows);
  let best: number | null = null;
  let nearest = Number.POSITIVE_INFINITY;
  for (let row = firstRow; row <= lastRow; row++) {
    for (let column = firstColumn; column <= lastColumn; column++) {
      const cell = row * columns + column;
      for (let k = starts[cell]; k < starts[cell + 1]; k++) {
        const i = items[k];
        const distance = Math.hypot(((lefts[i] - left) / 100) * width, ((tops[i] - top) / 100) * height);
        if (distance > reaches[i]) continue;
        if (distance < nearest || (distance === nearest && best !== null && i < best)) {
          nearest = distance;
          best = i;
        }
      }
    }
  }
  return best;
}
