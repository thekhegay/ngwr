/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Reads the current version from `projects/lib/package.json`. */

import { readFileSync } from 'node:fs';

import { LIB_PKG_PATH } from '../paths/lib-pkg';

type Pkg = { version: string };

export function readCurrentVersion(): string {
  const pkg = JSON.parse(readFileSync(LIB_PKG_PATH, 'utf8')) as Pkg;
  return pkg.version;
}
