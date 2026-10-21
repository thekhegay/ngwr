/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Validates `release:prepare`'s `--bump` value, trimmed; `null` when missing or unknown. */

import type { ReleaseType } from './release-type';

const ALLOWED: readonly ReleaseType[] = ['patch', 'minor', 'major', 'rc'];

export function parseReleaseType(raw: string | undefined): ReleaseType | null {
  const value = raw?.trim();
  return value && (ALLOWED as readonly string[]).includes(value) ? (value as ReleaseType) : null;
}
