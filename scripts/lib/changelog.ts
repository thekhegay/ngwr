/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Helpers around the repository `CHANGELOG.md`:
 *
 * - `regenerateChangelog()` shells out to `conventional-changelog` to prepend
 *   a new section for the just-bumped version.
 * - `extractLatestSection()` returns the topmost section, used as the GitHub
 *   Release body and as the release PR description.
 * - `withEmojiHeadings()` rewrites `###` group headings to add the leading
 *   emoji used in published releases.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { emojiFor } from './emoji';
import { CHANGELOG, ROOT } from './paths';

/**
 * Prepends a new section to `CHANGELOG.md` for the version currently set in
 * `projects/lib/package.json`. Throws when the underlying tool exits non-zero.
 */
export function regenerateChangelog(): void {
  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'conventional-changelog',
      '-p',
      'conventionalcommits',
      '-i',
      'CHANGELOG.md',
      '-s',
      '-r',
      '1',
      '--pkg',
      'projects/lib/package.json',
    ],
    { cwd: ROOT, stdio: 'inherit' }
  );

  if (result.status !== 0) {
    throw new Error(`conventional-changelog exited with status ${result.status ?? 'unknown'}`);
  }
}

/**
 * Returns the topmost `## ...` section of `CHANGELOG.md` (without the H2
 * heading itself, since the GitHub Release UI already shows the version as
 * the title). Throws when no section is found.
 */
export function extractLatestSection(): string {
  const md = readFileSync(CHANGELOG, 'utf8');
  const lines = md.split('\n');

  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) {
      if (start === -1) {
        start = i;
      } else {
        end = i;
        break;
      }
    }
  }

  if (start === -1) {
    throw new Error('No H2 section found in CHANGELOG.md');
  }

  return lines
    .slice(start + 1, end)
    .join('\n')
    .trim();
}

/** Rewrites `### Heading` lines to `### <emoji> Heading`. */
export function withEmojiHeadings(section: string): string {
  return section
    .split('\n')
    .map(line => line.replace(/^###\s+(.+)$/, (_, heading: string) => `### ${emojiFor(heading)} ${heading}`))
    .join('\n');
}
