import { describe, expect, it } from 'vitest';

import { hslToRgb } from './hsl-to-rgb';
import { hsvToRgb } from './hsv-to-rgb';
import { parseHex } from './parse-hex';
import { rgbToHsl } from './rgb-to-hsl';
import { rgbToHsv } from './rgb-to-hsv';
import { toHex } from './to-hex';

/**
 * Pure colour maths, so the assertions can be exact — and the round trips are
 * the point. Every one of these conversions is lossy in the middle (hue is
 * undefined for grey, saturation is undefined for black), and a formula that is
 * merely close enough shows up as a picker whose handle drifts a little further
 * from the swatch on every drag.
 *
 * Note the scale, which is where most colour code goes wrong when it meets
 * another library: `h` is degrees in `[0, 360)`, but `s`, `l`, `v` and `a` are
 * all FRACTIONS in `[0, 1]` — not percentages. White is `l = 1`, not `l = 100`.
 */
describe('parseHex', () => {
  it('reads the long form, with or without the hash', () => {
    expect(parseHex('#ff8800')).toEqual({ r: 255, g: 136, b: 0, a: 1 });
    expect(parseHex('ff8800')).toEqual({ r: 255, g: 136, b: 0, a: 1 });
  });

  it('expands the shorthand by doubling each digit', () => {
    // `#f80` is `#ff8800`, not `#f08000` — doubling, not padding.
    expect(parseHex('#f80')).toEqual({ r: 255, g: 136, b: 0, a: 1 });
  });

  it('reads the alpha channel, long and short', () => {
    expect(parseHex('#ff880080')?.a).toBeCloseTo(128 / 255, 5);
    expect(parseHex('#f808')?.a).toBeCloseTo(136 / 255, 5);
  });

  it('defaults alpha to fully opaque when none is given', () => {
    expect(parseHex('#000')?.a).toBe(1);
  });

  it('ignores case and surrounding whitespace', () => {
    expect(parseHex('  #FF8800  ')).toEqual({ r: 255, g: 136, b: 0, a: 1 });
  });

  it('returns null for anything that is not a hex colour', () => {
    // Null rather than a throw or a black fallback: the caller is usually a
    // text field mid-typing, where "not yet valid" is the normal state and a
    // silent black would overwrite what the user is still writing.
    for (const bad of ['', '#', 'nope', '#12', '#12345', '#1234567', '#gg8800', '#ff88zz']) {
      expect(parseHex(bad)).toBeNull();
    }
  });
});

describe('toHex', () => {
  it('pads each channel to two digits', () => {
    // `#010203`, never `#123` — a one-digit channel would silently re-read as a
    // different colour.
    expect(toHex({ r: 1, g: 2, b: 3, a: 1 })).toBe('#010203');
  });

  it('leaves alpha out unless it is asked for', () => {
    expect(toHex({ r: 255, g: 136, b: 0, a: 0.5 })).toBe('#ff8800');
    expect(toHex({ r: 255, g: 136, b: 0, a: 1 }, true)).toBe('#ff8800ff');
  });

  it('writes alpha as a byte', () => {
    expect(toHex({ r: 0, g: 0, b: 0, a: 0 }, true)).toBe('#00000000');
    expect(toHex({ r: 0, g: 0, b: 0, a: 0.5 }, true).slice(7)).toBe('80');
  });

  it('round-trips with parseHex', () => {
    for (const hex of ['#000000', '#ffffff', '#ff8800', '#123456', '#0a0b0c']) {
      expect(toHex(parseHex(hex)!)).toBe(hex);
    }
  });
});

