/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Symlinks `node_modules/ngwr` at `projects/lib`, so the sandbox app resolves
 * the library the way a consumer does.
 *
 * TypeScript already has `ngwr/*` in `tsconfig.json`'s `paths`, but **Sass does
 * not read that map**. `@use 'ngwr/button'` is resolved by looking up a real
 * package and reading the `sass` condition out of its `exports` — so without a
 * package at that name the sandbox cannot spell its imports the way the docs
 * tell a consumer to, which is the one thing the sandbox exists to check.
 *
 * A symlink rather than a pnpm workspace member: making `projects/lib` a
 * workspace package would put its peers into the install graph, rewrite the
 * lockfile and change what `--frozen-lockfile` verifies in CI — a lot of blast
 * radius for a scratch app. This runs from `postinstall`, costs nothing, and
 * nothing outside the sandbox depends on it.
 */

import { existsSync, lstatSync, mkdirSync, symlinkSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const LINK = join(ROOT, 'node_modules', 'ngwr');
const TARGET = join('..', 'projects', 'lib');

mkdirSync(join(ROOT, 'node_modules'), { recursive: true });

// `existsSync` follows the link, so a dangling one reads as absent — `lstat` is
// what sees the link itself.
let present: boolean;
try {
  present = lstatSync(LINK).isSymbolicLink();
} catch {
  present = false;
}

if (present) {
  unlinkSync(LINK);
} else if (existsSync(LINK)) {
  // A real directory at that name means something installed `ngwr` for real.
  // Replacing it would be destructive, so say so and stop.
  console.error('ngwr: node_modules/ngwr is a real directory, not a link — leaving it alone.');
  process.exit(0);
}

symlinkSync(TARGET, LINK, 'dir');
console.log('✓ node_modules/ngwr → projects/lib');
