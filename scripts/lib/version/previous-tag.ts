/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The newest release tag other than the one for `version`: the tag a release
 * being cut compares against. Release candidates count, so a stable release
 * after candidates compares against the last candidate, as the CHANGELOG
 * section does.
 */

import { execFileSync } from 'node:child_process';

export function previousTag(version: string): string | undefined {
  const tag = `v${version}`;
  // Without the suffix setting git sorts `v1.2.0-rc.1` above `v1.2.0`, so the
  // release after a stable one that had candidates would compare against an rc.
  return execFileSync('git', ['-c', 'versionsort.suffix=-rc.', 'tag', '--sort=-v:refname'], { encoding: 'utf8' })
    .split('\n')
    .find(t => /^v\d+\.\d+\.\d+(-rc\.\d+)?$/.test(t) && t !== tag);
}
