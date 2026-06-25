/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Generates the machine-readable AI assets from library + showcase source, so
 * they never drift from the code:
 *
 *   - `llms-full.txt` — every ngwr entry point with its import path, selector(s),
 *     public exports, and description. The exhaustive companion to the curated
 *     `llms.txt`. Written to the repo root; shipped in the package (via
 *     copy-dist-assets) and served at ngwr.dev/llms-full.txt.
 *   - `projects/showcase/public/sitemap.xml` — every showcase route, served at
 *     ngwr.dev/sitemap.xml (the SPA's routes are otherwise invisible to crawlers).
 *
 * Wired into `build:lib` + `build:showcase`. Both outputs are generated
 * (gitignored) — never hand-edit them; edit this script.
 *
 * Usage:
 *   pnpm tsx scripts/gen-ai-assets.ts
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { info } from './lib/log/info';
import { ROOT_PATH } from './lib/paths/root';

const SITE = 'https://ngwr.dev';
const LIB_DIR = join(ROOT_PATH, 'projects/lib');
const COMPONENTS_DIR = join(ROOT_PATH, 'projects/showcase/app/components');
const GETTING_STARTED_DIR = join(ROOT_PATH, 'projects/showcase/app/getting-started');

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

const descriptionOf = (name: string): string => {
  const match = /description="([^"]*)"/s.exec(read(join(COMPONENTS_DIR, name, `${name}.html`)));
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
};

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
info(`✓ llms-full.txt — ${entries.length} entry points`);

// --- sitemap.xml -----------------------------------------------------------

const urls = [
  `${SITE}/`,
  ...dirsOnly(COMPONENTS_DIR).map(name => `${SITE}/components/${name}`),
  ...dirsOnly(GETTING_STARTED_DIR).map(name => `${SITE}/getting-started/${name}`),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>
`;

writeFileSync(join(ROOT_PATH, 'projects/showcase/public/sitemap.xml'), sitemap);
info(`✓ sitemap.xml — ${urls.length} URLs`);
