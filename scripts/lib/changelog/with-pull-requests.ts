/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Appends `by @author in #123` to every changelog entry. An entry ends in its
 * commit link, and a rebase merge leaves no `(#123)` in the subject, so the
 * pull request comes from GitHub's commit-to-PR index. A commit pushed without
 * one names its author alone. The names are what the release page draws its
 * Contributors avatars from.
 */

import { ghApi } from '../github/gh-api';

const COMMIT_LINK = /\/commit\/([0-9a-f]{40})\)\)$/;

export function withPullRequests(section: string, repo: string): string {
  return section
    .split('\n')
    .map(line => {
      const sha = COMMIT_LINK.exec(line)?.[1];
      if (!sha) return line;

      const pr = ghApi([
        `repos/${repo}/commits/${sha}/pulls`,
        '--jq',
        '[.[] | select(.merged_at != null and .base.ref == "main")][0] | if . then "\\(.user.login) \\(.number)" else "" end',
      ]);
      if (pr) {
        const [login, number] = pr.split(' ');
        return `${line} by @${login} in #${number}`;
      }

      const login = ghApi([`repos/${repo}/commits/${sha}`, '--jq', '.author.login // ""']);
      return login ? `${line} by @${login}` : line;
    })
    .join('\n');
}
