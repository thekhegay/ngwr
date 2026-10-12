/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The New Contributors list and the Full Changelog link, taken from the notes
 * GitHub would generate itself for the same range. The release pull request is
 * opened by github-actions, which contributed nothing the section lists, so it
 * is left out.
 */

import { execFileSync } from 'node:child_process';
import { env } from 'node:process';

import { ghApi } from '../github/gh-api';

export function releaseFooter(repo: string, version: string): string {
  const tag = `v${version}`;
  // Without the suffix setting git sorts `v1.2.0-rc.1` above `v1.2.0`, so the
  // release after a stable one that had candidates would compare against an rc.
  const previous = execFileSync('git', ['-c', 'versionsort.suffix=-rc.', 'tag', '--sort=-v:refname'], {
    encoding: 'utf8',
  })
    .split('\n')
    .find(t => /^v\d+\.\d+\.\d+(-rc\.\d+)?$/.test(t) && t !== tag);

  const notes = ghApi([
    '--method',
    'POST',
    `repos/${repo}/releases/generate-notes`,
    '-f',
    `tag_name=${tag}`,
    '-f',
    `target_commitish=${env['GITHUB_SHA'] ?? 'main'}`,
    ...(previous ? ['-f', `previous_tag_name=${previous}`] : []),
    '--jq',
    '.body',
  ]);

  const newcomers = (notes.split('## New Contributors')[1] ?? '')
    .split('\n')
    .filter(line => line.startsWith('* @') && !line.startsWith('* @github-actions[bot]'));
  const full = /^\*\*Full Changelog\*\*: .+$/m.exec(notes)?.[0];

  return [newcomers.length > 0 ? `### 👋 New Contributors\n\n${newcomers.join('\n')}` : '', full ?? '']
    .filter(Boolean)
    .join('\n\n');
}
