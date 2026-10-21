/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

import { walkFiles } from './fs/walk-files';
import { LIB_PATH } from './paths/lib';

/** Every entry point under `projects/lib`, as absolute folders, read once per run. */
let entryDirs: ReadonlySet<string> | undefined;

/** The `exports` map of the library's `package.json`. */
function exportsMap(libRoot: string): Record<string, unknown> {
  const manifest = JSON.parse(readFileSync(resolve(libRoot, 'package.json'), 'utf8')) as {
    exports?: Record<string, unknown>;
  };
  return manifest.exports ?? {};
}

/** The `exports` keys whose `condition` names a file matching `target`, without the `./`, sorted; never the root `.`. */
function subpathsWith(libRoot: string, condition: string, target: RegExp): string[] {
  const names: string[] = [];
  for (const [key, value] of Object.entries(exportsMap(libRoot))) {
    if (key === '.' || !key.startsWith('./')) continue;
    if (typeof value !== 'object' || value === null) continue;
    const resolved = (value as Record<string, unknown>)[condition];
    if (typeof resolved !== 'string' || !target.test(resolved)) continue;
    names.push(key.slice(2));
  }
  return names.sort();
}

/**
 * The library's secondary entry points, by name (`button`, `i18n/ru`,
 * `button/testing`), sorted.
 *
 * Read from `projects/lib/package.json`'s `exports`, which is the ONE place
 * that decides what the package publishes since the move to
 * `@angular/build:library`. It used to be a nested `ng-package.json` per
 * folder, and seven scripts plus two specs each walked the tree looking for
 * one; those files are gone and the walks with them. A key counts when it
 * resolves through `default` to a TypeScript file, which is exactly the rule
 * the builder itself applies — a `sass`-only subpath is a stylesheet the
 * manifest carries, not an entry point that compiles.
 *
 * `scripts/gen/exports.ts` writes that map from the tree, so the tree is still
 * the origin; this is the one reader everything else goes through.
 */
export function libEntryPoints(libRoot = LIB_PATH): string[] {
  return subpathsWith(libRoot, 'default', /\.m?ts$/);
}

/**
 * The subpaths `@use 'ngwr/<name>'` resolves, by name, sorted: every `exports`
 * key carrying a `sass` condition. That includes the five stylesheet-only keys
 * (`animations`, `breakpoints`, `grid`, `reset`, `typography-utilities`), which
 * are not entry points.
 */
export function libStyleEntryPoints(libRoot = LIB_PATH): string[] {
  return subpathsWith(libRoot, 'sass', /\.scss$/);
}

/**
 * The class an entry point is named after: `button` → `WrButton`,
 * `charts/bar-chart` → `WrBarChart`. Only the last segment counts, since a
 * nested entry's group is a folder and not part of any class name.
 */
export function wrClassName(entry: string): string {
  const leaf = entry.slice(entry.lastIndexOf('/') + 1);
  return `Wr${leaf
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}`;
}

/**
 * The locale catalogs, by code (`de`, `zh-TW`), sorted: every folder under
 * `projects/lib/i18n` that holds a `public-api.ts`. Read off the folder rather
 * than the exports map, which carries the same set under `i18n/<code>`.
 */
export function libLocales(libRoot = LIB_PATH): string[] {
  const root = join(libRoot, 'i18n');
  return readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(join(root, entry.name, 'public-api.ts')))
    .map(entry => entry.name)
    .sort();
}

export interface EntryFilesOptions {
  /** File extensions to keep, with the dot. Defaults to `['.ts']`. */
  readonly extensions?: readonly string[];
  /** Leaves out every `internal/` folder, code no consumer can import. Defaults to true. */
  readonly skipInternal?: boolean;
  /** Keeps `*.spec.ts`. Defaults to false. */
  readonly includeSpecs?: boolean;
  /**
   * `true` (the default) sorts each folder's names before walking it, `'paths'`
   * sorts the finished list of absolute paths, and `false` keeps `readdir` order.
   * The two sorts differ where a file and a folder share a prefix: `a-b.ts`
   * comes before `a/x.ts` as a path and after it as a walk.
   */
  readonly sort?: boolean | 'paths';
}

/**
 * The files of one entry point (`tabs`, `charts/bar-chart`) as absolute paths,
 * leaving out the entry points nested inside it: `tabs/router`, every
 * `<name>/testing`. Nesting is judged against {@link libEntryPoints}, read once.
 */
export function entryFiles(entry: string, options: EntryFilesOptions = {}): string[] {
  entryDirs ??= new Set(libEntryPoints().map(name => join(LIB_PATH, name)));
  const nested = entryDirs;
  const root = join(LIB_PATH, entry);
  const extensions = new Set(options.extensions ?? ['.ts']);
  const skipInternal = options.skipInternal ?? true;
  const sort = options.sort ?? true;

  const files = walkFiles(root, {
    sort: sort === true ? true : undefined,
    include: path => {
      if (!extensions.has(extname(path))) return false;
      if (!options.includeSpecs && path.endsWith('.spec.ts')) return false;
      const folders = relative(root, path).split('/').slice(0, -1);
      if (skipInternal && folders.includes('internal')) return false;
      let dir = root;
      for (const folder of folders) {
        dir = join(dir, folder);
        if (nested.has(dir)) return false;
      }
      return true;
    },
  });

  return sort === 'paths' ? files.sort() : files;
}
