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
const repoRoot = resolve(__dirname, '..');
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

function buildSet({ name, dir }) {
  const abs = join(repoRoot, dir);
  if (!existsSync(abs)) {
    console.warn(`[icons:sets] ${name} — source missing: ${dir}`);
    return null;
  }
  const files = readdirSync(abs).filter((f) => f.endsWith('.svg'));
  const out = {};
  for (const file of files.sort()) {
    const key = stripExt(file);
    out[key] = readFileSync(join(abs, file), 'utf8').trim();
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
