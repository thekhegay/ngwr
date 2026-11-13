/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Sass for the specs that read COMPILED CSS, compiled once per sheet.
 *
 * `sass` is resolved through `@angular/build` rather than declared: the repo has
 * no direct dependency on it, it is present because the builder compiles with
 * it, and a spec is not a reason to add a second copy to the tree.
 *
 * **Not a `.spec.ts`**, for the reason `i18n/catalog-contract.ts` gives, and
 * kept out of the published package the same way: by its entry in
 * `tsconfig.lib.json`'s `exclude`. Move or rename it and that entry moves too.
 *
 * The cache is module state, and the runner shares module state between the
 * spec files of one worker (`isolate: false`), so `table/styles` is compiled
 * once for the five files that read it. An entry is reused only while every
 * file the compile loaded still has the modification time it had then, so a
 * watch run never answers with the sheet from before an edit. A compile that
 * throws is not cached.
 */
interface Sass {
  compileString(
    source: string,
    options: { loadPaths: string[]; style: SassStyle }
  ): { css: string; loadedUrls: readonly URL[] };
}

type SassStyle = 'expanded' | 'compressed';

interface CompileSassOptions {
  /** Defaults to `expanded`, which is also Sass's own default. */
  readonly style?: SassStyle;
}

/** `projects/lib`, the load path: `@use 'theme'` is the public entry and `@use 'table/styles'` a component's. */
const LIB = join(process.cwd(), 'projects/lib');

const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;

interface Compiled {
  readonly css: string;
  /** Every file the compile read, with its modification time at that moment. */
  readonly loaded: readonly (readonly [path: string, mtimeMs: number])[];
}

/**
 * The timeout of a case, or a `describe`, that compiles inside a test: a first
 * compile of a large sheet can pass the default five seconds when every worker
 * is busy. A compile at module or `describe` level runs at collection, which
 * has no timeout, and needs none.
 */
const COMPILE_TIMEOUT = 20_000;

const cache = new Map<string, Compiled>();

function mtime(path: string): number {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return -1;
  }
}

/** The CSS `source` compiles to with `projects/lib` on the load path, comments included. */
function compileSass(source: string, options: CompileSassOptions = {}): string {
  const style = options.style ?? 'expanded';
  const key = `${style}\n${source}`;
  const hit = cache.get(key);
  if (hit?.loaded.every(([path, at]) => mtime(path) === at)) return hit.css;

  const result = sass.compileString(source, { loadPaths: [LIB], style });
  const loaded = result.loadedUrls
    .filter(url => url.protocol === 'file:')
    .map(url => {
      const path = fileURLToPath(url);
      return [path, mtime(path)] as const;
    });
  cache.set(key, { css: result.css, loaded });
  return result.css;
}

export { COMPILE_TIMEOUT, compileSass, LIB };
export type { CompileSassOptions, SassStyle };
