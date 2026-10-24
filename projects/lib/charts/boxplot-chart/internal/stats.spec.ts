import { describe, expect, it } from 'vitest';

import { boxplotStats, quantile } from './stats';

describe('quantile', () => {
  // R: quantile(1:10, c(.25, .5, .75), type = 7) → 3.25 5.5 7.75; NumPy's default and
  // Excel's QUARTILE.INC agree.
  it('interpolates between the two closest ranks, as R, NumPy and Excel do by default', () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect([0.25, 0.5, 0.75].map(p => quantile(sorted, p))).toEqual([3.25, 5.5, 7.75]);
  });

  it('lands on a value where the position is whole', () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    expect([0, 0.25, 0.5, 0.75, 1].map(p => quantile(sorted, p))).toEqual([1, 3, 5, 7, 9]);
  });

  it('takes the share of the way between two values that the position is past the first', () => {
    // Position 0.75 for the first quartile of four values: three quarters from 1 to 2.
    expect([0.25, 0.5, 0.75].map(p => quantile([1, 2, 3, 4], p))).toEqual([1.75, 2.5, 3.25]);
  });

  it('answers the value itself for one value', () => {
    expect([0, 0.25, 0.5, 1].map(p => quantile([7], p))).toEqual([7, 7, 7, 7]);
  });
});

describe('boxplotStats', () => {
  it('summarises values in any order, with no outliers inside the fences', () => {
    expect(boxplotStats([10, 4, 1, 7, 2, 9, 3, 6, 8, 5])).toEqual({
      min: 1,
      q1: 3.25,
      median: 5.5,
      q3: 7.75,
      max: 10,
      outliers: [],
    });
  });

  it('stops each whisker at the farthest value within 1.5 IQR and makes the rest outliers', () => {
    // 1..10 and 30: Q1 3.5, Q3 8.5, IQR 5, so the fences are -4 and 16.
    expect(boxplotStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 30])).toEqual({
      min: 1,
      q1: 3.5,
      median: 6,
      q3: 8.5,
      max: 10,
      outliers: [30],
    });
  });

  it('keeps a value exactly on a fence inside it, and lists the outliers ascending', () => {
    // Q1 2, Q3 4, IQR 2: the fences are -1 and 7, which 7 sits on.
    const stats = boxplotStats([50, 1, 2, 3, 4, 7, -20, 2, 4])!;
    expect([stats.q1, stats.q3]).toEqual([2, 4]);
    expect(stats.max).toBe(7);
    expect(stats.outliers).toEqual([-20, 50]);
  });

  it('holds a whisker at its quartile rather than reaching into the box', () => {
    // Q1 is 75, between 0 and 100; the fence is 37.5, so 0 is an outlier and the lowest
    // value inside it, 100, is above the quartile.
    expect(boxplotStats([0, 100, 100, 100])).toEqual({
      min: 75,
      q1: 75,
      median: 100,
      q3: 100,
      max: 100,
      outliers: [0],
    });
  });

  it('makes every other value an outlier once the box has no height', () => {
    expect(boxplotStats([5, 5, 5, 5, 9])).toEqual({ min: 5, q1: 5, median: 5, q3: 5, max: 5, outliers: [9] });
  });

  it('summarises one value, and two', () => {
    expect(boxplotStats([3])).toEqual({ min: 3, q1: 3, median: 3, q3: 3, max: 3, outliers: [] });
    expect(boxplotStats([0, 100])).toEqual({ min: 0, q1: 25, median: 50, q3: 75, max: 100, outliers: [] });
  });

  it('leaves out what is not a finite number, and answers nothing when that is everything', () => {
    expect(boxplotStats([Number.NaN, 2, Number.POSITIVE_INFINITY, 4, Number.NEGATIVE_INFINITY])).toEqual({
      min: 2,
      q1: 2.5,
      median: 3,
      q3: 3.5,
      max: 4,
      outliers: [],
    });
    expect(boxplotStats([Number.NaN])).toBeNull();
    expect(boxplotStats([])).toBeNull();
  });

  it('never reorders the array it is given', () => {
    const values = [3, 1, 2];
    boxplotStats(values);
    expect(values).toEqual([3, 1, 2]);
  });
});
