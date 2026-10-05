#!/usr/bin/env node
/**
 * Build per-set JSON catalogs of icon SVGs for the showcase's
 * `/icons/<set>` browser pages.
 *
 * Walks the relevant node_modules folders, reads every `.svg`, strips
 * leading/trailing whitespace, and writes `{name: svgString}` JSON to
 * `projects/showcase/app/icons/_generated/<set>.json`.
 *
 * Run via `pnpm icons:sets` (also wired to `postinstall` so a fresh
 * clone has the data ready). Output folder is gitignored — re-running
 * is cheap (<1s).
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const outDir = join(repoRoot, 'projects/showcase/app/icons/_generated');

const SETS = [
  { name: 'tabler', dir: 'node_modules/@tabler/icons/icons/outline' },
  { name: 'phosphor', dir: 'node_modules/@phosphor-icons/core/assets/regular' },
  { name: 'heroicons', dir: 'node_modules/heroicons/24/outline' },
  { name: 'iconoir', dir: 'node_modules/iconoir/icons/regular' },
  { name: 'bootstrap', dir: 'node_modules/bootstrap-icons/icons' },
  // Radix Icons don't ship as raw SVGs on npm (`@radix-ui/react-icons`
  // is React-only). Vendored from radix-ui/icons on github.
  { name: 'radix', dir: 'projects/showcase/app/icons/svg-only/_radix-svgs' },
];

function stripExt(file) {
  return file.replace(/\.svg$/, '');
}

/**
 * Makes an icon follow the colour it lands in.
 *
 * The grid paints the tile `--wr-color-on-surface` and every icon is expected
 * to resolve `currentColor`. Five iconoir icons do not: `emoji-puzzled` and
 * `piggy-bank` ship `fill="black"`, and `git`, `rhombus-arrow-right` and
 * `snapchat` ship `fill="white"`. The SVG reaches the DOM through
 * `[innerHTML]`, so a presentation attribute inside injected markup is beyond
 * any stylesheet without `!important`, and overriding every fill would flatten
 * the knock-out shapes that make `git` and `snapchat` legible. Light hides it —
 * black is close enough to the ink and white to the tile — and dark inverts
 * both: the black pair vanishes into the canvas, the white trio becomes bright
 * blobs where a hole was meant. Nothing could report it: `check:tokens` does
 * not read SVG attributes and axe ships no rule for a graphic's fill.
 *
 * `black` becomes `currentColor` so the shape follows the text, and `white`
 * becomes the surface role so a knock-out stays a knock-out in both themes.
 * Every other set is already clean, so this normalises rather than rewrites.
 */
function themeable(svg) {
  return svg
    .replace(/(fill|stroke)="(?:black|#000(?:000)?)"/gi, '$1="currentColor"')
    .replace(/(fill|stroke)="(?:white|#fff(?:fff)?)"/gi, '$1="var(--wr-color-surface)"');
}

function buildSet({ name, dir }) {
  const abs = join(repoRoot, dir);
  if (!existsSync(abs)) {
    console.warn(`[icons:sets] ${name} — source missing: ${dir}`);
    return null;
  }
  const files = readdirSync(abs).filter(f => f.endsWith('.svg'));
  const out = {};
  for (const file of files.sort()) {
    const key = stripExt(file);
    out[key] = themeable(readFileSync(join(abs, file), 'utf8').trim());
  }
  return out;
}

mkdirSync(outDir, { recursive: true });

let total = 0;
for (const set of SETS) {
  const data = buildSet(set);
  if (!data) continue;
  const path = join(outDir, `${set.name}.json`);
  writeFileSync(path, JSON.stringify(data));
  console.log(`[icons:sets] ${set.name} — ${Object.keys(data).length} icons → ${path}`);
  total += Object.keys(data).length;
}

console.log(`[icons:sets] done — ${total} icons total`);
