/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Prints a progress / status line to stderr.
 *
 * Stderr so that a script whose stdout is its result — `release:prepare` prints
 * the next version, `release:body` the release notes — keeps stdout clean for
 * whatever reads it.
 */

import { stderr } from 'node:process';

export function info(message: string): void {
  stderr.write(`${message}\n`);
}
