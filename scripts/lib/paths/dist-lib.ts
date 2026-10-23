/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Absolute path to the lib's build output (`@angular/build:library`). */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { exit } from 'node:process';

import { err } from '../log/err';

import { ROOT_PATH } from './root';

export const DIST_LIB_PATH = resolve(ROOT_PATH, 'dist/lib');

/** Exits 1 when `dist/lib` is missing, naming the step in `label` and the build to run first. */
export function requireBuiltLib(label: string): void {
  if (existsSync(DIST_LIB_PATH)) return;

  err(`\n✘ ${label}: dist/lib not found. Run \`pnpm build:lib\` first.\n`);
  exit(1);
}
