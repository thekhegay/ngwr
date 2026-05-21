/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Release bump kind selected by the maintainer when triggering the Release PR
 * workflow. `rc` cuts a prerelease cycle published to the npm dist-tag `next`.
 */
export type ReleaseType = 'patch' | 'minor' | 'major' | 'rc';
