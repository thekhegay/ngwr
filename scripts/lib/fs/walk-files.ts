/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const codeUnitOrder = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export interface WalkFilesOptions {
  /** Directory names never entered, at any depth. Defaults to `node_modules`; `[]` enters everything. */
  readonly skipDirs?: readonly string[];
  /** Also skips every directory whose name starts with a dot. Defaults to false. */
  readonly skipDotDirs?: boolean;
  /** Keeps a file when it returns true, given its absolute path. Defaults to every file. */
  readonly include?: (path: string) => boolean;
  /**
   * Orders each directory's entry names before visiting them, files and
   * subdirectories interleaved; `true` is the default code-unit sort. Omitted,
   * entries come in `readdir` order.
   */
  readonly sort?: true | ((a: string, b: string) => number);
  /** Descends into a symbolic link that points at a directory. Defaults to true; false treats every link as a file. */
  readonly followLinks?: boolean;
}

/**
 * Every file under `root`, depth first, as absolute paths.
 *
 * A file is listed where the walk meets it, before the entries that follow it
 * in its directory, so a sorted walk is in document order rather than grouped
 * by depth.
 */
export function walkFiles(root: string, options: WalkFilesOptions = {}): string[] {
  const skip = new Set(options.skipDirs ?? ['node_modules']);
  const order = options.sort === true ? codeUnitOrder : options.sort;
  const follow = options.followLinks ?? true;
  const out: string[] = [];

  const visit = (dir: string): void => {
    const entries = readdirSync(dir, { withFileTypes: true });
    if (order) entries.sort((a, b) => order(a.name, b.name));
    for (const entry of entries) {
      const path = join(dir, entry.name);
      const isDir = entry.isDirectory() || (follow && entry.isSymbolicLink() && statSync(path).isDirectory());
      if (isDir) {
        if (!skip.has(entry.name) && !(options.skipDotDirs && entry.name.startsWith('.'))) visit(path);
      } else if (!options.include || options.include(path)) {
        out.push(path);
      }
    }
  };

  visit(root);
  return out;
}
