/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Compiles the lib's schematic source and stages collection.json / schema
 * JSON files alongside the generated JS, so the published tarball contains
 * a runnable `ng add` collection.
 *
 * Layout produced under `dist/lib/schematics/`:
 *
 *   collection.json
 *   ng-add/
 *     index.js
 *     schema.json
 *
 * Wired into `build:lib` so local builds and CI ship the same artifact.
 *
 * Usage:
 *   pnpm tsx scripts/build-schematics.ts
 */

import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { exit } from 'node:process';

import { err } from './lib/log/err';
import { info } from './lib/log/info';
import { DIST_LIB_PATH } from './lib/paths/dist-lib';
import { ROOT_PATH } from './lib/paths/root';

const SRC = resolve(ROOT_PATH, 'projects/lib/schematics');
const TSCONFIG = resolve(SRC, 'tsconfig.json');
const DST = resolve(DIST_LIB_PATH, 'schematics');

/** JSON assets that must ship next to the compiled JS. */
const ASSETS = [
  ['collection.json', 'collection.json'],
  ['migrations.json', 'migrations.json'],
  ['ng-add/schema.json', 'ng-add/schema.json'],
  ['icon-set/schema.json', 'icon-set/schema.json'],
] as const;

if (!existsSync(DIST_LIB_PATH)) {
  err(`dist/lib does not exist — run "pnpm build:lib" first.`);
  exit(1);
}

info(`▸ Compiling schematics with ${TSCONFIG}`);
execSync(`pnpm exec tsc -p ${TSCONFIG}`, { stdio: 'inherit' });

for (const [src, dst] of ASSETS) {
  const from = resolve(SRC, src);
  const to = resolve(DST, dst);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  info(`✓ Copied ${src} → ${to}`);
}

info('✓ Schematics ready under dist/lib/schematics');
