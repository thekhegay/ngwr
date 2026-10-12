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

import { env } from 'node:process';

import { ghApi } from '../github/gh-api';
import { previousTag } from '../version/previous-tag';

export function releaseFooter(repo: string, version: string): string {
  const tag = `v${version}`;
  const previous = previousTag(version);

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
