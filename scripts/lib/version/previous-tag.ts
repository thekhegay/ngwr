/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { execFileSync } from 'node:child_process';

/**
 * The release tags, newest first: every `vX.Y.Z`, plus every `vX.Y.Z-rc.N`
 * with `includeRc`.
 *
 * Without the suffix setting git sorts `v1.2.0-rc.1` above `v1.2.0`, so the
 * release after a stable one that had candidates would compare against an rc.
 */
function releaseTags(options: { readonly includeRc: boolean }): string[] {
  const pattern = options.includeRc ? /^v\d+\.\d+\.\d+(-rc\.\d+)?$/ : /^v\d+\.\d+\.\d+$/;
  return execFileSync('git', ['-c', 'versionsort.suffix=-rc.', 'tag', '--sort=-v:refname'], { encoding: 'utf8' })
    .split('\n')
    .map(t => t.trim())
    .filter(t => pattern.test(t));
}

/**
 * The newest STABLE release tag, or `null` when there is none: what the
 * breaking-change gate measures from, since a candidate is where a major is
 * staged.
 */
export function lastReleaseTag(): string | null {
  return releaseTags({ includeRc: false })[0] ?? null;
}

/**
 * The newest release tag other than the one for `version`: the tag a release
 * being cut compares against. Release candidates count, so a stable release
 * after candidates compares against the last candidate, as the CHANGELOG
 * section does.
 */
export function previousTag(version: string): string | undefined {
  return releaseTags({ includeRc: true }).find(t => t !== `v${version}`);
}
