/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Parses the `--bump=<kind>` CLI flag for the release scripts.
 */

type Bump = 'patch' | 'minor' | 'major' | 'rc';

const ALLOWED: readonly Bump[] = ['patch', 'minor', 'major', 'rc'];

/**
 * Extracts the bump kind from a process `argv` array. Returns `null` when the
 * flag is missing or the value is not one of the supported kinds.
 */
function parseBumpArg(argv: readonly string[]): Bump | null {
  const raw = argv
    .find(a => a.startsWith('--bump='))
    ?.split('=')[1]
    ?.trim();
  return raw && (ALLOWED as readonly string[]).includes(raw) ? (raw as Bump) : null;
}

export { parseBumpArg };
export type { Bump };
