import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/** The scrollbar skin, held as source: jsdom paints no scrollbar. */
const LIB = join(process.cwd(), 'projects/lib');
const SHEET = join(LIB, 'theme/styles/_scrollbar.scss');

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

describe('theme scrollbar', () => {
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

  it('is forwarded by the theme entry', () => {
    expect(readFileSync(join(LIB, 'theme/styles/_index.scss'), 'utf8')).toContain("@forward 'scrollbar';");
  });

  it('keeps every selector at zero specificity and skips forced colors', () => {
    expect(sheet).toContain('@media not (forced-colors: active)');
    const selectors = sheet.match(/^\s*[^@\s{}][^{};]*(?=\{)/gm) ?? [];
    expect(selectors.length).toBeGreaterThan(0);
    for (const s of selectors) expect(s.trim().startsWith(':where(html, html *)'), s).toBe(true);
  });

  it('paints a thumb only: transparent track and corner, no buttons', () => {
    expect(sheet).toContain('::-webkit-scrollbar-thumb');
    expect(sheet).toContain('background-clip: content-box');
    expect(sheet).toMatch(/::-webkit-scrollbar-button\s*\{\s*display: none/);
    expect(sheet).toMatch(/::-webkit-scrollbar-track,[^{]*::-webkit-scrollbar-corner\s*\{\s*background: transparent/);
  });

  it('puts the Firefox properties inside the @supports not selector guard', () => {
    const guard = sheet.indexOf('@supports not selector(::-webkit-scrollbar)');
    expect(guard).toBeGreaterThan(-1);
    const inside = block(sheet, guard);
    expect(inside).toContain('scrollbar-width: thin');
    expect(inside).toContain('scrollbar-color: var(--wr-scrollbar-thumb) transparent');
    const outside = sheet.slice(0, guard) + sheet.slice(guard).replace(inside, '');
    expect(outside).not.toMatch(/scrollbar-(width|color)\s*:/);
  });

  it('has no other stylesheet in the library set scrollbar-width or scrollbar-color', () => {
    const offenders = scssFiles(LIB)
      .filter(file => file !== SHEET)
      .filter(file => /scrollbar-(width|color)\s*:/.test(strip(readFileSync(file, 'utf8'))))
      .map(file => relative(LIB, file));
    expect(offenders).toEqual([]);
  });
});
