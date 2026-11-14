import { describe, expect, it } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../../spec-sass';

import { WR_CHART_LEGACY_PALETTE, WR_CHART_PALETTE, wrChartColor, wrChartLegacyColor } from './palette';

/**
 * The chart theme, read off the COMPILED sheet: what each `--wr-chart-*` token is
 * declared as, and what the colours measure against the surface a chart sits on. The
 * arithmetic is WCAG's relative luminance on the declared values; that a browser paints
 * them is `check:contrast`'s to say.
 */
const css = (): string => compileSass("@use 'theme'; @use 'charts/core/styles';").replace(/\/\*[\s\S]*?\*\//g, '');

/** The `:root` declarations outside any at-rule, first one wins: the defaults. */
function tokens(sheet: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const block of sheet.matchAll(/(?:^|\n):root\s*\{([^}]*)\}/g)) {
    for (const [, name, value] of block[1].matchAll(/(--wr-[a-z0-9-]+):\s*([^;]+);/g)) {
      if (!out.has(name)) out.set(name, value.trim().replace(/\s+/g, ' '));
    }
  }
  return out;
}

/** A token's colour in one scheme, as a hex: `var()` followed, `light-dark()` picked. */
function resolve(map: Map<string, string>, value: string, scheme: 'light' | 'dark'): string {
  let current = value;
  for (let hop = 0; hop < 12; hop++) {
    const pair = /^light-dark\((.+),\s*([^,]+)\)$/.exec(current);
    if (pair) current = (scheme === 'light' ? pair[1] : pair[2]).trim();
    const reference = /^var\((--wr-[a-z0-9-]+)\)$/.exec(current);
    if (!reference) break;
    current = map.get(reference[1]) ?? '';
  }
  return current;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map(at => Number.parseInt(hex.slice(at, at + 2), 16) / 255);
  const [r, g, b] = channels.map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('the chart theme', { timeout: COMPILE_TIMEOUT }, () => {
  it('declares every token once on :root, each on a role, a space or a length', () => {
    const map = tokens(css());
    const declared = (name: string): string | undefined => map.get(`--wr-chart-${name}`);

    expect(declared('grid')).toBe('var(--wr-border-base)');
    expect(declared('axis')).toBe('var(--wr-border-strong)');
    expect(declared('zero')).toBe('var(--wr-border-strong)');
    expect(declared('label')).toBe('var(--wr-color-on-surface-muted)');
    expect(declared('label-size')).toBe('var(--wr-text-xs)');
    expect(declared('stroke')).toBe('2px');
    expect(declared('marker')).toBe('6px');
    expect(declared('bar-radius')).toBe('2px');
    expect(declared('gap')).toBe('20%');
    expect(declared('separator')).toBe('var(--wr-color-surface)');
    expect(declared('dim')).toBe('0.35');
    expect(declared('track')).toBe('color-mix(in srgb, var(--wr-border-base) 60%, transparent)');
    expect(declared('band')).toBe('color-mix(in srgb, var(--wr-color-on-surface) 6%, transparent)');
    expect(declared('duration')).toBe('var(--wr-duration-slow)');
    expect(declared('duration-short')).toBe('var(--wr-duration-base)');
    expect(declared('ease')).toBe('var(--wr-ease-out)');
    expect(declared('div-neg')).toBe('var(--wr-color-danger)');
    expect(declared('div-pos')).toBe('var(--wr-color-primary)');
  });

  it('steps the sequential scale from the first palette colour toward the surface', () => {
    const map = tokens(css());
    for (const [step, share] of [20, 40, 60, 80].entries()) {
      expect(map.get(`--wr-chart-seq-${step + 1}`)).toBe(
        `color-mix(in srgb, var(--wr-chart-1) ${share}%, var(--wr-color-surface))`
      );
    }
    expect(map.get('--wr-chart-seq-5')).toBe('var(--wr-chart-1)');
  });

  it('stops every movement under reduced motion', () => {
    expect(css()).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*:root\s*\{\s*--wr-chart-duration: 0s;\s*--wr-chart-duration-short: 0s;/
    );
  });

  it('draws a grid a reader can see, and a zero line stronger than it, in both schemes', () => {
    const map = tokens(css());
    const against = (token: string, scheme: 'light' | 'dark'): number =>
      contrast(resolve(map, map.get(token)!, scheme), resolve(map, map.get('--wr-color-surface')!, scheme));

    // It was a 70% mix of the same role, measured at 1.14 and 1.10 on the page.
    expect(against('--wr-chart-grid', 'light')).toBeCloseTo(1.47, 2);
    expect(against('--wr-chart-grid', 'dark')).toBeCloseTo(1.41, 2);
    expect(against('--wr-chart-zero', 'light')).toBeCloseTo(2.54, 2);
    expect(against('--wr-chart-zero', 'dark')).toBeCloseTo(2.49, 2);
    for (const scheme of ['light', 'dark'] as const) {
      expect(against('--wr-chart-zero', scheme)).toBeGreaterThan(against('--wr-chart-grid', scheme));
    }
  });

  it('gives every palette colour 3:1 against the surface and the subtle fill, in both schemes', () => {
    const map = tokens(css());
    const measured = (scheme: 'light' | 'dark', ground: string): number[] =>
      Array.from({ length: 8 }, (_, index) =>
        contrast(resolve(map, map.get(`--wr-chart-${index + 1}`)!, scheme), resolve(map, map.get(ground)!, scheme))
      );
    const rounded = (ratios: number[]): number[] => ratios.map(ratio => Math.round(ratio * 100) / 100);

    expect(rounded(measured('light', '--wr-color-surface'))).toEqual([4.89, 3.32, 5.18, 8.98, 3.27, 5.4, 3.3, 7.56]);
    expect(rounded(measured('dark', '--wr-color-surface'))).toEqual([4.07, 11.64, 8.48, 10.2, 12.44, 5.14, 5.01, 7.67]);
    // WCAG 1.4.11 does not round up: 2.999 fails.
    for (const scheme of ['light', 'dark'] as const) {
      for (const ground of ['--wr-color-surface', '--wr-color-fill-subtle']) {
        for (const ratio of measured(scheme, ground)) expect(ratio).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('alternates a deep and a mid tone, so two neighbours differ in lightness', () => {
    const map = tokens(css());
    for (const scheme of ['light', 'dark'] as const) {
      const colours = Array.from({ length: 8 }, (_, index) =>
        resolve(map, map.get(`--wr-chart-${index + 1}`)!, scheme)
      );
      const apart = colours.slice(1).map((colour, index) => contrast(colour, colours[index]));
      // Light is the tighter scheme to fit under 3:1 on white, and holds 1.47 at the least;
      // dark has two neighbours of similar lightness and different hue (6 and 7).
      expect(Math.min(...apart)).toBeGreaterThanOrEqual(scheme === 'light' ? 1.47 : 1.02);
    }
  });
});

describe('the chart palette', { timeout: COMPILE_TIMEOUT }, () => {
  it('is the eight tokens of the chart theme, in order', () => {
    expect(WR_CHART_PALETTE).toEqual(Array.from({ length: 8 }, (_, index) => `var(--wr-chart-${index + 1})`));
  });

  it('paints only through tokens the chart sheet declares', () => {
    // A token nothing declares is invalid at computed-value time, and the browser drops
    // the whole declaration holding it: a series would vanish without a word.
    const map = tokens(css());
    for (const colour of WR_CHART_PALETTE) {
      const token = /^var\((--wr-chart-\d)\)$/.exec(colour)?.[1] ?? '';
      expect(map.has(token), colour).toBe(true);
    }
  });

  it('starts on the brand colour and ends on the neutral role', () => {
    const map = tokens(css());
    expect(map.get('--wr-chart-1')).toBe('var(--wr-color-primary)');
    expect(map.get('--wr-chart-8')).toBe('var(--wr-color-on-surface-muted)');
  });

  it('wraps past the end', () => {
    expect(wrChartColor(0)).toBe('var(--wr-chart-1)');
    expect(wrChartColor(8)).toBe('var(--wr-chart-1)');
    expect(wrChartColor(-1)).toBe('var(--wr-chart-8)');
  });

  it('keeps the intents for the charts that have not moved onto the theme', () => {
    expect(WR_CHART_LEGACY_PALETTE).toEqual([
      'var(--wr-color-primary)',
      'var(--wr-color-success)',
      'var(--wr-color-warning)',
      'var(--wr-color-danger)',
      'var(--wr-color-on-surface-muted)',
    ]);
    expect(wrChartLegacyColor(1)).toBe('var(--wr-color-success)');
    expect(wrChartLegacyColor(5)).toBe('var(--wr-color-primary)');
  });
});

describe('the shared chart rules', { timeout: COMPILE_TIMEOUT }, () => {
  it('dims every mark but the hovered series, at no specificity', () => {
    const sheet = css();
    expect(sheet).toMatch(
      /:where\(\.wr-chart--dim\) :where\(\[data-wr-series\]:not\(\.wr-chart-mark--on\)\)\s*\{\s*opacity: var\(--wr-chart-dim\);/
    );
    expect(sheet).toMatch(
      /:where\(\[data-wr-series\]\)\s*\{\s*transition: opacity var\(--wr-chart-duration-short\) var\(--wr-chart-ease\);/
    );
  });

  it('lays a legend at inline start or end beside the body, which takes the rest', () => {
    const sheet = css();
    // Twice the class: a chart's own block sets `display` later in the cascade.
    expect(sheet).toMatch(/\.wr-chart--legend-side\.wr-chart--legend-side\s*\{\s*display: flex;/);
    expect(sheet).toMatch(
      /\.wr-chart--legend-side\.wr-chart--legend-side > :where\(:not\(\.wr-chart-legend, \.wr-chart-table\)\)\s*\{\s*flex: 1 1 0;\s*min-width: 0;/
    );
  });

  it('centres the state message over the frame, and paints a failure in the danger ink', () => {
    const sheet = css();
    const rule = /(?:^|\n)\.wr-chart-state\s*\{([^}]*)\}/.exec(sheet)?.[1] ?? '';
    expect(rule).toMatch(/position: absolute/);
    expect(rule).toMatch(/inset: 0/);
    expect(rule).toMatch(/justify-content: center/);
    expect(rule).toMatch(/--wr-chart-state-color: var\(--wr-chart-label\)/);
    expect(sheet).toMatch(/\.wr-chart-state--error\s*\{\s*color: var\(--wr-chart-state-error-color\);/);
  });
});
