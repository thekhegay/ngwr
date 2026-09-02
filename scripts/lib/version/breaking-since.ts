/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { execFileSync } from 'node:child_process';

/**
 * Subjects of the breaking commits landed since `ref`.
 *
 * Both conventional spellings count: a `!` on the type (`feat(select)!:`) and a
 * `BREAKING CHANGE:` footer. `conventional-changelog` already reads both when it
 * writes the changelog's breaking section, so a release carrying that heading on
 * a version that is not an `x.0.0` contradicts its own notes — which is exactly
 * the state v12.2.0 shipped in, and the reason this file exists.
 *
 * Records are NUL-separated by `git log -z`: a commit body legitimately contains
 * blank lines, so every text delimiter simple enough to write is also one a real
 * message can contain.
 */
export function breakingSince(ref: string): string[] {
  const log = execFileSync('git', ['log', '-z', '--format=%s%n%b', `${ref}..HEAD`], {
    encoding: 'utf8',
  });

  return log
    .split('\0')
    .map(c => c.trim())
    .filter(Boolean)
    .filter(c => /^[a-z]+(\([^)]*\))?!:/m.test(c) || /^BREAKING[ -]CHANGE:/m.test(c))
    .map(c => c.split('\n')[0] ?? '');
}

/** The newest release tag, or `null` when the repository has none yet. */
export function lastReleaseTag(): string | null {
  const tags = execFileSync('git', ['tag', '--sort=-v:refname'], { encoding: 'utf8' })
    .split('\n')
    .map(t => t.trim())
    .filter(t => /^v\d+\.\d+\.\d+$/.test(t));

  return tags[0] ?? null;
}
