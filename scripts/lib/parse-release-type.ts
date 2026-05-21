/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Parses the `--bump=<kind>` CLI flag used by the release helper scripts.
 * Returns `null` when the flag is missing or the value is unknown.
 */

import type { ReleaseType } from './release-type';

const ALLOWED: readonly ReleaseType[] = ['patch', 'minor', 'major', 'rc'];

export function parseReleaseType(argv: readonly string[]): ReleaseType | null {
  const raw = argv
    .find(a => a.startsWith('--bump='))
    ?.split('=')[1]
    ?.trim();
  return raw && (ALLOWED as readonly string[]).includes(raw) ? (raw as ReleaseType) : null;
}
