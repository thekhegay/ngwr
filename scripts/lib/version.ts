/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Reads / writes the published library's version and computes the next one
 * from a `Bump` choice.
 *
 * RC bumps follow the convention used by most npm libraries:
 *   1.2.3        → 1.2.4-rc.0   (first RC for the next patch)
 *   1.2.4-rc.0   → 1.2.4-rc.1   (subsequent RCs)
 */

import { readFileSync, writeFileSync } from 'node:fs';

import semver from 'semver';

import type { Bump } from './bump';
import { LIB_PKG } from './paths';

type Pkg = { version: string; [key: string]: unknown };

/** Reads the current version from `projects/lib/package.json`. */
export function readCurrentVersion(): string {
  const pkg = JSON.parse(readFileSync(LIB_PKG, 'utf8')) as Pkg;
  return pkg.version;
}

/** Writes a new version into `projects/lib/package.json`, preserving JSON layout. */
export function writeVersion(next: string): void {
  const pkg = JSON.parse(readFileSync(LIB_PKG, 'utf8')) as Pkg;
  pkg.version = next;
  writeFileSync(LIB_PKG, `${JSON.stringify(pkg, null, 2)}\n`);
}

/** Computes the next version for the given bump kind, or `null` when the input is invalid. */
export function nextVersion(current: string, bump: Bump): string | null {
  if (bump === 'rc') {
    return semver.prerelease(current) ? semver.inc(current, 'prerelease', 'rc') : semver.inc(current, 'prepatch', 'rc');
  }
  return semver.inc(current, bump);
}
