/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { execFileSync } from 'node:child_process';

/** One commit as `git log` reports it. */
export interface Commit {
  /** The full hash. */
  readonly sha: string;
  /** `%s`: the first paragraph of the message, on one line. */
  readonly subject: string;
  /** The subject and the body, trimmed. */
  readonly message: string;
}

/**
 * The commits on HEAD since `ref`, newest first, or the whole history when
 * `ref` is `null`.
 *
 * Records are NUL-separated by `git log -z`: a commit body legitimately contains
 * blank lines, so every text delimiter simple enough to write is also one a real
 * message can contain. `--no-show-signature` because `log.showSignature` prints
 * gpg's lines into the same stream, ahead of the hash.
 */
export function commitsSince(ref: string | null): Commit[] {
  const range = ref ? `${ref}..HEAD` : 'HEAD';
  const log = execFileSync('git', ['log', '--no-show-signature', '-z', '--format=%H%n%s%n%b', range], {
    encoding: 'utf8',
    // Bodies make a whole-history read several times the size of a subject list.
    maxBuffer: 256 * 1024 * 1024,
  });

  return log
    .split('\0')
    .filter(Boolean)
    .map(record => {
      const sha = record.slice(0, record.indexOf('\n'));
      const text = record.slice(sha.length + 1);
      return { sha, subject: text.slice(0, text.indexOf('\n')), message: text.trim() };
    });
}
