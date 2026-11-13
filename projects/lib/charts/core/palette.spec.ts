import { describe, expect, it } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

import { WR_CHART_MARKERS, wrChartMarker, wrChartMarkerExtent, wrChartMarkerPath } from './markers';
import { WR_CHART_DASHES, WR_CHART_PALETTE, wrChartColor, wrChartDash } from './palette';

describe('WR_CHART_PALETTE', () => {
  it('is four intents and the neutral role, with no info', () => {
    expect(WR_CHART_PALETTE).toEqual([
      'var(--wr-color-primary)',
      'var(--wr-color-success)',
      'var(--wr-color-warning)',
      'var(--wr-color-danger)',
      'var(--wr-color-on-surface-muted)',
    ]);
  });

  it('paints only through tokens the theme declares', { timeout: COMPILE_TIMEOUT }, () => {
    // A token nothing declares is invalid at computed-value time, and the browser drops
    // the whole declaration holding it: a series would vanish without a word.
    const css = compileSass("@use 'theme/styles';");
    for (const color of WR_CHART_PALETTE) {
      const token = /var\((--wr-[a-z-]+)\)/.exec(color)?.[1] ?? '';
      expect(css, token).toMatch(new RegExp(`${token}:`));
    }
  });

  it('wraps past the end, and folds a negative or fractional index back in', () => {
    expect(wrChartColor(0)).toBe(WR_CHART_PALETTE[0]);
    expect(wrChartColor(WR_CHART_PALETTE.length)).toBe(WR_CHART_PALETTE[0]);
    expect(wrChartColor(WR_CHART_PALETTE.length + 2)).toBe(WR_CHART_PALETTE[2]);
    expect(wrChartColor(-1)).toBe(WR_CHART_PALETTE[WR_CHART_PALETTE.length - 1]);
    expect(wrChartColor(1.7)).toBe(WR_CHART_PALETTE[1]);
    expect(wrChartColor(Number.NaN)).toBe(WR_CHART_PALETTE[0]);
  });
});

describe('WR_CHART_DASHES', () => {
  it('starts solid, so a single series looks exactly as it always has', () => {
    expect(WR_CHART_DASHES[0]).toBe('');
    expect(wrChartDash(0)).toBe('');
  });

  it('gives every series up to the end of the list a pattern of its own', () => {
    expect(new Set(WR_CHART_DASHES).size).toBe(WR_CHART_DASHES.length);
    for (const dash of WR_CHART_DASHES.slice(1)) expect(dash).toMatch(/^\d+( \d+)+$/);
  });

  it('wraps past the end', () => {
    expect(wrChartDash(WR_CHART_DASHES.length + 1)).toBe(WR_CHART_DASHES[1]);
  });
});

/** Vertices of a polygon path `M x y L x y … Z`. */
function vertices(d: string): [number, number][] {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const out: [number, number][] = [];
  for (let i = 0; i < numbers.length; i += 2) out.push([numbers[i], numbers[i + 1]]);
  return out;
}

/** Shoelace area of a simple polygon. */
function area(points: readonly [number, number][]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

describe('WR_CHART_MARKERS', () => {
  it('starts with the circle and repeats no shape', () => {
    expect(WR_CHART_MARKERS[0]).toBe('circle');
    expect(new Set(WR_CHART_MARKERS).size).toBe(WR_CHART_MARKERS.length);
    expect(wrChartMarker(WR_CHART_MARKERS.length)).toBe('circle');
  });

  it('never puts a square beside the diamond it only rotates into', () => {
    for (let i = 0; i < WR_CHART_MARKERS.length; i++) {
      const pair = new Set([WR_CHART_MARKERS[i], WR_CHART_MARKERS[(i + 1) % WR_CHART_MARKERS.length]]);
      expect(pair.has('square') && pair.has('diamond'), `${[...pair].join(' / ')}`).toBe(false);
    }
  });
});

describe('wrChartMarkerPath', () => {
  const R = 10;

  it.each(WR_CHART_MARKERS.filter(shape => shape !== 'circle'))(
    'draws a %s with the area of the circle of the same size',
    shape => {
      expect(area(vertices(wrChartMarkerPath(shape, R))) / (Math.PI * R * R)).toBeCloseTo(1, 2);
    }
  );

  it('draws the circle as two arcs of that radius about the origin', () => {
    expect(wrChartMarkerPath('circle', R)).toBe('M -10 0 A 10 10 0 1 0 10 0 A 10 10 0 1 0 -10 0 Z');
  });

  it.each(WR_CHART_MARKERS.filter(shape => shape !== 'circle'))('centres a %s on the origin', shape => {
    // The centroid of the corners: a triangle on its centroid sits where a circle would.
    const points = vertices(wrChartMarkerPath(shape, R));
    const cx = points.reduce((s, [x]) => s + x, 0) / points.length;
    const cy = points.reduce((s, [, y]) => s + y, 0) / points.length;
    expect(Math.abs(cx)).toBeLessThan(0.01);
    expect(Math.abs(cy)).toBeLessThan(0.01);
  });

  it('points the two triangles opposite ways', () => {
    const up = vertices(wrChartMarkerPath('triangle', R));
    const down = vertices(wrChartMarkerPath('triangle-down', R));
    expect(up[0][1]).toBeLessThan(0);
    expect(down[0][1]).toBeGreaterThan(0);
  });

  it('draws nothing for a size that is not one', () => {
    for (const r of [0, -4, Number.NaN, Number.POSITIVE_INFINITY]) expect(wrChartMarkerPath('square', r)).toBe('');
  });

  it('writes short coordinates', () => {
    expect(wrChartMarkerPath('cross', 7)).not.toMatch(/\d\.\d{4,}/);
  });
});

describe('wrChartMarkerExtent', () => {
  const R = 10;

  it.each(WR_CHART_MARKERS.filter(shape => shape !== 'circle'))('reaches exactly as far as a %s is drawn', shape => {
    // Read off the corners the path itself draws, so a reshaped marker moves its extent.
    const points = vertices(wrChartMarkerPath(shape, R));
    const extent = wrChartMarkerExtent(shape, R);
    expect(extent.top).toBeCloseTo(-Math.min(...points.map(([, y]) => y)), 2);
    expect(extent.bottom).toBeCloseTo(Math.max(...points.map(([, y]) => y)), 2);
    expect(extent.side).toBeCloseTo(Math.max(...points.map(([x]) => Math.abs(x))), 2);
    expect(extent.radius).toBeCloseTo(Math.max(...points.map(([x, y]) => Math.hypot(x, y))), 2);
  });

  it('reaches the radius it is given for the circle', () => {
    expect(wrChartMarkerExtent('circle', R)).toEqual({ top: R, bottom: R, side: R, radius: R });
  });

  it('reaches past the radius for the shapes with points, which a box sized by r cuts off', () => {
    expect(wrChartMarkerExtent('triangle', R).top).toBeGreaterThan(1.5 * R);
    expect(wrChartMarkerExtent('diamond', R).radius).toBeGreaterThan(1.25 * R);
    expect(wrChartMarkerExtent('cross', R).radius).toBeGreaterThan(1.2 * R);
    expect(wrChartMarkerExtent('square', R).side).toBeLessThan(R);
  });

  it('reaches nowhere for a size that is not one', () => {
    for (const r of [0, -4, Number.NaN, Number.POSITIVE_INFINITY])
      expect(wrChartMarkerExtent('triangle', r)).toEqual({ top: 0, bottom: 0, side: 0, radius: 0 });
  });
});
