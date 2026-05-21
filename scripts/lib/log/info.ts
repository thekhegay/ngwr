/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Prints a progress / status line to stderr.
 *
 * Bypasses `console.*` (banned by lint) and writes to stderr so the release
 * scripts can keep stdout clean for piped consumers.
 */

import { stderr } from 'node:process';

export function info(message: string): void {
  stderr.write(`${message}\n`);
}
