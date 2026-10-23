/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { readFileSync } from 'node:fs';

import { CHANGELOG_PATH } from '../paths/changelog';

/** One `## ...` section of a changelog. */
export interface ChangelogSection {
  /** The H2 line itself. */
  readonly heading: string;
  /** Every line up to the next H2, untrimmed. */
  readonly body: string;
}

/** The topmost `## ...` section of `source` (`CHANGELOG.md` by default), or `null`. */
export function latestSection(source = readFileSync(CHANGELOG_PATH, 'utf8')): ChangelogSection | null {
  const lines = source.split('\n');
  const start = lines.findIndex(line => /^##\s/.test(line));
  if (start < 0) return null;

  const end = lines.findIndex((line, i) => i > start && /^##\s/.test(line));
  return { heading: lines[start], body: lines.slice(start + 1, end < 0 ? undefined : end).join('\n') };
}

/**
 * The topmost section of `CHANGELOG.md`, trimmed and without its heading, which
 * the GitHub Release already shows as its title. Throws when there is none.
 */
export function extractLatestSection(): string {
  const section = latestSection();
  if (!section) throw new Error('No H2 section found in CHANGELOG.md');
  return section.body.trim();
}
