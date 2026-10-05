/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
 * `scripts/gen-exports.ts` writes that map from the tree, so the tree is still
 * the origin; this is the one reader everything else goes through.
 */
export function libEntryPoints(libRoot = resolve('projects/lib')): string[] {
  const manifest = JSON.parse(readFileSync(resolve(libRoot, 'package.json'), 'utf8')) as {
    exports?: Record<string, unknown>;
  };

  const names: string[] = [];
  for (const [key, value] of Object.entries(manifest.exports ?? {})) {
    if (key === '.' || !key.startsWith('./')) continue;
    if (typeof value !== 'object' || value === null) continue;
    const target = (value as Record<string, unknown>)['default'];
    if (typeof target !== 'string' || !/\.m?ts$/.test(target)) continue;
    names.push(key.slice(2));
  }

  return names.sort();
}

/** Whether `name` (`button`, `i18n/ru`) is a published secondary entry point. */
export function isLibEntryPoint(name: string, libRoot?: string): boolean {
  return libEntryPoints(libRoot).includes(name);
}
