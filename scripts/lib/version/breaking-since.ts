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

/**
 * Subjects of breaking commits whose note will be CUT SHORT in the changelog.
 *
 * `conventional-changelog` ends a `BREAKING CHANGE:` body at the first line that
 * looks like another git trailer — `word:` — and says nothing about it. v14's
 * date entry wrapped onto a line beginning `calendar: 'gregory'.` and lost both
 * the rest of that sentence and the whole `<wr-pagination ofLabel>` removal; the
 * GitHub release body is extracted from the same section, so the published note
 * lost it too.
 *
 * A warning rather than a refusal: the commit is already written and pushed by
 * the time anyone runs this, so the actionable fix is to correct the generated
 * section in the release PR. Refusing would only block a release over a message
 * nobody can now rewrite.
 */
export function truncatedBreakingNotes(): string[] {
  const ref = lastReleaseTag();
  if (!ref) return [];

  const log = execFileSync('git', ['log', '-z', '--format=%s%n%b', `${ref}..HEAD`], { encoding: 'utf8' });

  return log
    .split('\0')
    .map(c => c.trim())
    .filter(Boolean)
    .filter(commit => {
      const from = commit.search(/^BREAKING[ -]CHANGE:/m);
      if (from < 0) return false;
      // Skip the `BREAKING CHANGE:` line itself; look at what follows it.
      const body = commit.slice(from).split('\n').slice(1);
      return body.some(line => /^[a-z][\w-]*:/i.test(line));
    })
    .map(commit => commit.split('\n')[0] ?? '');
}