describe('rgb / hsl', () => {
  it('places the primaries at the right hues', () => {
    expect(rgbToHsl({ r: 255, g: 0, b: 0, a: 1 }).h).toBeCloseTo(0, 1);
    expect(rgbToHsl({ r: 0, g: 255, b: 0, a: 1 }).h).toBeCloseTo(120, 1);
    expect(rgbToHsl({ r: 0, g: 0, b: 255, a: 1 }).h).toBeCloseTo(240, 1);
  });

  it('reports grey as unsaturated, whatever its hue', () => {
    const grey = rgbToHsl({ r: 128, g: 128, b: 128, a: 1 });
    expect(grey.s).toBeCloseTo(0, 5);
    expect(grey.l).toBeCloseTo(128 / 255, 3);
  });

  it('puts black and white at the ends of lightness', () => {
    expect(rgbToHsl({ r: 0, g: 0, b: 0, a: 1 }).l).toBeCloseTo(0, 5);
    expect(rgbToHsl({ r: 255, g: 255, b: 255, a: 1 }).l).toBeCloseTo(1, 5);
  });

  it('carries alpha through untouched', () => {
    expect(rgbToHsl({ r: 10, g: 20, b: 30, a: 0.25 }).a).toBe(0.25);
    expect(hslToRgb({ h: 200, s: 0.5, l: 0.5, a: 0.25 }).a).toBe(0.25);
  });

  it('round-trips rgb → hsl → rgb', () => {
    for (const rgb of [
      { r: 255, g: 136, b: 0, a: 1 },
      { r: 18, g: 52, b: 86, a: 1 },
      { r: 0, g: 0, b: 0, a: 1 },
      { r: 255, g: 255, b: 255, a: 1 },
      { r: 128, g: 128, b: 128, a: 1 },
    ]) {
      const back = hslToRgb(rgbToHsl(rgb));
      expect([back.r, back.g, back.b]).toEqual([rgb.r, rgb.g, rgb.b]);
    }
  });
});

describe('rgb / hsv', () => {
  it('places the primaries at the right hues', () => {
    expect(rgbToHsv({ r: 255, g: 0, b: 0, a: 1 }).h).toBeCloseTo(0, 1);
    expect(rgbToHsv({ r: 0, g: 255, b: 0, a: 1 }).h).toBeCloseTo(120, 1);
    expect(rgbToHsv({ r: 0, g: 0, b: 255, a: 1 }).h).toBeCloseTo(240, 1);
  });

  it('separates value from lightness — pure red is full value, half lightness', () => {
    // The distinction the saturation/value square is built on: a fully
    // saturated primary is at FULL value in HSV and only HALF lightness in HSL.
    expect(rgbToHsv({ r: 255, g: 0, b: 0, a: 1 }).v).toBeCloseTo(1, 5);
    expect(rgbToHsl({ r: 255, g: 0, b: 0, a: 1 }).l).toBeCloseTo(0.5, 5);
  });

  it('reports black as zero value and white as zero saturation', () => {
    expect(rgbToHsv({ r: 0, g: 0, b: 0, a: 1 }).v).toBeCloseTo(0, 5);
    expect(rgbToHsv({ r: 255, g: 255, b: 255, a: 1 }).s).toBeCloseTo(0, 5);
  });

  it('round-trips rgb → hsv → rgb', () => {
    for (const rgb of [
      { r: 255, g: 136, b: 0, a: 1 },
      { r: 18, g: 52, b: 86, a: 1 },
      { r: 0, g: 0, b: 0, a: 1 },
      { r: 255, g: 255, b: 255, a: 1 },
      { r: 7, g: 7, b: 7, a: 1 },
    ]) {
      const back = hsvToRgb(rgbToHsv(rgb));
      expect([back.r, back.g, back.b]).toEqual([rgb.r, rgb.g, rgb.b]);
    }
  });

  it('survives the full hue circle without drifting', () => {
    // The HUE itself has to come back, not just saturation and value: shifting a
    // sextant boundary swaps which channel carries the chroma, which leaves
    // s and v at 1 and moves the colour — a seam in the hue slider that a
    // round trip on s / v alone cannot see.
    for (let h = 0; h < 360; h += 15) {
      const back = rgbToHsv(hsvToRgb({ h, s: 1, v: 1, a: 1 }));
      expect(back.s).toBeCloseTo(1, 5);
      expect(back.v).toBeCloseTo(1, 5);
      expect(back.h).toBeCloseTo(h, 0);
    }

    // 0 and 360 are the same colour, and the wrap must land on 0 rather than
    // running off the end.
    expect(rgbToHsv(hsvToRgb({ h: 360, s: 1, v: 1, a: 1 })).h % 360).toBeCloseTo(0, 5);
  });
});
