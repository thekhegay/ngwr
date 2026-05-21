/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Writes a new version into `projects/lib/package.json` and syncs the lib's
 * `WR_VERSION` constant — the single source of truth consumed by both the
 * library and the showcase footer via `ngwr/version`.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { LIB_PKG_PATH } from '../paths/lib-pkg';
import { LIB_VERSION_PATH } from '../paths/lib-version';

type Pkg = { version: string; [key: string]: unknown };

export function writeVersion(next: string): void {
  const pkg = JSON.parse(readFileSync(LIB_PKG_PATH, 'utf8')) as Pkg;
  pkg.version = next;
  writeFileSync(LIB_PKG_PATH, `${JSON.stringify(pkg, null, 2)}\n`);

  const versionTs = readFileSync(LIB_VERSION_PATH, 'utf8');
  const updated = versionTs.replace(/export const WR_VERSION = '[^']*';/, `export const WR_VERSION = '${next}';`);
  writeFileSync(LIB_VERSION_PATH, updated);
}
