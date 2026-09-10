/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Emits the token layer as W3C Design Tokens (DTCG), one file per theme, for a
 * design tool to import.
 *
 * **This is the codeable half of D5 and it is not a Figma kit.** A kit is
 * component frames, variants, states and auto-layout geometry, and none of that
 * can come out of this repository. What a kit author otherwise does by hand is
 * re-type the palette — and get the dark half wrong, because `_dark.scss` is
 * hand-tuned rather than derived and no formula reproduces it. That is the part
 * worth generating.
 *
 * **Read from the BUILT stylesheet, not from `wrThemeTokens()`, and the reason
 * is the same one AGENTS.md records for `check:theme`.** The TypeScript recipe
 * is the LIGHT palette only: seeding it with a dark colour gives a consistent
 * dark palette, not the shipped one. `dist/showcase/styles-*.css` is the only
 * place both themes exist as resolved values, so that is the source. It also
 * means this script inherits the property `check:theme` relies on — what it
 * emits is what a browser actually computes, not what an arithmetic says it
 * should.
 *
 * Usage:
 *   pnpm build:showcase && pnpm gen:design-tokens
 *
 * Writes `dist/design-tokens/{light,dark}.tokens.json`.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { err } from './lib/log/err';
import { info } from './lib/log/info';

const ROOT_PATH = resolve(import.meta.dirname, '..');
const DIST = resolve(ROOT_PATH, 'dist/showcase');
const OUT_DIR = resolve(ROOT_PATH, 'dist/design-tokens');

/**
 * A floor, in the `check:llms` idiom: a generator that quietly emits an empty
 * catalog looks exactly like one with nothing to say. The shipped palette is 63
 * colour tokens before the role aliases, so anything under this means the
 * parser stopped matching rather than the palette shrinking.
 */
const MINIMUM_TOKENS = 50;

type Theme = 'light' | 'dark';

interface DtcgColor {
  readonly $type: 'color';
  readonly $value: {
    readonly colorSpace: 'srgb';
    readonly components: readonly [number, number, number];
    readonly alpha: number;
    readonly hex: string;
  };
  readonly $description?: string;
}

/** Read one theme's `--wr-color-*` declarations out of the built stylesheet. */
function declarations(theme: Theme): Map<string, string> {
  const sheets = readdirSync(DIST).filter(f => f.startsWith('styles-') && f.endsWith('.css'));
  const out = new Map<string, string>();

  for (const sheet of sheets) {
    const css = readFileSync(join(DIST, sheet), 'utf8');

    // The light palette lives on the bare `:root`; the dark one on the theme
    // attribute. Matching `:root` loosely would pull the dark block into the
    // light file, since `:root[data-theme=dark]` contains the substring.
    const pattern =
      theme === 'light'
        ? /(?:^|})\s*:root\s*\{([^}]*)\}/g
        : /(?:^|})\s*(?::root)?\[data-theme=(?:'dark'|"dark"|dark)\][^{]*\{([^}]*)\}/g;

    for (const [, body] of css.matchAll(pattern)) {
      for (const [, name, value] of body.matchAll(/(--wr-color-[a-z0-9-]+)\s*:\s*([^;]+)/g)) {
        // First declaration wins, matching the cascade for equally specific
        // rules in one sheet — and matching how `check:theme` reads it.
        if (!out.has(name)) out.set(name, value.trim());
      }
    }
  }

  return out;
}

/** `#rrggbb`, `#rgb`, or `rgb()` / `rgba()` with integer or fractional channels. */
function parseColor(value: string): { rgb: readonly [number, number, number]; alpha: number } | null {
  const fn = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.%]+))?\s*\)/.exec(value);
  if (fn) {
    const alpha = fn[4] ? (fn[4].endsWith('%') ? Number(fn[4].slice(0, -1)) / 100 : Number(fn[4])) : 1;
    return { rgb: [Number(fn[1]), Number(fn[2]), Number(fn[3])], alpha };
  }

  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(value);
  if (!hex) return null;
  const full = hex[1].length === 3 ? [...hex[1]].map(c => c + c).join('') : hex[1];
  return { rgb: [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)], alpha: 1 };
}

/**
 * Resolve a declaration to a concrete colour.
 *
 * Named `resolveColor` and not `resolve`, which shadowed `node:path`'s and
 * broke the module before it ran a line.
 *
 * The palette is written in three forms and a design tool understands only the
 * third. `var(--wr-color-white)` is how the role aliases are spelled;
 * `color-mix(in srgb, var(--wr-color-primary) 78%, var(--wr-color-dark))` is how
 * every `-ink` is derived. Resolving both here is what takes the export from
 * half-empty to complete — a first pass emitted 45 of the dark theme's tokens
 * and silently called the other 64 "unresolved".
 *
 * `in srgb` is the only interpolation space the palette uses, and it is plain
 * channel-wise interpolation, so this reproduces the browser rather than
 * approximating it.
 */
