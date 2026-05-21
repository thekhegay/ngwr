/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Returns the topmost `## ...` section of `CHANGELOG.md` (without the H2
 * heading itself, since the GitHub Release UI already shows the version as
 * the title). Throws when no section is found.
 */

import { readFileSync } from 'node:fs';

import { CHANGELOG_PATH } from '../paths/changelog';

export function extractLatestSection(): string {
  const md = readFileSync(CHANGELOG_PATH, 'utf8');
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
