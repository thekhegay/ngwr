import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { COMPILE_TIMEOUT, compileSass, LIB } from '../spec-sass';

/**
 * `--wr-color-canvas` and the mixin that paints with it, read from compiled
 * CSS: jsdom applies no stylesheet, so nothing rendered can show the step.
 */
const compile = (source: string): string => compileSass(source).replace(/\/\*[\s\S]*?\*\//g, '');

const USE = "@use 'theme' as wr;";

/** The declarations of `name` in source order, each with whether a `prefers-contrast` block holds it. */
function declarationsOf(css: string, name: string): { value: string; highContrast: boolean }[] {
  const media = css.indexOf('@media (prefers-contrast: more)');
  return [...css.matchAll(new RegExp(`${name}:\\s*([^;]+);`, 'g'))].map(m => ({
    value: m[1].trim(),
    highContrast: media !== -1 && m.index > media,
  }));
}

/** The first value `name` is declared with. */
function token(css: string, name: string): string {
  const value = declarationsOf(css, name)[0]?.value;
  if (value === undefined) throw new Error(`${name} is not declared`);
  return value;
}

/** Both sides of a `light-dark()` whose arguments carry no comma of their own. */
function sides(value: string): { light: string; dark: string } {
  const match = /^light-dark\(([^,]+),\s*([^,]+)\)$/.exec(value);
  if (!match) throw new Error(`not a light-dark() pair: ${value}`);
  return { light: match[1].trim(), dark: match[2].trim() };
}

/** A hex, or a `var()` followed to the hex it holds. */
function resolve(css: string, value: string): string {
  const ref = /^var\((--wr-[\w-]+)\)$/.exec(value);
  return ref ? resolve(css, token(css, ref[1])) : value;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function scssFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...scssFiles(full));
    else if (full.endsWith('.scss')) out.push(full);
  }
  return out;
}

describe('theme canvas', { timeout: COMPILE_TIMEOUT }, () => {
  const css = compile(USE);
  const schemes = ['light', 'dark'] as const;

  const canvas = sides(token(css, '--wr-color-canvas'));
  const surface = sides(token(css, '--wr-color-white'));
  const hex = (pair: { light: string; dark: string }, scheme: 'light' | 'dark'): string => resolve(css, pair[scheme]);

  it('is declared once for both schemes, on steps of the fixed scale', () => {
    expect(token(css, '--wr-color-surface')).toBe('var(--wr-color-white)');
    expect(canvas).toEqual({ light: 'var(--wr-color-gray-100)', dark: 'var(--wr-color-gray-950)' });
    for (const scheme of schemes) expect(hex(canvas, scheme)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('sits one step behind the surface in both schemes', () => {
    for (const scheme of schemes) {
      const step = contrast(hex(canvas, scheme), hex(surface, scheme));
      expect(luminance(hex(canvas, scheme)), scheme).toBeLessThan(luminance(hex(surface, scheme)));
      expect(step, scheme).toBeGreaterThan(1.05);
      expect(step, scheme).toBeLessThan(1.15);
    }
  });

  it('keeps body and muted text readable on it', () => {
    for (const scheme of schemes) {
      const on = (name: string): number => contrast(hex(sides(token(css, name)), scheme), hex(canvas, scheme));
      expect(on('--wr-color-gray-6'), scheme).toBeGreaterThan(7);
      expect(on('--wr-color-gray-5'), scheme).toBeGreaterThan(4.5);
    }
  });

  it('closes the step under prefers-contrast: more', () => {
    const all = declarationsOf(css, '--wr-color-canvas');
    expect(all.map(d => d.highContrast)).toEqual([false, true]);
    expect(all[1].value).toBe('var(--wr-color-surface)');
  });

  it('is not re-declared by a rebrand, which would switch that override off', () => {
    const rebranded = compile(`${USE} .brand { @include wr.rebrand((primary: #be123c)); }`);
    expect(rebranded.slice(rebranded.indexOf('.brand'))).not.toContain('--wr-color-canvas');
  });

  it('is opt-in: the theme alone paints nothing with it', () => {
    expect(css).not.toContain('var(--wr-color-canvas)');
  });

  it('paints body at zero specificity when included at the stylesheet root', () => {
    const own = compile(`${USE} @include wr.canvas;`).slice(css.length);
    expect(own.replace(/\s+/g, ' ').trim()).toBe(':where(body) { background-color: var(--wr-color-canvas); }');
  });

  it('paints that element only when included inside a rule', () => {
    const own = compile(`${USE} .wr-layout-content { @include wr.canvas; }`).slice(css.length);
    expect(own.replace(/\s+/g, ' ').trim()).toBe('.wr-layout-content { background-color: var(--wr-color-canvas); }');
  });

  it('is read by no stylesheet but the mixin: components keep the surface', () => {
    const readers = scssFiles(LIB)
      .filter(file => readFileSync(file, 'utf8').includes('var(--wr-color-canvas)'))
      .map(file => relative(LIB, file));
    expect(readers).toEqual(['theme/styles/_mixins.scss']);
  });
});
