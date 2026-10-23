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
 * An RC from a stable version is a candidate for the next major when breaking
 * commits have landed since it, for the next minor when library features have,
 * else for the next patch; an RC from an RC counts up:
 *   1.2.3        → 2.0.0-rc.0   (breaking commits since v1.2.3)
 *   1.2.3        → 1.3.0-rc.0   (features)
 *   1.2.3        → 1.2.4-rc.0   (neither)
 *   2.0.0-rc.0   → 2.0.0-rc.1
 */

import semver from 'semver';

import type { ReleaseType } from '../release-type';

export function nextVersion(
  current: string,
  type: ReleaseType,
  since: { readonly breaking?: boolean; readonly features?: boolean } = {}
): string | null {
  if (type === 'rc') {
    if (semver.prerelease(current)) return semver.inc(current, 'prerelease', 'rc');
    const level = since.breaking ? 'premajor' : since.features ? 'preminor' : 'prepatch';
    return semver.inc(current, level, 'rc');
  }
  return semver.inc(current, type);
}
