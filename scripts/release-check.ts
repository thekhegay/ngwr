/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Refuses a release whose CHANGELOG section misses something that ships.
 *
 * The section is written when the release pull request is cut. A feat or fix
 * merged into main after that reaches the release branch through "Update
 * branch", ships in the tag, and is written down nowhere: the next section
 * starts from the new tag, which already contains it. `publish.yml` runs this
 * before anything is tagged or staged, and the cure is to run the Release PR
 * workflow again with the same bump, which rewrites the branch.
 *
 * Usage:
 *   pnpm release:check
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { exit } from 'node:process';

import { err } from './lib/log/err';
import { info } from './lib/log/info';
import { CHANGELOG_PATH } from './lib/paths/changelog';
import { previousTag } from './lib/version/previous-tag';
import { readCurrentVersion } from './lib/version/read-current';

// The types conventional-changelog's `conventionalcommits` preset lists.
const LISTED = /^[0-9a-f]{40} (feat|fix|perf|revert)(\([^)]*\))?!?:/;

const version = readCurrentVersion();
const lines = readFileSync(CHANGELOG_PATH, 'utf8').split('\n');
const start = lines.findIndex(line => line.startsWith('## '));
if (start < 0 || !lines[start].includes(`[${version}]`)) {
  err(`CHANGELOG.md does not open with a ${version} section. Run the Release PR workflow again.`);
  exit(1);
}
const end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
const section = lines.slice(start, end < 0 ? undefined : end).join('\n');

const since = previousTag(version);
const range = since ? `${since}..HEAD` : 'HEAD';
const missing = execFileSync('git', ['log', '--format=%H %s', range], { encoding: 'utf8' })
  .split('\n')
  .filter(line => LISTED.test(line))
  .filter(line => !section.includes(line.slice(0, 40)));

if (missing.length > 0) {
  err(`CHANGELOG.md misses ${missing.length} commit(s) that would ship in v${version}:`);
  for (const line of missing) err(`  ${line.slice(0, 7)} ${line.slice(41)}`);
  err('main moved after the release pull request was cut. Run the Release PR workflow again with the same bump.');
  exit(1);
}
info(`✓ CHANGELOG.md names every listed commit since ${since ?? 'the first commit'}`);