function resolveColor(value: string, all: Map<string, string>, depth = 0): string | null {
  if (depth > 8) return null;
  const text = value.trim();

  const alias = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/.exec(text);
  if (alias) {
    const target = all.get(alias[1]);
    if (target !== undefined) return resolveColor(target, all, depth + 1);
    return alias[2] ? resolveColor(alias[2], all, depth + 1) : null;
  }

  // `rgba(var(--wr-color-danger-rgb), 0.12)` — the whole `-soft` / `-active` /
  // `-border` family. The channel list is itself a token, so it has to be
  // looked up before the alpha can be applied; a design tool wants the
  // composite, not the reference.
  const overChannels = /^rgba?\(\s*var\(\s*(--[\w-]+)\s*\)\s*[,/]\s*([\d.%]+)\s*\)$/.exec(text);
  if (overChannels) {
    const channels = all.get(overChannels[1]);
    if (!channels) return null;
    const alpha = overChannels[2].endsWith('%') ? Number(overChannels[2].slice(0, -1)) / 100 : Number(overChannels[2]);
    return `rgba(${channels.trim()}, ${alpha})`;
  }

  const mix = /^color-mix\(\s*in\s+srgb\s*,\s*(.+?)\s+([\d.]+)%\s*,\s*(.+?)\s*\)$/.exec(text);
  if (mix) {
    const a = resolveColor(mix[1], all, depth + 1);
    const b = resolveColor(mix[3], all, depth + 1);
    if (!a || !b) return null;
    const pa = parseColor(a);
    const pb = parseColor(b);
    if (!pa || !pb) return null;
    const w = Number(mix[2]) / 100;
    const rgb = pa.rgb.map((c, i) => Math.round(c * w + pb.rgb[i] * (1 - w)));
    return `#${rgb.map(c => c.toString(16).padStart(2, '0')).join('')}`;
  }

  return parseColor(text) ? text : null;
}

function toDtcg(value: string): DtcgColor | null {
  const parsed = parseColor(value);
  if (!parsed) return null;
  const [r, g, b] = parsed.rgb.map(c => Math.round(c));
  const hex = `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`;
  return {
    $type: 'color',
    $value: {
      colorSpace: 'srgb',
      components: [r / 255, g / 255, b / 255],
      alpha: parsed.alpha,
      hex,
    },
  };
}

/**
 * Group `--wr-color-primary-soft` under `color.primary.soft`.
 *
 * DTCG is a tree and a design tool renders it as folders, so a flat list of
 * ninety hyphenated names imports as ninety loose variables. The intent is the
 * folder; everything after it is the leaf.
 */
function place(tree: Record<string, unknown>, name: string, token: DtcgColor): void {
  const parts = name.replace(/^--wr-color-/, '').split('-');
  // `--wr-color-primary` is the intent's BASE, so it belongs inside that
  // intent's folder rather than in a flat `base` bucket beside it — a design
  // tool shows `primary/base` next to `primary/soft`, which is the grouping a
  // reader expects.
  const group = parts[0];
  const leaf = parts.length === 1 ? 'base' : parts.slice(1).join('-');

  const bucket = (tree[group] ??= {}) as Record<string, unknown>;
  bucket[leaf] = token;
}

function main(): void {
  if (!existsSync(DIST)) {
    err('\n✘ design tokens: dist/showcase not found. Run build:showcase first.\n');
    process.exit(1);
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  let smallest = Infinity;

  // The dark block REDECLARES a subset; everything it leaves alone inherits
  // from `:root`. Resolving dark against its own map alone left eleven tokens
  // unresolvable — `rgba(var(--wr-color-info-rgb), .12)` cannot find a channel
  // list the dark theme never restates. Layering the two is what the cascade
  // does, so it is what the export has to do.
  const light = declarations('light');

  for (const theme of ['light', 'dark'] as const) {
    const own = declarations(theme);
    const found = theme === 'light' ? own : new Map([...light, ...own]);
    const color: Record<string, unknown> = {};
    let count = 0;
    const skipped: string[] = [];

    for (const [name, value] of [...found].sort(([a], [b]) => a.localeCompare(b))) {
      // `-rgb` is a bare channel list (`71, 80, 93`) that exists so a stylesheet
      // can write `rgba(var(--wr-color-x-rgb), α)`. It is a CSS convenience with
      // no meaning in a design tool, and it duplicates the token beside it, so
      // it is dropped rather than reported as unresolved.
      if (name.endsWith('-rgb')) continue;

      const resolved = resolveColor(value, found);
      const token = resolved ? toDtcg(resolved) : null;
      if (!token) {
        // Something the resolver above could not reduce to a colour — a
        // gradient, a system keyword, a `light-dark()`. Named rather than
        // dropped silently, because a growing skip list means the palette moved
        // to a form the export no longer covers.
        skipped.push(name);
        continue;
      }
      place(color, name, token);
      count++;
    }

    smallest = Math.min(smallest, count);

    const doc = {
      $description:
        `ngwr ${theme} colour tokens, generated from the built stylesheet by ` +
        `scripts/gen-design-tokens.ts. Do not hand-edit. The dark palette is ` +
        `hand-tuned in theme/styles/_dark.scss and is NOT derivable from the light one.`,
      color,
    };

    const file = join(OUT_DIR, `${theme}.tokens.json`);
    writeFileSync(file, `${JSON.stringify(doc, null, 2)  }\n`);
    info(`✓ ${relative(ROOT_PATH, file)} — ${count} tokens${skipped.length ? `, ${skipped.length} unresolved` : ''}`);
    if (skipped.length) info(`    unresolved: ${skipped.slice(0, 6).join(', ')}${skipped.length > 6 ? ', …' : ''}`);
  }

  if (smallest < MINIMUM_TOKENS) {
    err(`\n✘ design tokens: only ${smallest} tokens in the smaller theme, expected at least ${MINIMUM_TOKENS}.`);
    err('  The parser has stopped matching the built stylesheet rather than the palette having shrunk.\n');
    process.exit(1);
  }
}

main();
