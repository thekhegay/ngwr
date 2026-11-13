import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { COMPILE_TIMEOUT, compileSass, LIB } from '../spec-sass';

/**
 * The scrollbar mixin. Compiled where the output is the claim (what the theme
 * alone emits, the two uses), read as source where it is a property of the
 * files (no stray `scrollbar-width`, who includes it): jsdom paints no
 * scrollbar. `sass` comes through `@angular/build`, as in `sass-entry.spec.ts`.
 */
const SHEET = join(LIB, 'theme/styles/_scrollbar.scss');

const compile = (source: string): string => compileSass(source).replace(/\/\*[\s\S]*?\*\//g, '');

function strip(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');
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

/** The text of the block opened by the first `{` after `start`. */
function block(source: string, start: number): string {
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(open + 1, i);
  }
  throw new Error('unbalanced block');
}

/** Every selector list of a compiled sheet, split at the commas that start a new compound. */
function selectors(css: string): string[] {
  return (css.match(/^\s*[^@\s{}][^{};]*(?=\{)/gm) ?? []).flatMap(s => s.split(/,\s*(?=[.:])/).map(p => p.trim()));
}

const USE = "@use 'theme' as wr;";
/** The mixin alone, so a selector list holds nothing but its own rules. */
const ALONE = "@use 'theme/styles/scrollbar' as sb;";

describe('theme scrollbar', { timeout: COMPILE_TIMEOUT }, () => {
  const sheet = strip(readFileSync(SHEET, 'utf8'));
  const variables = strip(readFileSync(join(LIB, 'theme/styles/_variables.scss'), 'utf8'));

  it('declares the three tokens on :root, built from the on-surface role', () => {
    expect(variables).toMatch(/--wr-scrollbar-size:\s*[\d.]+rem;/);
    for (const name of ['thumb', 'thumb-hover']) {
      expect(variables).toMatch(
        new RegExp(
          `--wr-scrollbar-${name}:\\s*color-mix\\(in srgb, var\\(--wr-color-on-surface\\) \\d+%, transparent\\);`
        )
      );
    }
  });

  it('is forwarded by the theme entry and offered by the public one', () => {
    expect(readFileSync(join(LIB, 'theme/styles/_index.scss'), 'utf8')).toContain("@forward 'scrollbar';");
    expect(compile(`${USE} .x { @include wr.scrollbar; }`)).toContain('.x::-webkit-scrollbar-thumb');
  });

  it('is opt-in: the theme alone emits no scrollbar rule', () => {
    const css = compile(USE);
    expect(css).toContain('--wr-scrollbar-thumb');
    expect(css).not.toMatch(/::-webkit-scrollbar/);
    expect(css).not.toMatch(/scrollbar-(width|color)\s*:/);
    expect(compile("@use 'theme/styles';")).not.toMatch(/::-webkit-scrollbar|scrollbar-(width|color)\s*:/);
  });

  describe('at the stylesheet root', () => {
    const css = compile(`${ALONE} @include sb.scrollbar;`);

    it('covers the page at zero specificity and skips forced colors', () => {
      expect(css).toContain('@media not (forced-colors: active)');
      const list = selectors(css);
      expect(list.length).toBeGreaterThan(0);
      for (const s of list) expect(s.startsWith(':where(html, html *)'), s).toBe(true);
    });

    it('paints a thumb only: transparent track and corner, no buttons', () => {
      expect(css).toContain('::-webkit-scrollbar-thumb');
      expect(css).toContain('background-clip: content-box');
      expect(css).toMatch(/::-webkit-scrollbar-button\s*\{\s*display: none/);
      expect(css).toMatch(/::-webkit-scrollbar-track,[^{]*::-webkit-scrollbar-corner\s*\{\s*background: transparent/);
    });

    it('puts the Firefox properties inside the @supports not selector guard', () => {
      const guard = css.indexOf('@supports not selector(::-webkit-scrollbar)');
      expect(guard).toBeGreaterThan(-1);
      const inside = block(css, guard);
      expect(inside).toContain('scrollbar-width: thin');
      expect(inside).toContain('scrollbar-color: var(--wr-scrollbar-thumb) transparent');
      const outside = css.slice(0, guard) + css.slice(guard).replace(inside, '');
      expect(outside).not.toMatch(/scrollbar-(width|color)\s*:/);
    });
  });

  describe('inside a rule', () => {
    const css = compile(`${ALONE} .panel { @include sb.scrollbar; }`);

    it('styles that element only, with the same content', () => {
      expect(css).not.toContain(':where(html');
      const list = selectors(css);
      expect(list.length).toBeGreaterThan(0);
      for (const s of list) expect(s.startsWith('.panel'), s).toBe(true);
      expect(css).toContain('.panel::-webkit-scrollbar-thumb:hover');
      expect(css).toContain('@media not (forced-colors: active)');
    });

    it('keeps the Firefox properties inside the guard', () => {
      const guard = css.indexOf('@supports not selector(::-webkit-scrollbar)');
      expect(guard).toBeGreaterThan(-1);
      const inside = block(css, guard);
      expect(inside).toMatch(/\.panel\s*\{[^}]*scrollbar-width: thin/);
      const outside = css.slice(0, guard) + css.slice(guard).replace(inside, '');
      expect(outside).not.toMatch(/scrollbar-(width|color)\s*:/);
    });
  });

  it('has no other stylesheet in the library set scrollbar-width or scrollbar-color', () => {
    const offenders = scssFiles(LIB)
      .filter(file => file !== SHEET)
      .filter(file => /scrollbar-(width|color)\s*:/.test(strip(readFileSync(file, 'utf8'))))
      .map(file => relative(LIB, file));
    expect(offenders).toEqual([]);
    expect(sheet).toContain('scrollbar-width: thin');
  });

  it('is included by wr-virtual-scroll and wr-marquee on their own viewports', () => {
    const virtual = strip(readFileSync(join(LIB, 'virtual-scroll/styles/_rules.scss'), 'utf8'));
    expect(virtual).toMatch(/&__viewport\s*\{[\s\S]*@include scrollbar\.scrollbar;/);
    expect(virtual).toContain('--wr-virtual-scroll-thumb-radius');
    const marquee = strip(readFileSync(join(LIB, 'animations/marquee/styles/_index.scss'), 'utf8'));
    expect(marquee).toMatch(/&__viewport\s*\{[\s\S]*@include theme\.scrollbar;/);

    const css = compile("@use 'virtual-scroll/styles/rules';");
    expect(css).toContain('.wr-virtual-scroll__viewport::-webkit-scrollbar-thumb');
    expect(css).not.toContain(':where(html');
  });
});
