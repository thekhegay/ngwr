/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { lastValueFrom } from 'rxjs';

import { HostTree, type SchematicContext, callRule } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';

import ngAdd from './index';
import type { Schema } from './schema';

/**
 * `ng add ngwr` — the first command a consumer runs, and until now the one
 * generator in the suite with no spec.
 *
 * The case that carries the file is the DEFAULT one. `ng new` takes plain CSS
 * unless you ask for something else, and this schematic used to write
 * `@import 'ngwr';` into that stylesheet. ngwr ships Sass sources and no
 * compiled CSS — every `exports` entry has a `sass` condition and nothing a
 * stylesheet can otherwise reach — so the import resolved through `default` to
 * `fesm2022/ngwr.mjs`, and esbuild stopped the next build with
 * `Cannot import ".../ngwr.mjs" into a CSS file`. Measured with esbuild against
 * the built package, not reasoned about.
 *
 * Driven over a `HostTree` directly rather than through `SchematicTestRunner`,
 * for the reason `provider/index.spec.ts` gives: the runner reads
 * `collection.json` out of `dist/` and would make this suite depend on a build.
 */

const workspace = (stylesPath: string | null): string =>
  JSON.stringify({
    version: 1,
    projects: {
      app: {
        projectType: 'application',
        root: '',
        sourceRoot: 'src',
        architect: {
          build: {
            builder: '@angular/build:application',
            options: { browser: 'src/main.ts', ...(stylesPath ? { styles: [stylesPath] } : {}) },
          },
        },
      },
    },
  });

interface Run {
  readonly read: (path: string) => string;
  readonly logs: readonly string[];
}

async function run(files: Readonly<Record<string, string>>, options: Schema): Promise<Run> {
  const tree = new HostTree();
  for (const [path, content] of Object.entries(files)) tree.create(path, content);

  const logs: string[] = [];
  const context = {
    logger: { info: (message: string) => logs.push(message), warn: (message: string) => logs.push(message) },
    // `skipPeerInstall` keeps the install task away, but the chain still asks
    // for `addTask` on some paths — a no-op is enough for what is asserted here.
    addTask: () => undefined,
  } as unknown as SchematicContext;

  // `chain()` hands back an Observable, and awaiting one resolves to the
  // Observable itself — every assertion then reads a tree the rule never
  // touched, and the whole file passes on a schematic that did nothing.
  const next = await lastValueFrom(callRule(ngAdd(options), tree, context));

  return { read: (path: string) => next.readText(path), logs };
}

const said = (logs: readonly string[], fragment: string): boolean => logs.some(line => line.includes(fragment));

const BASE: Schema = { skipPeerInstall: true };

describe('ng-add', () => {
  it('adds the Sass entry to an scss project', async () => {
    const { read, logs } = await run(
      { '/angular.json': workspace('src/styles.scss'), '/src/styles.scss': 'body { margin: 0; }\n' },
      BASE
    );

    expect(read('/src/styles.scss')).toBe("@use 'ngwr';\nbody { margin: 0; }\n");
    expect(said(logs, "added `@use 'ngwr';`")).toBe(true);
  });

  it('writes NOTHING into a css project, and says why', async () => {
    const before = 'body { margin: 0; }\n';
    const { read, logs } = await run({ '/angular.json': workspace('src/styles.css'), '/src/styles.css': before }, BASE);

    // The line it used to write here made the next `ng build` fail.
    expect(read('/src/styles.css')).toBe(before);
    expect(said(logs, 'ships Sass sources and no compiled CSS')).toBe(true);
    expect(said(logs, '@import')).toBe(false);
  });

  it('treats less the same way — it cannot reach a Sass source either', async () => {
    const before = '@brand: red;\n';
    const { read, logs } = await run(
      { '/angular.json': workspace('src/styles.less'), '/src/styles.less': before },
      BASE
    );

    expect(read('/src/styles.less')).toBe(before);
    expect(said(logs, 'ships Sass sources and no compiled CSS')).toBe(true);
  });

  it('leaves a stylesheet that already pulls ngwr in alone', async () => {
    const before = "@use 'ngwr';\nbody { margin: 0; }\n";
    const { read, logs } = await run(
      { '/angular.json': workspace('src/styles.scss'), '/src/styles.scss': before },
      BASE
    );

    expect(read('/src/styles.scss')).toBe(before);
    expect(said(logs, 'already imports ngwr')).toBe(true);
  });

  it('writes nothing at all when styles are opted out', async () => {
    const before = 'body { margin: 0; }\n';
    const { read } = await run(
      { '/angular.json': workspace('src/styles.scss'), '/src/styles.scss': before },
      {
        ...BASE,
        styles: 'none',
      }
    );

    expect(read('/src/styles.scss')).toBe(before);
  });

  it('names the file it cannot find rather than failing silently', async () => {
    const { logs } = await run({ '/angular.json': workspace(null) }, BASE);

    expect(said(logs, 'no global stylesheet found')).toBe(true);
  });

  it('prints a bootstrap snippet whose imports are the ones the providers need', async () => {
    const { logs } = await run(
      { '/angular.json': workspace('src/styles.scss'), '/src/styles.scss': '' },
      {
        ...BASE,
        dateAdapter: 'luxon',
        theme: 'system',
        density: 'sm',
      }
    );

    const snippet = logs.find(line => line.includes('bootstrapApplication'))!;
    expect(snippet).toContain("import { WrLuxonAdapter } from 'ngwr/date/adapters/luxon';");
    expect(snippet).toContain('provideWrDateAdapter({ adapter: WrLuxonAdapter })');
    expect(snippet).toContain("provideWrTheme({ defaultMode: 'auto' })");
    expect(snippet).toContain("provideWrDensity({ defaultDensity: 'sm' })");
    // Every provider named in the snippet has an import above it — the pairing
    // that broke once already, when the icon block imported bare glyph names
    // `ngwr/icon` has never exported.
    for (const symbol of ['provideWrOverlay', 'provideWrIcons', 'lucideIcons']) {
      expect(snippet, symbol).toContain(`import { ${symbol} }`.slice(0, 20));
    }
  });
});
