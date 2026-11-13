/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { realpathSync } from 'node:fs';
import { argv } from 'node:process';
import { pathToFileURL } from 'node:url';

/**
 * Whether the module at `url` (its `import.meta.url`) is the script Node was
 * started on, so a file can run on its own and be imported by a script that
 * runs several of them in one process.
 */
export function isEntry(url: string): boolean {
  const script = argv[1];
  if (script === undefined) return false;
  try {
    return pathToFileURL(realpathSync(script)).href === url;
  } catch {
    return false;
  }
}
