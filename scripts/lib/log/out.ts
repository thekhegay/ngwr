/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Writes a final value (e.g. the next version) to stdout, no trailing newline added. */

import { stdout } from 'node:process';

export function out(message: string): void {
  stdout.write(message);
}
