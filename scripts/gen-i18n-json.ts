/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Emits `dist/lib/i18n/<locale>.json` from the TypeScript catalogs.
 *
 * The catalogs ship as TS modules, which is right for `provideWrI18nStaticLoader`
 * (spread them and tree-shake what you don't use) but useless for
 * `provideWrI18nHttpLoader` — you cannot serve a `.ts` file from `assets/`. So
 * consumers on the HTTP path had no supported way to include ngwr's own strings,
 * and every built-in label silently fell back to its hardcoded English default.
 *
 * With these files a consumer can either copy them straight into their assets or
 * merge them into their own locale JSON in a build step.
 *
 * Wired into `build:lib`, so the JSON can never drift from the TS source.
 *
 * Usage:
 *   pnpm tsx scripts/gen-i18n-json.ts
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { exit } from 'node:process';

import { err } from './lib/log/err';
import { info } from './lib/log/info';
import { DIST_LIB_PATH } from './lib/paths/dist-lib';
import { ROOT_PATH } from './lib/paths/root';

const I18N_SRC = resolve(ROOT_PATH, 'projects/lib/i18n');

if (!existsSync(DIST_LIB_PATH)) {
  err(`dist/lib does not exist — run "pnpm build:lib" first.`);
  exit(1);
}

/** Locale folders are the ones holding a catalog next to their public-api. */
const locales = readdirSync(I18N_SRC, { withFileTypes: true })
  .filter(e => e.isDirectory() && existsSync(resolve(I18N_SRC, e.name, 'public-api.ts')))
  .map(e => e.name);

if (!locales.length) {
  err(`No locale catalogs found under ${I18N_SRC}`);
  exit(1);
}

const outDir = resolve(DIST_LIB_PATH, 'i18n');
mkdirSync(outDir, { recursive: true });

for (const locale of locales) {
  const mod = (await import(resolve(I18N_SRC, locale, 'public-api.ts'))) as Record<string, unknown>;
  // Each catalog is the single non-type export, e.g. `wrEn` / `wrRu`.
  const catalog = Object.values(mod).find(v => v && typeof v === 'object');
  if (!catalog) {
    err(`Skipping ${locale}: no catalog object exported`);
    continue;
  }
  const dst = resolve(outDir, `${locale}.json`);
  writeFileSync(dst, `${JSON.stringify(catalog, null, 2)}\n`);
  const keys = countKeys(catalog as Record<string, unknown>);
  info(`✓ i18n/${locale}.json — ${keys} keys`);
}

function countKeys(obj: Record<string, unknown>): number {
  let n = 0;
  for (const v of Object.values(obj)) {
    n += v && typeof v === 'object' ? countKeys(v as Record<string, unknown>) : 1;
  }
  return n;
}
