/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Proves that `wrThemeTokens()` reproduces the stylesheet it claims to mirror.
 *
 * `ngwr/theme`'s palette generator exists so a theme picked at RUNTIME — a
 * builder, a tenant colour, a preset fetched from the registry — derives the
 * same seven tokens per intent that `theme/styles/_colors.scss` derives at
 * build time. Two implementations of one recipe drift the moment either is
 * edited, and this repo has watched that happen: `WR_COLORS` and `$base-colors`
 * needed `check:colors` for exactly the same reason.
 *
 * It reads the BUILT stylesheet rather than re-compiling the SCSS, and that is
 * the stronger evidence: what ships to the browser is what gets compared, so a
 * Sass upgrade that changed `color.adjust`'s rounding would fail here instead
 * of passing a re-compile of the same source.
 *
 * **Channels are compared as ROUNDED integers.** Sass emits `color.adjust`
 * results as `rgb(34.7577092511, 88.1497797357, 222.7422907489)` — fractional,
 * because it keeps full precision and lets the browser round at paint time —
 * while the generator returns `#2358df`. Matching those as strings would be
 * comparing two spellings of one colour, and matching them within an epsilon
 * has to pick a side at exactly 0.5, which is where Sass keeps landing.
 *
 * Only the LIGHT block. `_dark.scss` is hand-tuned rather than derived (its
 * `dark-light` uses `color.scale(…, 70%)` where this recipe uses
 * `color.adjust(…, 5%)`), so asserting the generator reproduces it would be
 * asserting something false.
 *
 * Needs `dist/showcase`, so it runs after `build:showcase` rather than in the
 * `pnpm lint` chain.
 *
 * Usage:
 *   pnpm check:theme
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { exit } from 'node:process';

import { WR_COLORS } from '../projects/lib/theme/colors';
import { wrIntentTokens } from '../projects/lib/theme/palette';

import { err } from './lib/log/err';
import { info } from './lib/log/info';
import { ROOT_PATH } from './lib/paths/root';

const DIST = resolve(ROOT_PATH, 'dist/showcase');
const COLORS_SCSS = resolve(ROOT_PATH, 'projects/lib/theme/styles/_colors.scss');

/** The seeds the stylesheet compiled from — read from the SCSS, never retyped. */
function baseColors(): Map<string, string> {
  // Comments stripped FIRST. The file opens with a usage example that spells
  // out `$base-colors: (primary: #...)` inside a `//` block, and a regex that
  // reads it finds a one-entry map and reports the other eight as missing.
  const src = readFileSync(COLORS_SCSS, 'utf8').replace(/^\s*\/\/.*$/gm, '');
  const block = /\$base-colors:\s*\(([^)]*)\)/.exec(src)?.[1] ?? '';
  const out = new Map<string, string>();
  for (const [, name, hex] of block.matchAll(/([a-z-]+):\s*(#[0-9a-fA-F]{3,8})/g)) out.set(name, hex);
  return out;
}

/** Every `--wr-color-*` declaration in the built sheet's FIRST `:root` block. */
function compiledTokens(): Map<string, string> {
  const sheets = readdirSync(DIST).filter(f => f.startsWith('styles-') && f.endsWith('.css'));
  const out = new Map<string, string>();

  for (const sheet of sheets) {
    const css = readFileSync(join(DIST, sheet), 'utf8');
    // `:root` appears more than once (the dark block is `:root[data-theme=…]`),
    // and only the bare one carries the light palette.
    for (const [, body] of css.matchAll(/(?:^|})\s*:root\s*\{([^}]*)\}/g)) {
      for (const [, name, value] of body.matchAll(/(--wr-color-[a-z0-9-]+)\s*:\s*([^;]+)/g)) {
        if (!out.has(name)) out.set(name, value.trim());
      }
    }
  }
  return out;
}

/** `#rrggbb`, `#rgb` or `rgb(r, g, b)` — including Sass's fractional channels. */
function channels(value: string): readonly [number, number, number] | null {
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(value);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];

  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(value.trim());
  if (!hex) return null;
  const full = hex[1].length === 3 ? [...hex[1]].map(c => c + c).join('') : hex[1];
  const n = Number.parseInt(full, 16);
  /* eslint-disable no-bitwise -- unpacking a packed 24-bit colour */
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  /* eslint-enable no-bitwise */
}

/**
 * Same painted pixel: every channel ROUNDS to the same integer.
 *
 * Rounding rather than an epsilon, because an epsilon has to pick a side at
 * exactly 0.5 and Sass lands there constantly — `rgb(0, 110.5, 0)` for
 * `success-dark`, `128.5` for `secondary-lighter`. Asking "do these round the
 * same way" is the question the browser itself answers when it paints, and it
 * has no boundary case to argue about.
 */
function samePixel(a: string, b: string): boolean {
  const ca = channels(a);
  const cb = channels(b);
  if (!ca || !cb) return false;
  return ca.every((v, i) => Math.round(v) === Math.round(cb[i]));
}

function main(): void {
  if (!existsSync(DIST)) {
    err('\n✘ theme parity: dist/showcase not found. Run build:showcase first.\n');
    exit(1);
  }

  const seeds = baseColors();
  const compiled = compiledTokens();
  const problems: string[] = [];
  let compared = 0;

  if (seeds.size !== WR_COLORS.length) {
    problems.push(`$base-colors has ${seeds.size} entries, WR_COLORS has ${WR_COLORS.length} — check:colors should have caught this`);
  }

  for (const name of WR_COLORS) {
    const seed = seeds.get(name);
    if (!seed) {
      problems.push(`${name}: no seed in $base-colors`);
      continue;
    }

    const generated = wrIntentTokens(name, seed);
    if (Object.keys(generated).length === 0) {
      problems.push(`${name}: the generator could not parse its own seed "${seed}"`);
      continue;
    }

    for (const [token, value] of Object.entries(generated)) {
      const shipped = compiled.get(token);
      if (shipped === undefined) {
        problems.push(`${token}: the generator emits it, the stylesheet does not`);
        continue;
      }
      compared++;

      // `-rgb` is a channel LIST, not a colour, so it is compared as one.
      const match = token.endsWith('-rgb')
        ? samePixel(`rgb(${shipped})`, `rgb(${value})`)
        : samePixel(shipped, value);

      if (!match) problems.push(`${token}: stylesheet says ${shipped}, generator says ${value}`);
    }
  }

  if (problems.length > 0) {
    for (const problem of problems) err(`  ✘ ${problem}`);
    err(`\n✘ ${problems.length} token(s) where ngwr/theme's generator and _colors.scss disagree.\n`);
    exit(1);
  }

  info(`✓ Theme parity — ${compared} tokens across ${WR_COLORS.length} intents match the compiled stylesheet.`);
}

main();
