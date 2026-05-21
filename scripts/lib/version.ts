/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Reads / writes the published library's version and computes the next one
 * from a `Bump` choice. Also keeps the showcase's hard-coded `NGWR_VERSION`
 * constant in sync with the lib.
 *
 * RC bumps follow the convention used by most npm libraries:
 *   1.2.3        → 1.2.4-rc.0   (first RC for the next patch)
 *   1.2.4-rc.0   → 1.2.4-rc.1   (subsequent RCs)
 */

import { readFileSync, writeFileSync } from 'node:fs';

import semver from 'semver';

import { LIB_PKG, SHOWCASE_VERSION } from './paths';
import type { Bump } from './types';

type Pkg = { version: string; [key: string]: unknown };

/** Reads the current version from `projects/lib/package.json`. */
export function readCurrentVersion(): string {
  const pkg = JSON.parse(readFileSync(LIB_PKG, 'utf8')) as Pkg;
  return pkg.version;
}

/**
 * Writes a new version into `projects/lib/package.json` and syncs the
 * showcase's `NGWR_VERSION` constant so the docs footer always reflects
 * the published version.
 */
export function writeVersion(next: string): void {
  const pkg = JSON.parse(readFileSync(LIB_PKG, 'utf8')) as Pkg;
  pkg.version = next;
  writeFileSync(LIB_PKG, `${JSON.stringify(pkg, null, 2)}\n`);

  const showcase = readFileSync(SHOWCASE_VERSION, 'utf8');
  const updated = showcase.replace(/export const NGWR_VERSION = '[^']*';/, `export const NGWR_VERSION = '${next}';`);
  writeFileSync(SHOWCASE_VERSION, updated);
}

/** Computes the next version for the given bump kind, or `null` when the input is invalid. */
export function nextVersion(current: string, bump: Bump): string | null {
  if (bump === 'rc') {
    return semver.prerelease(current) ? semver.inc(current, 'prerelease', 'rc') : semver.inc(current, 'prepatch', 'rc');
  }
  return semver.inc(current, bump);
}
