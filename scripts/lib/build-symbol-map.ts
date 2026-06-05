/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Scans every `projects/lib/<entry>/public-api.ts` and produces a
 * `{ WrSymbol: 'ngwr/<entry>' }` map. Shipped alongside the `use`
 * schematic so `ng g ngwr:use WrFoo` knows which subpath to import from.
 *
 * The mapping is intentionally dumb: it counts any `export { WrFoo }` /
 * `export { WrFoo as Bar }` symbol regardless of whether `WrFoo` is a
 * directive, component, or service — that's what users type at the
 * command line, and the import line is identical in every case.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { ROOT_PATH } from './paths/root';

const LIB_ROOT = resolve(ROOT_PATH, 'projects/lib');

/** Matches `export { WrFoo, WrBar as Baz, type Quux } from './…';` and bare-export forms. */
const EXPORT_RE = /export\s*(?:type\s*)?\{([^}]+)\}/g;
const SYMBOL_RE = /\b(Wr[A-Z][A-Za-z0-9_]*)\b/g;

/** Sub-directories that aren't actual public entry-points (no ng-package.json). */
function isEntryPoint(dir: string): boolean {
  try {
    statSync(resolve(LIB_ROOT, dir, 'public-api.ts'));
    statSync(resolve(LIB_ROOT, dir, 'ng-package.json'));
    return true;
  } catch {
    return false;
  }
}

/** Read all `Wr*` symbols re-exported from `<entry>/public-api.ts`. */
function symbolsIn(entry: string): readonly string[] {
  const file = resolve(LIB_ROOT, entry, 'public-api.ts');
  const source = readFileSync(file, 'utf8');
  const out = new Set<string>();
  for (const match of source.matchAll(EXPORT_RE)) {
    const body = match[1];
    for (const sym of body.matchAll(SYMBOL_RE)) {
      out.add(sym[1]);
    }
  }
  // Also catch single-line `export { WrFoo } from '...';` and `export * …`.
  // (The `*` form is intentionally dropped — we can't enumerate it without
  // re-running tsc against the referenced file.)
  return Array.from(out);
}

/** Build the full symbol → subpath map. */
export function buildSymbolMap(): Record<string, string> {
  const entries = readdirSync(LIB_ROOT)
    .filter(name => !name.startsWith('.'))
    .filter(name => {
      try {
        return statSync(resolve(LIB_ROOT, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .filter(isEntryPoint)
    .sort();

  const map: Record<string, string> = {};
  for (const entry of entries) {
    const subpath = `ngwr/${entry}`;
    for (const sym of symbolsIn(entry)) {
      if (map[sym] && map[sym] !== subpath) {
        // First wins — the order in `entries` is alphabetical and entries
        // don't intentionally re-export each other; collisions here are a
        // signal something is off in the source, not the consumer's problem.
        continue;
      }
      map[sym] = subpath;
    }
  }
  return map;
}
