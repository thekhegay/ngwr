/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Computes the next semver version for a given release type, or `null` when
 * the input is invalid.
 *
 * RC bumps follow the convention used by most npm libraries:
 *   1.2.3        → 1.2.4-rc.0   (first RC for the next patch)
 *   1.2.4-rc.0   → 1.2.4-rc.1   (subsequent RCs)
 */

import semver from 'semver';

import type { ReleaseType } from '../release-type';

export function nextVersion(current: string, type: ReleaseType): string | null {
  if (type === 'rc') {
    return semver.prerelease(current) ? semver.inc(current, 'prerelease', 'rc') : semver.inc(current, 'prepatch', 'rc');
  }
  return semver.inc(current, type);
}
