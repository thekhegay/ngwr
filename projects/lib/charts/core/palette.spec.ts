import { createRequire } from 'node:module';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CHART_MARKERS, chartMarker, chartMarkerExtent, chartMarkerPath } from './markers';
import { CHART_DASHES, CHART_PALETTE, chartColor, chartDash } from './palette';

/** `sass`, resolved through `@angular/build` as `charts/stylesheets.spec.ts` does. */
const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as {
  compileString(source: string, options: { loadPaths: string[] }): { css: string };
};

describe('CHART_PALETTE', () => {
  it('is four intents and the neutral role, with no info', () => {
    expect(CHART_PALETTE).toEqual([
      'var(--wr-color-primary)',
      'var(--wr-color-success)',
      'var(--wr-color-warning)',
      'var(--wr-color-danger)',
      'var(--wr-color-on-surface-muted)',
    ]);
  });

  it('paints only through tokens the theme declares', () => {
    // A token nothing declares is invalid at computed-value time, and the browser drops
    // the whole declaration holding it: a series would vanish without a word.
    const css = sass.compileString("@use 'theme/styles';", { loadPaths: [join(process.cwd(), 'projects/lib')] }).css;
    for (const color of CHART_PALETTE) {
      const token = /var\((--wr-[a-z-]+)\)/.exec(color)?.[1] ?? '';
      expect(css, token).toMatch(new RegExp(`${token}:`));
    }
  });

  it('wraps past the end, and folds a negative or fractional index back in', () => {
    expect(chartColor(0)).toBe(CHART_PALETTE[0]);
    expect(chartColor(CHART_PALETTE.length)).toBe(CHART_PALETTE[0]);
    expect(chartColor(CHART_PALETTE.length + 2)).toBe(CHART_PALETTE[2]);
    expect(chartColor(-1)).toBe(CHART_PALETTE[CHART_PALETTE.length - 1]);
    expect(chartColor(1.7)).toBe(CHART_PALETTE[1]);
    expect(chartColor(Number.NaN)).toBe(CHART_PALETTE[0]);
  });
});

describe('CHART_DASHES', () => {
  it('starts solid, so a single series looks exactly as it always has', () => {
    expect(CHART_DASHES[0]).toBe('');
    expect(chartDash(0)).toBe('');
  });

  it('gives every series up to the end of the list a pattern of its own', () => {
    expect(new Set(CHART_DASHES).size).toBe(CHART_DASHES.length);
    for (const dash of CHART_DASHES.slice(1)) expect(dash).toMatch(/^\d+( \d+)+$/);
  });

  it('wraps past the end', () => {
    expect(chartDash(CHART_DASHES.length + 1)).toBe(CHART_DASHES[1]);
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

describe('CHART_MARKERS', () => {
  it('starts with the circle and repeats no shape', () => {
    expect(CHART_MARKERS[0]).toBe('circle');
    expect(new Set(CHART_MARKERS).size).toBe(CHART_MARKERS.length);
    expect(chartMarker(CHART_MARKERS.length)).toBe('circle');
  });

  it('never puts a square beside the diamond it only rotates into', () => {
    for (let i = 0; i < CHART_MARKERS.length; i++) {
      const pair = new Set([CHART_MARKERS[i], CHART_MARKERS[(i + 1) % CHART_MARKERS.length]]);
      expect(pair.has('square') && pair.has('diamond'), `${[...pair].join(' / ')}`).toBe(false);
    }
  });
});

describe('chartMarkerPath', () => {
  const R = 10;

  it.each(CHART_MARKERS.filter(shape => shape !== 'circle'))(
    'draws a %s with the area of the circle of the same size',
    shape => {
      expect(area(vertices(chartMarkerPath(shape, R))) / (Math.PI * R * R)).toBeCloseTo(1, 2);
    }
  );

  it('draws the circle as two arcs of that radius about the origin', () => {
    expect(chartMarkerPath('circle', R)).toBe('M -10 0 A 10 10 0 1 0 10 0 A 10 10 0 1 0 -10 0 Z');
  });

  it.each(CHART_MARKERS.filter(shape => shape !== 'circle'))('centres a %s on the origin', shape => {
    // The centroid of the corners: a triangle on its centroid sits where a circle would.
    const points = vertices(chartMarkerPath(shape, R));
    const cx = points.reduce((s, [x]) => s + x, 0) / points.length;
    const cy = points.reduce((s, [, y]) => s + y, 0) / points.length;
    expect(Math.abs(cx)).toBeLessThan(0.01);
    expect(Math.abs(cy)).toBeLessThan(0.01);
  });

  it('points the two triangles opposite ways', () => {
    const up = vertices(chartMarkerPath('triangle', R));
    const down = vertices(chartMarkerPath('triangle-down', R));
    expect(up[0][1]).toBeLessThan(0);
    expect(down[0][1]).toBeGreaterThan(0);
  });

  it('draws nothing for a size that is not one', () => {
    for (const r of [0, -4, Number.NaN, Number.POSITIVE_INFINITY]) expect(chartMarkerPath('square', r)).toBe('');
  });

  it('writes short coordinates', () => {
    expect(chartMarkerPath('cross', 7)).not.toMatch(/\d\.\d{4,}/);
  });
});

describe('chartMarkerExtent', () => {
  const R = 10;

  it.each(CHART_MARKERS.filter(shape => shape !== 'circle'))('reaches exactly as far as a %s is drawn', shape => {
    // Read off the corners the path itself draws, so a reshaped marker moves its extent.
    const points = vertices(chartMarkerPath(shape, R));
    const extent = chartMarkerExtent(shape, R);
    expect(extent.top).toBeCloseTo(-Math.min(...points.map(([, y]) => y)), 2);
    expect(extent.bottom).toBeCloseTo(Math.max(...points.map(([, y]) => y)), 2);
    expect(extent.side).toBeCloseTo(Math.max(...points.map(([x]) => Math.abs(x))), 2);
    expect(extent.radius).toBeCloseTo(Math.max(...points.map(([x, y]) => Math.hypot(x, y))), 2);
  });

  it('reaches the radius it is given for the circle', () => {
    expect(chartMarkerExtent('circle', R)).toEqual({ top: R, bottom: R, side: R, radius: R });
  });

  it('reaches past the radius for the shapes with points, which a box sized by r cuts off', () => {
    expect(chartMarkerExtent('triangle', R).top).toBeGreaterThan(1.5 * R);
    expect(chartMarkerExtent('diamond', R).radius).toBeGreaterThan(1.25 * R);
    expect(chartMarkerExtent('cross', R).radius).toBeGreaterThan(1.2 * R);
    expect(chartMarkerExtent('square', R).side).toBeLessThan(R);
  });

  it('reaches nowhere for a size that is not one', () => {
    for (const r of [0, -4, Number.NaN, Number.POSITIVE_INFINITY])
      expect(chartMarkerExtent('triangle', r)).toEqual({ top: 0, bottom: 0, side: 0, radius: 0 });
  });
});
