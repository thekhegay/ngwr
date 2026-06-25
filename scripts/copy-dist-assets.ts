/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Copies repository-level publishing assets (README, LICENSE + llms.txt) into
 * the lib's ng-packagr output so `dist/lib` is publish-ready out of the box.
 * `llms.txt` ships an agent/LLM quick-ref so tools that install ngwr can
 * orient themselves straight from `node_modules/ngwr`.
 *
 * Wired into the `build:lib` script so local builds and CI produce the same
 * tarball — no separate "copy" step needed in the publish workflow.
 *
 * Usage:
 *   pnpm tsx scripts/copy-dist-assets.ts
 */

import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { exit } from 'node:process';

import { err } from './lib/log/err';
import { info } from './lib/log/info';
import { DIST_LIB_PATH } from './lib/paths/dist-lib';
import { ROOT_PATH } from './lib/paths/root';

const ASSETS = ['README.md', 'LICENSE', 'llms.txt', 'llms-full.txt'] as const;

if (!existsSync(DIST_LIB_PATH)) {
  err(`dist/lib does not exist — run "pnpm build:lib" first.`);
  exit(1);
}

for (const name of ASSETS) {
  const src = resolve(ROOT_PATH, name);
  const dst = resolve(DIST_LIB_PATH, name);
  if (!existsSync(src)) {
    err(`Skipping ${name}: not found at ${src}`);
    continue;
  }
  copyFileSync(src, dst);
  info(`✓ Copied ${name} → ${dst}`);
}
