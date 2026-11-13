import { describe, expect, it } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../spec-sass';

/**
 * `@use 'ngwr/reset'` compiled rather than read, the way `theme/sass-entry.spec.ts`
 * compiles the theme: what the sheet emits, and whether the theme rides along,
 * only exists after Sass has run.
 *
 * The case behind it: an app loads a sheet lazily inside `@layer`, so its copy
 * of the theme loses to the brand. Unlayered, the reset's `button { background:
 * none; border: 0 }` beat that whole layer and took the fills off
 * `wr-event-calendar`'s events and the borders off `wr-select`. Putting the reset
 * in a layer of its own through `meta.load-css()` worked, and re-emitted the
 * theme the reset loaded inside that layer: 18 kB that decided nothing.
 *
 * `sass` is resolved through `@angular/build`, for the reason that file gives.
 */
const compile = (source: string, style: 'expanded' | 'compressed' = 'compressed'): string =>
  compileSass(source, { style });

const RESET = "@use 'styles/reset';";
const THEME = "@use 'theme';";

/** The custom properties a stylesheet declares, by name. */
const declared = (css: string): string[] => [...new Set([...css.matchAll(/(--wr-[\w-]+)\s*:/g)].map(m => m[1]))];

/** The custom properties a stylesheet reads, by name. */
const read = (css: string): string[] => [...new Set([...css.matchAll(/var\(\s*(--wr-[\w-]+)/g)].map(m => m[1]))];

/** The selector of every top-level rule, in source order. */
const selectors = (css: string): string[] =>
  [...css.matchAll(/(?:^|\})([^{}@]+)\{/g)].map(m => m[1].trim().replace(/\s*,\s*/g, ', '));

describe("the reset `@use 'ngwr/reset'`", { timeout: COMPILE_TIMEOUT }, () => {
  it('emits no theme: no token declaration, no `:root`', () => {
    const css = compile(RESET);

    expect(declared(css)).toEqual([]);
    expect(css).not.toContain(':root');
    // The theme's own marker, which `wrCheckStyles()` reads to tell a missing
    // theme apart: a reset loaded alone must not pass for one.
    expect(css).not.toContain('--wr-loaded-theme');
  });

  it('reads only tokens the theme declares, so the theme it needs answers every one', () => {
    const theme = new Set(declared(compile(THEME)));
    const reads = read(compile(RESET));

    expect(reads.length).toBeGreaterThan(0);
    expect(reads.filter(name => !theme.has(name))).toEqual([]);
  });

  it('keeps its rules', () => {
    const css = compile(RESET);

    expect(selectors(css)).toEqual([
      '*, *::before, *::after',
      'html',
      'body',
      'h1, h2, h3, h4, h5, h6, p, figure, blockquote, dl, dd',
      'h1, h2, h3, h4, h5, h6',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'ul[role=list], ol[role=list]',
      'a',
      'img, picture, svg, video',
      'button, input, select, textarea',
      'button',
      'code, kbd, samp, pre',
    ]);
    expect(css).toContain('button{background:none;border:0;padding:0;cursor:pointer}');
    expect(css).toContain('h1{font-size:var(--wr-text-4xl)}');
    expect(read(css).sort()).toEqual([
      '--wr-font-family-base',
      '--wr-font-family-mono',
      '--wr-font-weight-semibold',
      '--wr-leading-normal',
      '--wr-leading-tight',
      '--wr-text-2xl',
      '--wr-text-3xl',
      '--wr-text-4xl',
      '--wr-text-base',
      '--wr-text-lg',
      '--wr-text-xl',
      '--wr-tracking-tight',
    ]);
  });

  it('adds exactly its rules to a stylesheet that loads the theme', () => {
    expect(compile(`${THEME} ${RESET}`)).toBe(compile(THEME) + compile(RESET));
  });

  it('compiles above a configured theme, which it no longer loads first', () => {
    const css = compile(
      `${RESET} @use 'theme' with ($base-colors: (primary: #4f46e5, success: #008800, warning: #ffba00, danger: #dc3137, info: #3472d9));`
    );

    expect(css).toMatch(/--wr-color-primary:\s*light-dark\(#4f46e5,/);
  });

  it('adds no second theme when an app loads it into a layer with `meta.load-css()`', () => {
    const css = compile(`@use 'sass:meta'; ${THEME} @layer app-reset { @include meta.load-css('styles/reset'); }`);

    expect(css.match(/--wr-text-4xl:/g)).toHaveLength(1);
    expect(css).toBe(`${compile(THEME)}@layer app-reset{${compile(RESET)}}`);
  });
});

describe("the reset's `$layer`", { timeout: COMPILE_TIMEOUT }, () => {
  it('leaves the rules unlayered by default', () => {
    expect(compile(RESET)).not.toContain('@layer');
  });

  it('wraps every rule in the one layer it names', () => {
    const unlayered = compile(RESET);

    expect(compile("@use 'styles/reset' with ($layer: 'reset');")).toBe(`@layer reset{${unlayered}}`);
    expect(compile("@use 'styles/reset' with ($layer: 'base.reset');")).toBe(`@layer base.reset{${unlayered}}`);
  });

  it('opens the layer below the theme, which stays unlayered', () => {
    const css = compile("@use 'theme'; @use 'styles/reset' with ($layer: 'reset');");

    expect(css).toBe(`${compile(THEME)}@layer reset{${compile(RESET)}}`);
  });

  it('refuses a value that is not a layer name', () => {
    expect(() => compile("@use 'styles/reset' with ($layer: 12);")).toThrow(/`\$layer` takes a cascade layer name/);
    expect(() => compile("@use 'styles/reset' with ($layer: '');")).toThrow(/`\$layer` takes a cascade layer name/);
  });
});
