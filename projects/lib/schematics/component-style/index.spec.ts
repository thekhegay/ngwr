/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { HostTree, type SchematicContext, type Tree } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';

import componentStyle from './index';

/**
 * `ng g ngwr:component-style`, which every component a v15 app renders now goes
 * through: there is no umbrella sheet, so each one needs its own `@use`.
 *
 * The case that carries the file is ORDER. The line used to be prepended, which
 * put every component above the theme — and once the theme line carries
 * `with ($base-colors: …)`, as `ng add` invites it to, Sass refuses the file:
 * the component sheet has already loaded the theme, and a module is configured
 * only at its first load. One case compiles the result for that reason.
 *
 * Driven over a `HostTree` with the repo's own `exports` map, for the reason
 * `provider/index.spec.ts` gives: the test runner reads `collection.json` out of
 * `dist/`, and this suite should not depend on a build.
 */

const LIB = join(process.cwd(), 'projects/lib');

const EXPORTS = (JSON.parse(readFileSync(join(LIB, 'package.json'), 'utf8')) as { exports: Record<string, unknown> })
  .exports;

const angularJson = (stylesPath: string): string =>
  JSON.stringify({
    version: 1,
    projects: {
      app: {
        projectType: 'application',
        root: '',
        sourceRoot: 'src',
        architect: { build: { builder: '@angular/build:application', options: { styles: [stylesPath] } } },
      },
    },
  });

interface Run {
  readonly read: () => string;
  readonly logs: readonly string[];
}

/** Runs the schematic once per name, in order, over one stylesheet. */
async function run(stylesPath: string, before: string, ...names: string[]): Promise<Run> {
  const tree = new HostTree();
  tree.create('/angular.json', angularJson(stylesPath));
  tree.create(`/${stylesPath}`, before);

  const logs: string[] = [];
  const context = {
    logger: { info: (message: string) => logs.push(message), warn: (message: string) => logs.push(message) },
  } as unknown as SchematicContext;

  for (const name of names) {
    const rule = componentStyle({ name }, EXPORTS) as (target: Tree, ctx: SchematicContext) => Promise<Tree>;
    await rule(tree, context);
  }

  return { read: () => tree.readText(`/${stylesPath}`), logs };
}

interface Sass {
  compileString(
    source: string,
    options: { importers: { findFileUrl(url: string): URL | null }[]; style: 'compressed' }
  ): { css: string };
}

/** `sass` through `@angular/build`, as `theme/sass-entry.spec.ts` resolves it. */
const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;

/** Compiles a global stylesheet, resolving `ngwr/<name>` through the `sass` condition, as a consumer's build does. */
const compile = (source: string): string =>
  sass.compileString(source, {
    style: 'compressed',
    importers: [
      {
        findFileUrl: (url: string) => {
          const entry = url.startsWith('ngwr/') ? (EXPORTS[`.${url.slice(4)}`] as { sass?: string } | undefined) : null;

          return entry?.sass ? pathToFileURL(join(LIB, entry.sass)) : null;
        },
      },
    ],
  }).css;

const THEMED = "@use 'ngwr/theme';\nbody { margin: 0; }\n";

