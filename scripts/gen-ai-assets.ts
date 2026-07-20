/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Generates `llms-full.txt` from library + showcase source, so it never drifts
 * from the code: every ngwr entry point with its import path, selector(s),
 * public exports, and description. The exhaustive companion to the curated
 * `llms.txt`. Written to the repo root; shipped in the package (via
 * copy-dist-assets) and served at ngwr.dev/llms-full.txt.
 *
 * Wired into `build:lib` + `build:showcase`. The output is generated
 * (gitignored) — never hand-edit it; edit this script. (The sitemap is a
 * separate post-build step, `scripts/gen-sitemap.ts`, because it needs the
 * prerendered route list, which only exists after the showcase build.)
 *
 * Usage:
 *   pnpm tsx scripts/gen-ai-assets.ts
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { info } from './lib/log/info';
import { ROOT_PATH } from './lib/paths/root';

const LIB_DIR = join(ROOT_PATH, 'projects/lib');
const REFERENCE_DIR = join(ROOT_PATH, 'projects/showcase/app/reference');

const dirsOnly = (path: string): string[] =>
  existsSync(path)
    ? readdirSync(path, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort()
    : [];

const read = (path: string): string => (existsSync(path) ? readFileSync(path, 'utf8') : '');

// --- llms-full.txt ---------------------------------------------------------

const selectorsOf = (entryDir: string): string[] => {
  const out = new Set<string>();
  for (const file of readdirSync(entryDir)) {
    if (!file.endsWith('.ts') || file.endsWith('.spec.ts')) continue;
    for (const match of read(join(entryDir, file)).matchAll(/selector:\s*'([^']+)'/g)) {
      out.add(match[1]);
    }
  }
  return [...out];
};

const exportsOf = (entryDir: string): string[] => {
  const out = new Set<string>();
  for (const match of read(join(entryDir, 'public-api.ts')).matchAll(/export\s+(?:type\s+)?\{([^}]+)\}/g)) {
    for (const symbol of match[1].split(',')) {
      const name = symbol.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) out.add(name);
    }
  }
  return [...out];
};

/**
 * Map a lib-entry name to its reference doc-page description. The pages live at
 * `app/reference/<cluster>/<name>/<name>.html` (components, directives, pipes,
 * services, …); walking the tree instead of a hard-coded path keeps this
 * working across doc reorganisations — the mistake that once silently emptied
 * these assets was a generator pinned to `app/components`.
 */
const descriptions = ((): Map<string, string> => {
  const map = new Map<string, string>();
  for (const cluster of dirsOnly(REFERENCE_DIR)) {
    const clusterDir = join(REFERENCE_DIR, cluster);
    for (const name of dirsOnly(clusterDir)) {
      const match = /description="([^"]*)"/s.exec(read(join(clusterDir, name, `${name}.html`)));
      if (match) map.set(name, match[1].replace(/\s+/g, ' ').trim());
    }
  }
  return map;
})();

const descriptionOf = (name: string): string => descriptions.get(name) ?? '';

const entries = dirsOnly(LIB_DIR).filter(name => existsSync(join(LIB_DIR, name, 'public-api.ts')));

let full = `# ngwr — full reference

> Generated from the library source: every entry point with its import path,
> selector(s), public exports, and description. For exact input / output
> signatures read the bundled \`.d.ts\` types. Concise quick-ref: /llms.txt
`;

for (const name of entries) {
  const dir = join(LIB_DIR, name);
  const selectors = selectorsOf(dir);
  const exports = exportsOf(dir);
  const description = descriptionOf(name);

  full += `\n## ngwr/${name}\n`;
  full += `- import: \`import { ${exports[0] ?? '…'} } from 'ngwr/${name}'\`\n`;
  if (selectors.length) full += `- selector: ${selectors.map(selector => `\`${selector}\``).join(', ')}\n`;
  if (exports.length) full += `- exports: ${exports.join(', ')}\n`;
  if (description) full += `- ${description}\n`;
}

writeFileSync(join(ROOT_PATH, 'llms-full.txt'), full);
info(`✓ llms-full.txt — ${entries.length} entry points, ${descriptions.size} descriptions`);
