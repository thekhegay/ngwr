/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Adds `by @author in #123` right after every changelog entry's commit link,
 * which is not always the end of the line: a `Closes #12` footer follows it as
 * `, closes #12`. A rebase merge leaves no `(#123)` in the subject, so the
 * pull request comes from GitHub's commit-to-PR index. A commit pushed without
 * one names its author alone. The names are what the release page draws its
 * Contributors avatars from.
 */

import { ghApi } from '../github/gh-api';

const COMMIT_LINK = /\/commit\/([0-9a-f]{40})\)\)/;

export function withPullRequests(section: string, repo: string): string {
  return section
    .split('\n')
    .map(line => {
      const link = COMMIT_LINK.exec(line);
      if (!link) return line;
      const sha = link[1];
      const at = link.index + link[0].length;

      const pr = ghApi([
        `repos/${repo}/commits/${sha}/pulls`,
        '--jq',
        '[.[] | select(.merged_at != null and .base.ref == "main")][0] | if . then "\\(.user.login) \\(.number)" else "" end',
      ]);
      let by = '';
      if (pr) {
        const [login, number] = pr.split(' ');
        by = ` by @${login} in #${number}`;
      } else {
        const login = ghApi([`repos/${repo}/commits/${sha}`, '--jq', '.author.login // ""']);
        if (login) by = ` by @${login}`;
      }
      return `${line.slice(0, at)}${by}${line.slice(at)}`;
    })
    .join('\n');
}
