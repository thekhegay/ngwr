/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Writes `projects/lib/package.json`'s `exports` map from the entry-point tree.
 *
 * `@angular/build:library` derives what to compile from `exports` alone: a key
 * whose value resolves through `default` to a `.ts` file is an entry point, and
 * a key that resolves to anything else — a stylesheet, a JSON file — is copied
 * into the published manifest untouched. ng-packagr read a nested
 * `ng-package.json` per folder instead, so the map only ever carried the `sass`
 * conditions and the JS half was generated at build time.
 *
 * Patterns do not help here. `exports` supports `./*` and Node resolves it, but
 * the builder's `normalizeEntryPoints` iterates the literal keys, so a pattern
 * key becomes an entry point named `*` whose target is not a real file. Every
 * subpath has to be spelled out, which is why this is generated rather than
 * written: 229 of them, and one missing key is an entry point that silently
 * stops being published.
 */

const LIB = resolve('projects/lib');
const MANIFEST = join(LIB, 'package.json');

/** Keys that are not entry points and must survive verbatim, in this order. */
const PASSTHROUGH: readonly (readonly [string, unknown])[] = [
  ['./package.json', { default: './package.json' }],
  ['./schematics/*', './schematics/*'],
  ['./i18n/*.json', './i18n/*.json'],
];

const SKIP = new Set(['node_modules', 'schematics', 'styles', 'mcp', '_svg']);

/**
 * Every directory holding a `public-api.ts`, relative to the library root.
 *
 * That file IS the entry point now. Discovery used to key on a nested
 * `ng-package.json` beside it, which ng-packagr read and `@angular/build`
 * does not; those files are deleted, so the one that carries the exports is
 * the one to look for.
 */
function entryPoints(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith('.') || SKIP.has(name)) continue;
    const full = join(dir, name);
    if (!statSync(full).isDirectory()) continue;
    if (readdirSync(full).includes('public-api.ts')) out.push(relative(LIB, full));
    entryPoints(full, out);
  }
  return out;
}

function main(): void {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as Record<string, unknown>;
  const previous = (manifest['exports'] ?? {}) as Record<string, unknown>;

  const exportsMap: Record<string, unknown> = {};
  for (const [key, value] of PASSTHROUGH) exportsMap[key] = value;

  // Primary entry point. The library root has no `public-api.ts` of its own
  // beyond the ng-packagr placeholder, which is still the file to point at.
  exportsMap['.'] = { sass: './styles.scss', default: './public-api.ts' };

  for (const name of entryPoints(LIB)) {
    const key = `./${name.split('\\').join('/')}`;
    const entry: Record<string, string> = {};
    // `sass` comes FIRST, because Node resolves conditions in declaration order
    // and `default` matches anything. Read from the tree rather than copied
    // from the previous map: a moved entry point keeps its stylesheet and
    // changes its key, and a lookup by key would silently drop the condition.
    // A condition the map already carried WINS, as long as the file is still
    // there: `./theme` deliberately points at `theme/_index.scss` rather than
    // `theme/styles/_index.scss`, so deriving would quietly repoint the one
    // entry whose public Sass surface is not where the pattern says.
    const prev = previous[key];
    const kept = prev && typeof prev === 'object' ? (prev as Record<string, string>)['sass'] : undefined;
    const derived = `./${name}/styles/_index.scss`;
    if (kept && existsSync(join(LIB, kept))) entry['sass'] = kept;
    else if (existsSync(join(LIB, derived))) entry['sass'] = derived;
    entry['default'] = `./${name}/public-api.ts`;
    exportsMap[key] = entry;
  }

  // Style-only subpaths with no directory of their own — `./theme`, `./grid`,
  // `./animations` and friends, which point straight at a partial. Carried
  // over from the previous map, and only while the file they name still
  // exists: that is what stops a deleted or moved entry point living on as a
  // key nothing backs.
  for (const [key, value] of Object.entries(previous)) {
    if (key in exportsMap) continue;
    if (PASSTHROUGH.some(([k]) => k === key)) continue;
    const target = typeof value === 'object' && value !== null ? (value as Record<string, string>)['sass'] : undefined;
    if (!target || !existsSync(join(LIB, target))) continue;
    exportsMap[key] = { sass: target };
  }

  manifest['exports'] = exportsMap;
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

  const compiled = Object.values(exportsMap).filter(
    v => typeof v === 'object' && v !== null && 'default' in (v as object)
  ).length;
  console.log(`✓ projects/lib/package.json — ${Object.keys(exportsMap).length} exports keys, ${compiled} compiled entry points`);
}

main();