describe('ng g ngwr:component-style', () => {
  it('adds a component after the theme, and the next one after that', async () => {
    const { read, logs } = await run('src/styles.scss', THEMED, 'button', 'select');

    // The order asked for, below the theme, above the first rule — a `@use`
    // after a rule is a Sass error.
    expect(read()).toBe("@use 'ngwr/theme';\n@use 'ngwr/button';\n@use 'ngwr/select';\nbody { margin: 0; }\n");
    expect(logs).toContain("✓ Added `@use 'ngwr/button';` to src/styles.scss.");
  });

  it('keeps a configured theme line first, and the result compiles', async () => {
    const before = [
      "@use 'sass:math';",
      "@use 'ngwr/theme' with (",
      '  $base-colors: (primary: #0a7)',
      ');',
      '',
      '.page { padding: math.div(4px, 2); }',
      '',
    ].join('\n');
    const { read } = await run('src/styles.scss', before, 'button');

    expect(read()).toBe(
      [
        "@use 'sass:math';",
        "@use 'ngwr/theme' with (",
        '  $base-colors: (primary: #0a7)',
        ');',
        "@use 'ngwr/button';",
        '',
        '.page { padding: math.div(4px, 2); }',
        '',
      ].join('\n')
    );
    // The prepended order failed exactly here: "This module was already loaded,
    // so it can't be configured using `with`".
    expect(compile(read())).toContain('.wr-btn');
    expect(() => compile(`@use 'ngwr/button';\n${before}`)).toThrow(/already loaded/);
  });

  it('puts the theme first when the stylesheet has none', async () => {
    const { read, logs } = await run('src/styles.scss', 'body { margin: 0; }\n', 'button');

    expect(read()).toBe("@use 'ngwr/theme';\n@use 'ngwr/button';\nbody { margin: 0; }\n");
    expect(logs).toContain("✓ Added `@use 'ngwr/theme';` to src/styles.scss.");
  });

  it('lands a bare name from before v15 on its nested entry point', async () => {
    const { read, logs } = await run('src/styles.scss', THEMED, 'bar-chart', 'aurora');

    expect(read()).toContain("@use 'ngwr/charts/bar-chart';\n@use 'ngwr/bits/aurora';\n");
    expect(logs).toContain('ngwr: bar-chart is ngwr/charts/bar-chart since v15.');
  });

  it('lands a bare name first shipped nested on its entry point, with no v15 history', async () => {
    // `heatmap-chart` and `chart-legend` arrived in 15.1 under `charts/` and were
    // never flat, so "since v15" would describe a move that never happened.
    const { read, logs } = await run('src/styles.scss', THEMED, 'heatmap-chart', 'chart-legend');

    expect(read()).toContain("@use 'ngwr/charts/heatmap-chart';\n@use 'ngwr/charts/chart-legend';\n");
    expect(logs).toContain('ngwr: heatmap-chart is ngwr/charts/heatmap-chart.');
    expect(logs).toContain('ngwr: chart-legend is ngwr/charts/chart-legend.');
    expect(logs.join('\n')).not.toContain('since v15');
  });

  it('never reads a bare `core` as the internal chart helpers', async () => {
    // `ngwr/charts/core` is loaded by every chart for itself; nobody typing
    // "core" means it, and writing it would report a v15 move it never made.
    await expect(run('src/styles.scss', THEMED, 'core')).rejects.toThrow(
      /ngwr\/core is not an entry point with a stylesheet/
    );
  });

  it('refuses a name with no stylesheet, and writes nothing', async () => {
    // `ngwr/date` ships no sheet, and `ngwr/markdown` is gone: either line would
    // be reported as added and fail the next build.
    await expect(run('src/styles.scss', THEMED, 'date')).rejects.toThrow(/ngwr\/date ships no stylesheet/);
    await expect(run('src/styles.scss', THEMED, 'markdown')).rejects.toThrow(
      /ngwr\/markdown is not an entry point with a stylesheet/
    );
  });

  it('writes no @import into a CSS stylesheet, and says why', async () => {
    const before = 'body { margin: 0; }\n';

    // A CSS `@import` builds, but compiles the theme into every line and cannot
    // configure it — the advice is the rename.
    await expect(run('src/styles.css', before, 'button')).rejects.toThrow(/Rename the global stylesheet to \.scss/);
  });

  it('leaves a stylesheet that already loads the entry point alone', async () => {
    const before = "@use 'ngwr/theme';\n@use 'ngwr/button';\n";
    const { read, logs } = await run('src/styles.scss', before, 'button', 'theme');

    expect(read()).toBe(before);
    expect(logs).toContain('ngwr: src/styles.scss already imports ngwr/button — no changes.');
  });

  it('warns about a component line above the theme, which it does not move', async () => {
    // What the prepending version left behind in every project that used it.
    const { logs } = await run('src/styles.scss', "@use 'ngwr/button';\n@use 'ngwr/theme';\n", 'select');

    expect(logs.some(line => line.includes('Move the theme line first'))).toBe(true);
  });

  it('writes the indented syntax line by line', async () => {
    const before = "@use 'ngwr/theme' with ($base-colors: (primary: #0a7))\n.page\n  margin: 0\n";
    const { read } = await run('src/styles.sass', before, 'button');

    expect(read()).toBe(
      "@use 'ngwr/theme' with ($base-colors: (primary: #0a7))\n@use 'ngwr/button';\n.page\n  margin: 0\n"
    );
  });
});
