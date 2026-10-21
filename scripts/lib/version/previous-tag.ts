/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { execFileSync } from 'node:child_process';

/**
 * The `vX.Y.Z` tags, newest first, candidates included with `includeRc`.
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

/** The newest stable release tag, or `null`; candidates are skipped because a major is staged on them. */
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
