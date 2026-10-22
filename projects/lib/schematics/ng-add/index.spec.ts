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
 * `@import 'ngwr';` into that stylesheet. The root entry point has no `sass`
 * condition, so the import resolved through `default` to `fesm2022/ngwr.mjs`,
 * and esbuild stopped the next build with `Cannot import ".../ngwr.mjs" into a
 * CSS file`. A per-entry-point `@import 'ngwr/button'` does build from CSS,
 * since Angular's bundler resolves the `sass` condition, but each one is a Sass
 * compilation of its own that copies the theme and cannot configure it. So a
 * CSS project gets the rename advice and no line.
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

    expect(read('/src/styles.scss')).toBe("@use 'ngwr/theme';\nbody { margin: 0; }\n");
    expect(said(logs, "added `@use 'ngwr/theme';`")).toBe(true);
  });

  it('writes NOTHING into a css project, and says why', async () => {
    const before = 'body { margin: 0; }\n';
    const { read, logs } = await run({ '/angular.json': workspace('src/styles.css'), '/src/styles.css': before }, BASE);

    // The line it used to write here made the next `ng build` fail.
    expect(read('/src/styles.css')).toBe(before);
    expect(said(logs, 'Rename the global stylesheet to .scss')).toBe(true);
    // It names what an `@import` costs, and no longer sends a CSS project to
    // `component-style`, which writes nothing into one.
    expect(said(logs, 'each import is a Sass compilation of its own')).toBe(true);
    expect(said(logs, 'keep CSS')).toBe(false);
  });

  it('treats less the same way — it cannot reach a Sass source either', async () => {
    const before = '@brand: red;\n';
    const { read, logs } = await run(
      { '/angular.json': workspace('src/styles.less'), '/src/styles.less': before },
      BASE
    );

    expect(read('/src/styles.less')).toBe(before);
    expect(said(logs, 'Rename the global stylesheet to .scss')).toBe(true);
  });

  it('leaves a stylesheet that already pulls ngwr in alone', async () => {
    const before = "@use 'ngwr/theme';\nbody { margin: 0; }\n";
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
        density: 'sm',
      }
    );

    const snippet = logs.find(line => line.includes('appConfig'))!;
    // A feature of the one `provideWr()` call since v15, which replaced
    // `provideWrDensity()` and its four siblings.
    expect(snippet).toContain("provideWr(withDensity({ defaultDensity: 'sm' }))");
    expect(snippet).not.toContain('provideWrDensity');
    // v15 deleted `provideWrTheme`: the scheme follows the OS with no provider and
    // `WrTheme` is root-provided, so a snippet naming it would not compile.
    expect(snippet).not.toContain('provideWrTheme');
    // Nor `provideWrOverlay`: ngwr's overlays are isolated from other CDK
    // consumers by default, and the import would name an export that is gone.
    expect(snippet).not.toContain('provideWrOverlay');
    // Or a date feature: the date components run on the native adapter with
    // nothing provided, so the line would register what is already there.
    expect(snippet).not.toContain('withDates');
    // Every provider named in the snippet has an import above it — the pairing
    // that broke once already, when the icon block imported bare glyph names
    // `ngwr/icon` has never exported.
    for (const symbol of ['provideWr', 'withDensity', 'provideWrIcons', 'lucideIcons']) {
      expect(snippet, symbol).toMatch(new RegExp(`import \\{[^}]*\\b${symbol}\\b[^}]*\\} from`));
    }
    // `provideWr` is the ROOT entry point's, and each feature comes from the
    // entry point it configures.
    expect(snippet).toContain("import { provideWr } from 'ngwr';");
    expect(snippet).toContain("import { withDensity } from 'ngwr/density';");
    // The converter ships in `ngwr/icon` itself since v15.
    expect(snippet).toContain("import { provideWrIcons, lucideIcons } from 'ngwr/icon';");
  });

  it('prints the app config shape `ng new` writes, not a bootstrap call', async () => {
    const { logs } = await run({ '/angular.json': workspace('src/styles.scss'), '/src/styles.scss': '' }, BASE);

    const snippet = logs.find(line => line.includes('appConfig'))!;
    expect(snippet).toContain('src/app/app.config.ts');
    expect(snippet).toContain('export const appConfig: ApplicationConfig = {');
    expect(snippet).not.toContain('bootstrapApplication(AppComponent');
  });

  it('says that every component needs its own stylesheet line after the theme', async () => {
    const { logs } = await run({ '/angular.json': workspace('src/styles.scss'), '/src/styles.scss': '' }, BASE);

    // The half of a v15 install that fails silently: no umbrella sheet, so a
    // component without its line renders unstyled and nothing says so.
    const message = logs.find(line => line.includes('ngwr installed.'))!;
    expect(message).toContain('Every component you render needs its own stylesheet line, after the theme.');
    expect(message).toContain("  @use 'ngwr/theme';\n  @use 'ngwr/button';");
    expect(message).toContain('ng g ngwr:component-style <entry point>');
  });

  it('prints no provideWr() call when no answer gave it a feature', async () => {
    const { logs } = await run({ '/angular.json': workspace('src/styles.scss'), '/src/styles.scss': '' }, BASE);

    const snippet = logs.find(line => line.includes('appConfig'))!;
    // An empty `provideWr()` registers nothing, so the snippet would only teach
    // an import to paste for no effect. Matched as a providers LINE: the theme
    // advice below the snippet names `provideWr()` in prose.
    expect(snippet).not.toMatch(/^\s*provideWr\(/m);
    expect(snippet).not.toContain("from 'ngwr';");
    expect(snippet).toContain('provideWrIcons(lucideIcons({ plus: Plus, trash: Trash2 }))');
  });
});
