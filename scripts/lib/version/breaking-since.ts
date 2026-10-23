/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { commitsSince } from './commits-since';
import { lastReleaseTag } from './previous-tag';

/**
 * Subjects of the breaking commits landed since `ref`.
 *
 * Both conventional spellings count: a `!` on the type (`feat(select)!:`) and a
 * `BREAKING CHANGE:` footer. `conventional-changelog` already reads both when it
 * writes the changelog's breaking section, so a release carrying that heading on
 * a version that is not an `x.0.0` contradicts its own notes — which is exactly
 * the state v12.2.0 shipped in, and the reason this file exists.
 */
/**
 * Subjects of the library features since `ref`, which make an RC a candidate
 * for the next minor. A `showcase` scope changes ngwr.dev rather than the
 * package, so it does not count.
 */
export function featuresSince(ref: string): string[] {
  return commitsSince(ref)
    .map(c => c.message.split('\n')[0] ?? '')
    .filter(subject => /^feat(\((?!showcase)[^)]*\))?:/.test(subject));
}

export function breakingSince(ref: string): string[] {
  return commitsSince(ref)
    .map(c => c.message)
    .filter(c => /^[a-z]+(\([^)]*\))?!:/m.test(c) || /^BREAKING[ -]CHANGE:/m.test(c))
    .map(c => c.split('\n')[0] ?? '');
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

  return commitsSince(ref)
    .map(c => c.message)
    .filter(commit => {
      const from = commit.search(/^BREAKING[ -]CHANGE:/m);
      if (from < 0) return false;
      // Skip the `BREAKING CHANGE:` line itself; look at what follows it.
      const body = commit.slice(from).split('\n').slice(1);
      return body.some(line => /^[a-z][\w-]*:/i.test(line));
    })
    .map(commit => commit.split('\n')[0] ?? '');
}
