/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Prints an error line to stderr. */

import { stderr } from 'node:process';

export function err(message: string): void {
  stderr.write(`${message}\n`);
}
