/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Writes a new version into `projects/lib/package.json` and syncs the
 * showcase's `NGWR_VERSION` constant so the docs footer always reflects
 * the published version.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { LIB_PKG_PATH } from '../paths/lib-pkg';
import { SHOWCASE_VERSION_PATH } from '../paths/showcase-version';

type Pkg = { version: string; [key: string]: unknown };

export function writeVersion(next: string): void {
  const pkg = JSON.parse(readFileSync(LIB_PKG_PATH, 'utf8')) as Pkg;
  pkg.version = next;
  writeFileSync(LIB_PKG_PATH, `${JSON.stringify(pkg, null, 2)}\n`);

  const showcase = readFileSync(SHOWCASE_VERSION_PATH, 'utf8');
  const updated = showcase.replace(/export const NGWR_VERSION = '[^']*';/, `export const NGWR_VERSION = '${next}';`);
  writeFileSync(SHOWCASE_VERSION_PATH, updated);
}
