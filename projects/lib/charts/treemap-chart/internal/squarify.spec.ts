import { describe, expect, it } from 'vitest';

import { type WrTreemapRect, squarify } from './squarify';

/** Every coordinate to six decimals, so a layout worked by hand compares exactly. */
const rounded = (rects: readonly (WrTreemapRect | null)[]): (WrTreemapRect | null)[] =>
  rects.map(r =>
    r === null
      ? null
      : {
          x: Math.round(r.x * 1e6) / 1e6,
          y: Math.round(r.y * 1e6) / 1e6,
          width: Math.round(r.width * 1e6) / 1e6,
          height: Math.round(r.height * 1e6) / 1e6,
        }
  );

const box = (width: number, height: number, x = 0, y = 0): WrTreemapRect => ({ x, y, width, height });

/** The rectangles' areas, in order. */
const areas = (rects: readonly (WrTreemapRect | null)[]): number[] => rects.map(r => (r ? r.width * r.height : 0));

/** Whether two rectangles share any area, with a hair of room for floating point. */
const overlap = (a: WrTreemapRect, b: WrTreemapRect): boolean =>
  a.x < b.x + b.width - 1e-9 &&
  b.x < a.x + a.width - 1e-9 &&
  a.y < b.y + b.height - 1e-9 &&
  b.y < a.y + a.height - 1e-9;

describe('squarify', () => {
  it('gives a single value the whole box', () => {
    expect(squarify([7], box(300, 200, 10, 20))).toEqual([{ x: 10, y: 20, width: 300, height: 200 }]);
  });

  it('puts two equal values side by side in a box twice as wide as tall', () => {
    // Stacking them would make two 2:1 slabs; side by side they are two squares.
    expect(rounded(squarify([1, 1], box(2, 1)))).toEqual([
      { x: 0, y: 0, width: 1, height: 1 },
      { x: 1, y: 0, width: 1, height: 1 },
    ]);
  });

  it('cuts a square into four squares for four equal values', () => {
    // The first row is a column of two at the inline-start edge — a third would make it
    // worse — and what is left is a column the second row runs across the top of.
    expect(rounded(squarify([1, 1, 1, 1], box(2, 2)))).toEqual([
      { x: 0, y: 0, width: 1, height: 1 },
      { x: 0, y: 1, width: 1, height: 1 },
      { x: 1, y: 0, width: 1, height: 1 },
      { x: 1, y: 1, width: 1, height: 1 },
    ]);
  });

  it("lays out the paper's example, 6 6 4 3 2 2 1 in a 6 × 4 box, as worked by hand", () => {
    // Row 1, along the height of 4: [6, 6] scores 1.5 and adding the 4 makes it 4, so it is
    // a column 3 wide. Row 2, along the width of 3 that is left: [4, 3] scores 1.81 and
    // adding a 2 makes it 4.5, so it is a strip 7/3 deep. Row 3 and row 4, along the 5/3
    // that is left: a lone 2 scores 1.39 and a pair 2.88, so each is a column of one. The
    // 1 takes the rest.
    expect(rounded(squarify([6, 6, 4, 3, 2, 2, 1], box(6, 4)))).toEqual(
      rounded([
        { x: 0, y: 0, width: 3, height: 2 },
        { x: 0, y: 2, width: 3, height: 2 },
        { x: 3, y: 0, width: 12 / 7, height: 7 / 3 },
        { x: 3 + 12 / 7, y: 0, width: 9 / 7, height: 7 / 3 },
        { x: 3, y: 7 / 3, width: 1.2, height: 5 / 3 },
        { x: 4.2, y: 7 / 3, width: 1.2, height: 5 / 3 },
        { x: 5.4, y: 7 / 3, width: 0.6, height: 5 / 3 },
      ])
    );
  });

  it('starts at the inline-start top corner, wherever the box is', () => {
    const [first] = squarify([5, 3, 2], box(400, 100, 30, 40));
    expect(first).toMatchObject({ x: 30, y: 40 });
  });

  it('keeps the order it was given, sorted or not', () => {
    // The same three values in another order: each keeps its own area, at its own position.
    const sorted = squarify([60, 30, 10], box(10, 10));
    const shuffled = squarify([10, 60, 30], box(10, 10));
    expect(areas(sorted).map(a => Math.round(a))).toEqual([60, 30, 10]);
    expect(areas(shuffled).map(a => Math.round(a))).toEqual([10, 60, 30]);
  });

  it('gives every value an area in proportion to it, tiling the box exactly', () => {
    const values = [37, 21, 13, 8, 5, 3, 2, 1, 1];
    const total = values.reduce((sum, value) => sum + value, 0);
    const rects = squarify(values, box(640, 280));

    // Each area is its value's share of the box …
    rects.forEach((r, i) => expect((r!.width * r!.height) / (640 * 280)).toBeCloseTo(values[i] / total, 9));
    // … inside the box …
    for (const r of rects) {
      expect(r!.x).toBeGreaterThanOrEqual(-1e-9);
      expect(r!.y).toBeGreaterThanOrEqual(-1e-9);
      expect(r!.x + r!.width).toBeLessThanOrEqual(640 + 1e-9);
      expect(r!.y + r!.height).toBeLessThanOrEqual(280 + 1e-9);
    }
    // … and no two share any of it, so between them they cover it all.
    for (let a = 0; a < rects.length; a++) {
      for (let b = a + 1; b < rects.length; b++) expect(overlap(rects[a]!, rects[b]!)).toBe(false);
    }
  });

  it('keeps every rectangle squarer than slicing the box into strips would', () => {
    // Twelve equal values in a 4 × 3 box: strips would be 12:1, the squarified layout
    // never worse than 2:1.
    const rects = squarify(
      Array.from({ length: 12 }, () => 1),
      box(4, 3)
    );
    const ratios = rects.map(r => Math.max(r!.width / r!.height, r!.height / r!.width));
    expect(Math.max(...ratios)).toBeLessThanOrEqual(2);
  });

  it('gives no area to a value that is not a finite number above zero', () => {
    const rects = squarify([4, 0, -3, Number.NaN, Number.POSITIVE_INFINITY, 4], box(8, 4));
    expect(rects.slice(1, 5)).toEqual([null, null, null, null]);
    // The two that are left share the box as if the others were not there.
    expect(rounded([rects[0], rects[5]])).toEqual([
      { x: 0, y: 0, width: 4, height: 4 },
      { x: 4, y: 0, width: 4, height: 4 },
    ]);
  });

  it('places nothing in a box with no area, or when nothing has a value', () => {
    expect(squarify([1, 2], box(0, 100))).toEqual([null, null]);
    expect(squarify([1, 2], box(100, Number.NaN))).toEqual([null, null]);
    expect(squarify([0, 0], box(100, 100))).toEqual([null, null]);
    expect(squarify([], box(100, 100))).toEqual([]);
  });
});
