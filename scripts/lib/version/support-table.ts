/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Rewrites the support table in SECURITY.md from the version the repository is
 * actually on.
 *
 * Maintained by hand it went stale in the way a support table always does: it
 * named 10.x as current against a shipped 12.2.0, so the one document a security
 * researcher reads before reporting was two majors behind. The policy sentence
 * above the table is unchanged and stays hand-written — only the three rows are
 * derived, because they are the part that is a fact about the release line
 * rather than a decision.
 *
 * Run by `release:prepare`, so the table moves with the version that is being
 * cut rather than with whoever remembers.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ROOT_PATH } from '../paths/root';

const SECURITY = resolve(ROOT_PATH, 'SECURITY.md');
const START = '| Version | Supported |';

export function writeSupportTable(version: string): boolean {
  const major = Number(version.split('.')[0]);
  if (!Number.isFinite(major)) throw new Error(`Cannot read a major out of "${version}"`);

  const table = [
    START,
    '|---------|-----------|',
    `| ${major}.x    | \u2705 Full — all security fixes |`,
    `| ${major - 1}.x    | \u26a0\ufe0f Limited — mechanical fixes only, until the next major |`,
    `| < ${major - 1}.0   | \u274c Unsupported |`,
  ].join('\n');

  const src = readFileSync(SECURITY, 'utf8');
  const from = src.indexOf(START);
  if (from < 0) throw new Error(`SECURITY.md no longer contains the support table header`);

  // The table ends at the blank line after it; anything else would swallow the
  // reporting section below.
  const end = src.indexOf('\n\n', from);
  if (end < 0) throw new Error('SECURITY.md support table is not followed by a blank line');

  const next = src.slice(0, from) + table + src.slice(end);
  if (next === src) return false;

  writeFileSync(SECURITY, next);
  return true;
}
