/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Prepends a new section to `CHANGELOG.md` for the version currently set in
 * `projects/lib/package.json`. Shells out to `conventional-changelog`.
 * Throws when the underlying tool exits non-zero.
 */

import { spawnSync } from 'node:child_process';

import { ROOT_PATH } from '../paths/root';

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
    { cwd: ROOT_PATH, stdio: 'inherit' }
  );

  if (result.status !== 0) {
    throw new Error(`conventional-changelog exited with status ${result.status ?? 'unknown'}`);
  }
}
