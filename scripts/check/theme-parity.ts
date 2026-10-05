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
 * Needs `dist/showcase`, so it runs in CI right after `build:showcase`
 * (`.github/workflows/ci.yml`) rather than in the `pnpm lint` chain. That step
 * is the gate; without it this file was a command nobody ran, and
 * `check:registry` — the one lint stage that touches the generator — answers a
 * drift report by telling you to regenerate the presets, which carries the drift
 * forward rather than catching it.
 *
 * Usage:
 *   pnpm check:theme
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { exit } from 'node:process';

import { WR_COLORS } from '../../projects/lib/theme/colors';
import { wrIntentTokens } from '../../projects/lib/theme/palette';
import { err } from '../lib/log/err';
import { info } from '../lib/log/info';
import { ROOT_PATH } from '../lib/paths/root';

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

/**
 * `#rrggbb`, `#rgb` or `rgb(r, g, b)` — including Sass's fractional channels,
 * and including the PERCENTAGE channels `sass-embedded` writes.
 *
 * The percent suffix is the whole reason this function has a unit at all.
 * Angular 22.2 moved `@angular/build` onto `sass-embedded`, which serialises a
 * scaled colour as `rgb(3.2507739938%, 4.9845201238%, 9.1021671827%)` where the
 * JS implementation wrote `#080d17`. Same pixel either way — 3.25% of 255 is
 * 8.29 — but a reader that takes `3.2507739938` for a 0-255 channel compares a
 * colour against a thirtieth of itself, and all 34 scaled tokens disagree at
 * once. It is the `check:contrast` trap in a second place: components of a
 * colour are only 0-255 when the notation says so.
 */
function channels(value: string): readonly [number, number, number] | null {
  const rgb = /^rgba?\(\s*([\d.]+)(%?)[,\s]+([\d.]+)(%?)[,\s]+([\d.]+)(%?)/.exec(value);
  if (rgb) {
    // A percentage is printed to ten decimal places, which is not enough to
    // survive the trip back. `success-dark` is channel 110.5 exactly; as a
    // percentage it is 43.333333333333336, printed `43.3333333333`, and
    // multiplied out again that is 110.499999999915 — which rounds DOWN, one
    // short. Restoring six decimals erases the printing error while leaving a
    // genuine half alone, and a half is the only fraction that decides
    // anything here. Three tokens land on it.
    const scale = (n: string, unit: string): number =>
      unit === '%' ? Number((((Number(n) / 100) * 255).toFixed(6))) : Number(n);
    return [scale(rgb[1], rgb[2]), scale(rgb[3], rgb[4]), scale(rgb[5], rgb[6])];
  }

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

/**
 * Every notation this gate has had to read, proved before it judges the tree.
 *
 * A green run proves nothing about a notation the stylesheet does not currently
 * happen to contain: the percentage form arrived with one Angular minor and
 * turned all 34 scaled tokens red at once, and the reading that was wrong had
 * been green for as long as Sass wrote hex. Same reasoning as `SELF_TEST` in
 * `check-color-only.ts`. A pair here is the same pixel written two ways.
 */
const SELF_TEST: readonly { readonly why: string; readonly a: string; readonly b: string }[] = [
  { why: "sass-embedded's percentage channels against hex", a: 'rgb(3.2507739938%, 4.9845201238%, 9.1021671827%)', b: '#080d17' },
  { why: 'percentages at the ends of the range', a: 'rgb(0%, 100%, 50%)', b: 'rgb(0, 255, 127.5)' },
  // The three tokens that survived the first version of the percentage reading.
  { why: 'a half channel printed as a percentage, rounding up', a: 'rgb(0%, 43.3333333333%, 0%)', b: '#006f00' },
  { why: 'the same, higher in the range', a: 'rgb(0%, 63.3333333333%, 0%)', b: '#00a200' },
  { why: 'a half in one channel of three', a: 'rgb(91.6246498599%, 27.1988795518%, 50.3921568627%)', b: '#ea4581' },
  { why: "Sass's fractional 0-255 channels, which have no unit", a: 'rgb(0, 110.5, 0)', b: '#006f00' },
  { why: 'a three-digit hex', a: '#abc', b: 'rgb(170, 187, 204)' },
  { why: 'space-separated channels', a: 'rgb(8 13 23)', b: '#080d17' },
];

function selfTest(): string[] {
  return SELF_TEST.flatMap(({ why, a, b }) => (samePixel(a, b) ? [] : [`${why}: \`${a}\` and \`${b}\` should be the same pixel`]));
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

const blindSpots = selfTest();
if (blindSpots.length > 0) {
  err(`\n✘ check:theme cannot read a colour notation it is meant to read:\n`);
  for (const spot of blindSpots) err(`  ${spot}`);
  err(`\n  A green run over the tree would mean nothing — see SELF_TEST in scripts/check/theme-parity.ts.\n`);
  exit(1);
}

main();
