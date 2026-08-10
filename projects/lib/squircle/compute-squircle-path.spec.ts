import { describe, expect, it } from 'vitest';

import { squirclePath, type WrSquircleCorners } from './compute-squircle-path';

const all = (r: number): WrSquircleCorners => ({ topLeft: r, topRight: r, bottomRight: r, bottomLeft: r });

/** Every coordinate in a path `d`, in order. */
const numbers = (d: string): number[] => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

/**
 * Property tests, not a re-implementation. The algorithm is a port of
 * `figma-squircle`, and asserting the exact control points would only restate it —
 * what a consumer actually depends on is that the result is a CLOSED path, made of
 * finite numbers, that stays inside the box it was asked for. Those three hold for
 * every input, including the ones that overflow.
 */
describe('squirclePath', () => {
  it('draws a closed path', () => {
    const d = squirclePath(200, 100, all(16), 1);
    expect(d.startsWith('M')).toBe(true);
    expect(d.trim().endsWith('Z')).toBe(true);
  });

  it('never emits a coordinate that is not a number', () => {
    for (const [w, h, r, s] of [
      [200, 100, 16, 1],
      [1, 1, 0.5, 1],
      [200, 100, 0, 0],
      [50, 50, 25, 0.5],
    ] as const) {
      const d = squirclePath(w, h, all(r), s);
      expect(d, `${w}×${h} r${r} s${s}`).not.toContain('NaN');
      expect(numbers(d).every(Number.isFinite)).toBe(true);
    }
  });

  it('caps a radius bigger than the box at half its shorter side', () => {
    // The classic overflow: a 40px radius on a 20px box. The budget is half the
    // shorter dimension, so anything past it has to draw the SAME shape rather
    // than a corner that leaves the element it is clipping.
    expect(squirclePath(20, 20, all(40), 1)).toBe(squirclePath(20, 20, all(10), 1));
    expect(squirclePath(200, 20, all(999), 1)).toBe(squirclePath(200, 20, all(10), 1));
  });

  it('degenerates to a plain rectangle at radius zero', () => {
    // Corner segments are dropped entirely rather than emitted with zero length.
    expect(squirclePath(200, 100, all(0), 1)).toBe('M 0 0 L 200 0 L 200 100 L 0 100 L 0 0 Z');
  });

  it('spends the corner on an arc without smoothing and on curves with it', () => {
    // The whole point of the component. Every corner emits both an arc and two
    // curves; what smoothing moves is how much of the corner each one covers, and
    // the arc's own sweep is the readable end of that: the full radius at
    // smoothing 0, nothing at all at smoothing 1.
    const arcSweep = (d: string): number[] =>
      numbers(/a [\d.]+ [\d.]+ 0 0 1 (-?[\d.]+) (-?[\d.]+)/.exec(d)!.slice(1).join(' '));

    expect(arcSweep(squirclePath(200, 100, all(20), 0))[0]).toBeCloseTo(20, 5);
    expect(arcSweep(squirclePath(200, 100, all(20), 1))[0]).toBeCloseTo(0, 5);
  });

  it('rounds only the corners it was given', () => {
    // A square corner puts the path exactly on the box corner; a rounded one
    // never does. This is what `corners="left"` on a segmented control relies on.
    const leftOnly: WrSquircleCorners = { topLeft: 20, topRight: 0, bottomRight: 0, bottomLeft: 20 };
    const d = squirclePath(200, 100, leftOnly, 1);

    expect(d).toContain('L 200 0');
    expect(d).toContain('L 200 100');
    expect(squirclePath(200, 100, all(20), 1)).not.toContain('L 200 0');
  });

  it('scales with the box, not with a fixed grid', () => {
    const small = squirclePath(100, 100, all(10), 1);
    const large = squirclePath(400, 400, all(10), 1);

    expect(small).not.toBe(large);
    expect(Math.max(...numbers(small))).toBeLessThanOrEqual(100);
    expect(Math.max(...numbers(large))).toBeLessThanOrEqual(400);
  });

  it('handles a box with no area rather than dividing by it', () => {
    for (const d of [squirclePath(0, 100, all(8), 1), squirclePath(100, 0, all(8), 1)]) {
      expect(d).not.toContain('NaN');
      expect(d).not.toContain('Infinity');
    }
  });
});
