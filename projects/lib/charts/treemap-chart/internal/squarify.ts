/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * A rectangle in the layout's own units: `x` from the inline-start edge, `y` from the
 * top. The treemap chart lays out in pixels and draws in percentages of its plot.
 *
 * @internal
 */
interface WrTreemapRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One value to place, by its position in the caller's list, with its share of the box as an area. */
interface Item {
  readonly index: number;
  readonly area: number;
}

/**
 * The worst aspect ratio in a row of `items[start..end)` laid along a side `side` long,
 * `sum` being their total area: the row is `sum / side` deep, and each item as long as
 * its area over that depth. The ratio is the longer side over the shorter, so a square
 * scores 1 and every other shape more.
 */
function worst(items: readonly Item[], start: number, end: number, sum: number, side: number): number {
  let largest = 0;
  let smallest = Number.POSITIVE_INFINITY;
  for (let k = start; k < end; k++) {
    largest = Math.max(largest, items[k].area);
    smallest = Math.min(smallest, items[k].area);
  }
  const s2 = sum * sum;
  const w2 = side * side;
  return Math.max((w2 * largest) / s2, s2 / (w2 * smallest));
}

/**
 * Cuts `box` into one rectangle per value, each with an area in proportion to its value,
 * by the squarified algorithm — Bruls, Huizing and van Wijk, "Squarified Treemaps"
 * (2000) — which keeps every rectangle as close to a square as it can, so that areas are
 * easy to compare and labels have room.
 *
 * The values are placed IN THE ORDER GIVEN, and the result is in that order too: the
 * algorithm assumes the largest first, so sort them descending for the squarest result.
 * It fills the box in rows. A row runs along the shorter side of the space still free,
 * starting at its inline-start or top edge, and takes values while adding one does not
 * make its worst aspect ratio worse; then it is fixed, and the space beyond it is the
 * next row's. So the first value sits in the inline-start top corner — mirrored with the
 * writing direction when the caller positions by `inset-inline-start`.
 *
 * The last rectangle of every row, and the whole of the last row, take what is left of
 * the space exactly, so floating point leaves no hairline uncovered: the rectangles tile
 * the box with nothing over and nothing under.
 *
 * A value that is not a finite number above zero has no area and gets `null`, as does
 * every value when the box has no area or nothing has a value.
 *
 * @example
 * ```ts
 * squarify([1, 1], { x: 0, y: 0, width: 2, height: 1 });
 * // [{ x: 0, y: 0, width: 1, height: 1 }, { x: 1, y: 0, width: 1, height: 1 }]
 * ```
 *
 * @internal
 */
export function squarify(values: readonly number[], box: WrTreemapRect): (WrTreemapRect | null)[] {
  const out: (WrTreemapRect | null)[] = values.map(() => null);
  const positive = values.flatMap((value, index) => (Number.isFinite(value) && value > 0 ? [{ index, value }] : []));
  const total = positive.reduce((sum, item) => sum + item.value, 0);
  if (positive.length === 0 || !(total > 0) || !(box.width > 0) || !(box.height > 0)) return out;

  const scale = (box.width * box.height) / total;
  const items: Item[] = positive.map(({ index, value }) => ({ index, area: value * scale }));

  let { x, y, width, height } = box;
  let start = 0;
  while (start < items.length) {
    const side = Math.min(width, height);
    // Grow the row while the next value does not make its worst ratio worse.
    let end = start + 1;
    let sum = items[start].area;
    let ratio = worst(items, start, end, sum, side);
    while (end < items.length) {
      const next = worst(items, start, end + 1, sum + items[end].area, side);
      if (next > ratio) break;
      ratio = next;
      sum += items[end].area;
      end++;
    }

    const last = end === items.length;
    if (width >= height) {
      // The shorter side is the height: the row is a column at the inline-start edge.
      const depth = last ? width : Math.min(width, sum / height);
      let top = y;
      for (let k = start; k < end; k++) {
        const length = k === end - 1 ? y + height - top : items[k].area / depth;
        out[items[k].index] = { x, y: top, width: depth, height: length };
        top += length;
      }
      x += depth;
      width = Math.max(0, width - depth);
    } else {
      // The shorter side is the width: the row is a strip along the top.
      const depth = last ? height : Math.min(height, sum / width);
      let left = x;
      for (let k = start; k < end; k++) {
        const length = k === end - 1 ? x + width - left : items[k].area / depth;
        out[items[k].index] = { x: left, y, width: length, height: depth };
        left += length;
      }
      y += depth;
      height = Math.max(0, height - depth);
    }
    start = end;
  }
  return out;
}

export type { WrTreemapRect };
