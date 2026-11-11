import { describe, expect, it } from 'vitest';

import { wrClamp } from './clamp';
import { wrRound } from './round';

describe('wrRound', () => {
  it('rounds to whole numbers by default', () => {
    expect(wrRound(2.4)).toBe(2);
    expect(wrRound(2.5)).toBe(3);
    expect(wrRound(-2.5)).toBe(-2);
  });

  it('rounds to a number of decimals', () => {
    expect(wrRound(3.14159, 2)).toBe(3.14);
    expect(wrRound(3.14159, 4)).toBe(3.1416);
  });

  it('corrects the float representation that trips plain Math.round', () => {
    // 1.005 * 100 is 100.49999999999999 in binary floating point, so a naive
    // Math.round(x * 100) / 100 gives 1 — the epsilon nudge is why this is 1.01.
    expect(wrRound(1.005, 2)).toBe(1.01);
    expect(wrRound(1.255, 2)).toBe(1.26);
  });
});

describe('wrClamp', () => {
  it('passes values inside the range through', () => {
    expect(wrClamp(5, 0, 10)).toBe(5);
  });

  it('clamps to each bound', () => {
    expect(wrClamp(-1, 0, 10)).toBe(0);
    expect(wrClamp(11, 0, 10)).toBe(10);
  });

  it('lets max win when the bounds are inverted', () => {
    expect(wrClamp(5, 10, 0)).toBe(0);
  });
});
