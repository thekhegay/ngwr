import { describe, expect, it } from 'vitest';

import { chartAxis, niceStep } from './axis';

describe('niceStep', () => {
  it('climbs the 1 / 2 / 2.5 / 5 ladder at every magnitude', () => {
    expect([0.7, 1, 1.1, 2, 2.1, 2.5, 2.6, 5, 5.1].map(niceStep)).toEqual([1, 1, 2, 2, 2.5, 2.5, 5, 5, 10]);
    expect(niceStep(210)).toBe(250);
    expect(niceStep(0.0021)).toBeCloseTo(0.0025, 12);
  });

  it('answers 1 for a span it cannot divide', () => {
    expect([0, -3, Number.NaN, Number.POSITIVE_INFINITY].map(niceStep)).toEqual([1, 1, 1, 1]);
  });
});

describe('chartAxis', () => {
  it('snaps to a readable step and keeps the peak off the frame', () => {
    expect(chartAxis(0, 35)).toEqual({ min: 0, max: 40, step: 10, ticks: [40, 30, 20, 10, 0] });
    // 40 is a whole step: the peak would sit on the frame, so it is lifted.
    expect(chartAxis(0, 40).ticks).toEqual([50, 40, 30, 20, 10, 0]);
  });

  it('lists the ticks from the top down, rounded so a decimal step does not drift', () => {
    expect(chartAxis(0, 0.9).ticks).toEqual([1, 0.75, 0.5, 0.25, 0]);
    expect(chartAxis(0, 0.7).ticks).toEqual([0.8, 0.6, 0.4, 0.2, 0]);
  });

  it('gives a flat range a span instead of dividing by zero', () => {
    const flat = chartAxis(5, 5);
    expect(flat.step).toBeGreaterThan(0);
    expect(flat.ticks.every(Number.isFinite)).toBe(true);
    expect(chartAxis(0, 0)).toEqual({ min: 0, max: 0.25, step: 0.25, ticks: [0.25, 0] });
  });

  it('draws the empty frame for bounds that are not numbers', () => {
    const empty = { min: 0, max: 1, step: 0.25, ticks: [1, 0.75, 0.5, 0.25, 0] };
    expect(chartAxis(Math.min(), Math.max())).toEqual(empty);
    expect(chartAxis(Number.NaN, 3)).toEqual(empty);
  });

  it('swaps bounds handed in the wrong order', () => {
    expect(chartAxis(35, 0)).toEqual(chartAxis(0, 35));
  });

  it("is the line chart's axis when floored at zero by the caller", () => {
    // An all-negative series keeps an axis that ends just above its peak.
    expect(chartAxis(Math.min(0, -1050), -950).ticks).toEqual([-925, -950, -975, -1000, -1025, -1050]);
  });

  describe('includeZero', () => {
    it('reaches zero from either side', () => {
      expect(chartAxis(20, 35, { includeZero: true }).min).toBe(0);
      const negative = chartAxis(-35, -20, { includeZero: true });
      expect(negative.max).toBe(0);
      expect(negative.min).toBeLessThanOrEqual(-35);
    });

    it('does not lift a top that only zero sits on', () => {
      // No data reaches 0, so 0 is not a peak touching the frame.
      expect(chartAxis(-35, -20, { includeZero: true }).ticks).toEqual([0, -10, -20, -30, -40]);
      // Data that does reach it is lifted as usual.
      expect(chartAxis(-35, 0, { includeZero: true }).max).toBe(10);
    });

    it('spans a range that crosses zero as it was', () => {
      expect(chartAxis(-20, 40, { includeZero: true })).toEqual(chartAxis(-20, 40));
    });
  });

  describe('symmetric', () => {
    it('keeps data off the bottom frame as well as the top', () => {
      expect(chartAxis(10, 30).ticks).toEqual([35, 30, 25, 20, 15, 10]);
      expect(chartAxis(10, 30, { symmetric: true }).ticks).toEqual([35, 30, 25, 20, 15, 10, 5]);
    });

    it('centres a flat range on its value, as a tick of its own', () => {
      expect(chartAxis(5, 5, { symmetric: true })).toEqual({ min: 4, max: 6, step: 1, ticks: [6, 5, 4] });
      expect(chartAxis(0, 0, { symmetric: true })).toEqual({ min: -1, max: 1, step: 1, ticks: [1, 0, -1] });
      // Snapped outward instead, a lone 120 would sit on 100..150, two fifths of the way up.
      expect(chartAxis(120, 120, { symmetric: true }).ticks).toEqual([140, 120, 100]);
      expect(chartAxis(-120, -120, { symmetric: true }).ticks).toEqual([-100, -120, -140]);
    });

    it('takes the largest round step that divides a flat value, at most a quarter of it', () => {
      expect(chartAxis(0.3, 0.3, { symmetric: true }).ticks).toEqual([0.35, 0.3, 0.25]);
      expect(chartAxis(1234.5, 1234.5, { symmetric: true }).ticks).toEqual([1235, 1234.5, 1234]);
      // No rung divides a third within twelve decades, so it takes a quarter of itself.
      const third = chartAxis(1 / 3, 1 / 3, { symmetric: true });
      expect(third.step).toBeCloseTo(1 / 12, 12);
      expect(third.ticks[1]).toBe(1 / 3);
    });

    it('centres a flat range whatever tickCount asks for, and only when symmetric', () => {
      expect(chartAxis(5, 5, { symmetric: true, tickCount: 10 }).ticks).toEqual([6, 5, 4]);
      expect(chartAxis(120, 120)).toEqual({ min: 100, max: 150, step: 50, ticks: [150, 100] });
    });

    it('leaves a baseline from includeZero where it is', () => {
      expect(chartAxis(10, 30, { includeZero: true, symmetric: true }).min).toBe(0);
    });
  });

  it('aims for another number of gaps when asked', () => {
    expect(chartAxis(0, 100, { tickCount: 2 }).step).toBe(50);
    expect(chartAxis(0, 100, { tickCount: 10 }).step).toBe(10);
    // Nonsense falls back to four.
    expect(chartAxis(0, 100, { tickCount: 0 }).step).toBe(chartAxis(0, 100).step);
  });
});
