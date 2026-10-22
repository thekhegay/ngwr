/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { HostTree, type SchematicContext, type Tree } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';

import page from './index';
import type { Schema } from './schema';

/**
 * `ng g ngwr:page`, for the half of a page that is not its files.
 *
 * Since v15 there is no umbrella sheet, so a page whose components have no
 * `@use` of their own renders unstyled, with nothing in the build or the
 * console to say so. The generated form page did exactly that: it built, and
 * the global stylesheet held the theme and nothing else.
 */

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

async function run(stylesPath: string, before: string, options: Schema): Promise<{ tree: Tree; logs: string[] }> {
  const tree = new HostTree();
  tree.create('/angular.json', angularJson(stylesPath));
  tree.create(`/${stylesPath}`, before);

  const logs: string[] = [];
  const context = {
    logger: { info: (message: string) => logs.push(message), warn: (message: string) => logs.push(message) },
  } as unknown as SchematicContext;

  await (page(options) as (target: Tree, ctx: SchematicContext) => Promise<Tree>)(tree, context);

  return { tree, logs };
}

describe('ng g ngwr:page', () => {
  it('adds the style entry points the page renders, after the theme', async () => {
    const { tree } = await run('src/styles.scss', "@use 'ngwr/theme';\nbody { margin: 0; }\n", { preset: 'form' });

    expect(tree.exists('/src/app/pages/form/form.ts')).toBe(true);
    expect(tree.readText('/src/styles.scss')).toBe(
      "@use 'ngwr/theme';\n@use 'ngwr/form';\n@use 'ngwr/input';\n@use 'ngwr/button';\nbody { margin: 0; }\n"
    );
  });

  it('adds only what is missing', async () => {
    const before = "@use 'ngwr/theme';\n@use 'ngwr/card';\n";
    const { tree } = await run('src/styles.scss', before, { preset: 'dashboard' });

    expect(tree.readText('/src/styles.scss')).toBe(`${before}@use 'ngwr/statistic';\n`);
  });

  it('prints the lines for a stylesheet it cannot write @use into', async () => {
    const before = 'body { margin: 0; }\n';
    const { tree, logs } = await run('src/styles.css', before, { preset: 'table' });

    expect(tree.readText('/src/styles.css')).toBe(before);
    expect(logs.join('\n')).toContain("  @use 'ngwr/theme';\n  @use 'ngwr/table';\n  @use 'ngwr/pagination';");
  });
});
