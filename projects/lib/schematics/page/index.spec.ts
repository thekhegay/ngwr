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
    expect(logs.join('\n')).toContain("  @use 'ngwr/theme';\n  @use 'ngwr/table';");
  });
});

/**
 * What the generated pages DO, read off the files they write.
 *
 * Both presets below shipped a control that looked wired and was not. The table
 * marked a column sortable and bound nothing to the sort, so a click flipped
 * `aria-sort` to "descending" over rows still in their original order — wr-table
 * writes the sort and never reorders `items` — and its separate `<wr-pagination>`
 * paged nothing. The form posted empty required fields, and a field the user
 * never left showed no error, because `<wr-form-field>` shows one only once the
 * control is touched or dirty.
 */
describe('the generated pages', () => {
  const files = async (preset: Schema['preset']): Promise<{ ts: string; html: string }> => {
    const { tree } = await run('src/styles.scss', "@use 'ngwr/theme';\n", { preset });
    const dir = `/src/app/pages/${preset}`;
    return { ts: tree.readText(`${dir}/${preset}.ts`), html: tree.readText(`${dir}/${preset}.html`) };
  };

  it('the table applies the sort its sortable column writes', async () => {
    const { ts, html } = await files('table');

    expect(ts).toContain('sortable: true');
    expect(html).toContain('[(sort)]="sort"');
    expect(html).toContain('[items]="sortedRows()"');
    expect(ts).toMatch(/sortedRows = computed\(\(\) => \{\n {4}const rules = this\.sort\(\)/);
  });

  it('the table pages the rows it shows, through its own pager', async () => {
    const { ts, html } = await files('table');

    expect(html).not.toContain('<wr-pagination');
    expect(ts).not.toContain('WrPagination');
    expect(html).toContain('[pageSize]="pageSize"');
    expect(html).toContain('[(page)]="page"');
  });

  it('the form sends nothing while invalid, and shows every field its error', async () => {
    const { ts, html } = await files('form');

    expect(html).toContain('#form="ngForm" (ngSubmit)="onSubmit(form)"');
    expect(ts).toMatch(/if \(form\.invalid\) \{\n\s*form\.control\.markAllAsTouched\(\);\n\s*return;\n\s*\}/);
    expect(ts.indexOf('form.invalid')).toBeLessThan(ts.indexOf('fetch('));
  });
});
