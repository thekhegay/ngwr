/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { HostTree, type SchematicContext, type Tree } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';

import provider from './index';
import type { Schema } from './schema';

/**
 * `ng g ngwr:provider` against the two bootstrap shapes in the wild.
 *
 * The rule is driven over a `HostTree` directly rather than through
 * `SchematicTestRunner`, which would load `collection.json` out of `dist/` and
 * make this suite depend on a build. Everything the rule touches is in the tree:
 * `angular.json` for `getWorkspace`, and the source files.
 *
 * The case that matters is the one `ng new` has produced since v17 — `main.ts`
 * bootstraps and `app/app.config.ts` holds the providers. Against it the
 * schematic used to write the import into `main.ts`, splice no call anywhere,
 * and log `✓ Added <call> to src/main.ts.` over an app whose providers had not
 * changed — for the overlay provider, while there was one, that left every
 * dialog and select panel rendering nowhere.
 */

/** `angular.json` for one app, with `stylesPath` as its global stylesheet when given. */
const angularJson = (stylesPath?: string): string =>
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

/** `ng new` since v17: two lines and a config module. */
const SPLIT_MAIN = `import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch(err => console.error(err));
`;

const APP_CONFIG = `import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideZonelessChangeDetection(), provideRouter(routes)],
};
`;

/** The older shape, where the array is in `main.ts` itself. */
const INLINE_MAIN = `import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [],
});
`;

interface Run {
  readonly tree: Tree;
  readonly logs: readonly string[];
}

/** A context with nothing but the logger the rule writes to. */
async function run(tree: Tree, options: Schema): Promise<Run> {
  const logs: string[] = [];
  const context = {
    logger: { info: (message: string) => logs.push(message), warn: (message: string) => logs.push(message) },
  } as unknown as SchematicContext;

  const rule = provider(options) as (target: Tree, ctx: SchematicContext) => Promise<Tree>;
  await rule(tree, context);

  return { tree, logs };
}

/**
 * A workspace laid out like `ng new`, minus the files this rule never reads.
 * `stylesPath` wires a global stylesheet into `angular.json`; its content, if
 * any, is one of `files`.
 */
function workspace(files: Readonly<Record<string, string>>, stylesPath?: string): Tree {
  const tree = new HostTree();
  tree.create('/angular.json', angularJson(stylesPath));
  for (const [path, content] of Object.entries(files)) tree.create(path, content);

  return tree;
}

describe('ng g ngwr:provider', () => {
  it('patches app.config.ts when main.ts only bootstraps', async () => {
    const { tree, logs } = await run(workspace({ '/src/main.ts': SPLIT_MAIN, '/src/app/app.config.ts': APP_CONFIG }), {
      name: 'i18n',
    });

    const config = tree.readText('/src/app/app.config.ts');
    expect(config).toContain("import { provideWrI18n } from 'ngwr/i18n';");
    expect(config).toContain('provideRouter(routes), provideWrI18n()');
    // The entry file is not the one that owns the array, so it must come out of
    // this untouched — an import there compiles and does nothing.
    expect(tree.readText('/src/main.ts')).toBe(SPLIT_MAIN);
    // The path is the workspace-relative one the CLI prints, not the tree key.
    expect(logs).toContain('✓ Added provideWrI18n() to src/app/app.config.ts.');
  });

  it('brings the icon imports along to the file it patches', async () => {
    const { tree } = await run(workspace({ '/src/main.ts': SPLIT_MAIN, '/src/app/app.config.ts': APP_CONFIG }), {
      name: 'icons',
    });

    const config = tree.readText('/src/app/app.config.ts');
    // All three, in the file that holds the call — the failure this replaces
    // planted them in `main.ts` with no call anywhere to use them. The converter
    // lives in `ngwr/icon` itself, so it joins the factory's import line.
    expect(config).toContain("import { provideWrIcons, lucideIcons } from 'ngwr/icon';");
    expect(config).toContain("import { Plus, Trash2 } from 'lucide';");
    expect(config).toContain('provideWrIcons(lucideIcons({ plus: Plus, trash: Trash2 }))');
  });

  it('prints the icon imports as one line per module when it cannot patch', async () => {
    const { logs } = await run(workspace({ '/src/main.ts': 'export {};\n' }), { name: 'icons' });

    const snippet = logs.join('\n');
    expect(snippet).toContain("import { provideWrIcons, lucideIcons } from 'ngwr/icon';");
    expect(snippet).toContain("import { Plus, Trash2 } from 'lucide';");
    expect(snippet.match(/from 'ngwr\/icon'/g)).toHaveLength(1);
  });

  it('still patches main.ts when the providers array is there', async () => {
    const { tree, logs } = await run(workspace({ '/src/main.ts': INLINE_MAIN }), { name: 'density' });

    const main = tree.readText('/src/main.ts');
    // A feature, so it arrives inside the root entry point's `provideWr()` —
    // which the array did not have, so the call comes with it.
    expect(main).toContain("import { provideWr } from 'ngwr';");
    expect(main).toContain("import { withDensity } from 'ngwr/density';");
    expect(main).toContain('providers: [provideWr(withDensity())]');
    expect(logs).toContain('✓ Added provideWr(withDensity()) to src/main.ts.');
  });

  it('adds withTheme() and the loading bar router adapter', async () => {
    const files = { '/src/main.ts': SPLIT_MAIN, '/src/app/app.config.ts': APP_CONFIG };
    const first = await run(workspace(files), { name: 'theme' });
    const { tree } = await run(first.tree, { name: 'loading-bar-router' });

    const config = tree.readText('/src/app/app.config.ts');
    // A bare `withTheme()` is what makes a stored scheme land at boot, and the
    // router adapter is what makes the bar move for navigation: without it the
    // bar sits at 0% and nothing says why.
    expect(config).toContain("import { withTheme } from 'ngwr/theme';");
    expect(config).toContain("import { provideWrLoadingBarRouter } from 'ngwr/loading-bar/router';");
    expect(config).toContain('provideWr(withTheme()), provideWrLoadingBarRouter()');
  });

  it('adds a feature to the provideWr() call that is already there', async () => {
    const config = `import { ApplicationConfig } from '@angular/core';
import { provideWr } from 'ngwr';
import { withDensity } from 'ngwr/density';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes), provideWr(withDensity({ defaultDensity: 'sm' }))],
};
`;
    const { tree, logs } = await run(workspace({ '/src/main.ts': SPLIT_MAIN, '/src/app/app.config.ts': config }), {
      name: 'storage',
    });

    const patched = tree.readText('/src/app/app.config.ts');
    // One `provideWr()`, carrying both — a second call would compile, and
    // splitting app-wide configuration across two is what it exists to stop.
    expect(patched).toContain("provideWr(withDensity({ defaultDensity: 'sm' }), withStorage())");
    expect(patched.match(/provideWr\(/g)).toHaveLength(1);
    expect(patched.match(/from 'ngwr';/g)).toHaveLength(1);
    expect(patched).toContain("import { withStorage } from 'ngwr/storage';");
    expect(logs).toContain('✓ Added withStorage() to provideWr() in src/app/app.config.ts.');
  });

  it('keeps a one-feature-per-line provideWr() in that layout', async () => {
    const config = `import { provideWr } from 'ngwr';
import { withDensity } from 'ngwr/density';

export const appConfig = {
  providers: [
    provideRouter(routes),
    provideWr(
      withDensity(),
    ),
  ],
};
`;
    const { tree } = await run(workspace({ '/src/main.ts': SPLIT_MAIN, '/src/app/app.config.ts': config }), {
      name: 'toast',
    });

    expect(tree.readText('/src/app/app.config.ts')).toContain(
      ['    provideWr(', '      withDensity(),', '      withToast({}),', '    ),'].join('\n')
    );
  });

  it('splices into the providers array, not into an array nested inside it', async () => {
    // The array used to be read up to its first `]`, which here is the end of
    // `importProvidersFrom([…])`: the call landed inside that, as a module.
    const config = `export const appConfig = {
  providers: [importProvidersFrom([LegacyModule]), provideRouter(routes)],
};
`;
    const { tree } = await run(workspace({ '/src/main.ts': SPLIT_MAIN, '/src/app/app.config.ts': config }), {
      name: 'i18n',
    });

    expect(tree.readText('/src/app/app.config.ts')).toContain(
      'providers: [importProvidersFrom([LegacyModule]), provideRouter(routes), provideWrI18n()]'
    );
  });

  it('prints provideWr() with its import when it cannot patch a feature in', async () => {
    const { logs } = await run(workspace({ '/src/main.ts': 'export {};\n' }), { name: 'density' });

    const snippet = logs.join('\n');
    expect(snippet).toContain("import { provideWr } from 'ngwr';");
    expect(snippet).toContain("import { withDensity } from 'ngwr/density';");
    expect(snippet).toContain('providers: [/* …, */ provideWr(withDensity())]');
  });

  it('writes nothing and reports nothing added when no file holds a providers array', async () => {
    const module = `import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule);
`;
    const { tree, logs } = await run(workspace({ '/src/main.ts': module }), { name: 'i18n' });

    expect(tree.readText('/src/main.ts')).toBe(module);
    expect(logs.some(line => line.startsWith('✓ Added'))).toBe(false);
    expect(logs).toContain('ngwr:provider: no providers array in src/main.ts.');
    // The snippet is all the user gets, so it has to be printed instead.
    expect(logs.join('\n')).toContain('export const appConfig: ApplicationConfig = {');
  });

  it('is a no-op the second time for a feature too', async () => {
    const first = await run(workspace({ '/src/main.ts': INLINE_MAIN }), { name: 'toast' });
    const patched = first.tree.readText('/src/main.ts');

    const { tree, logs } = await run(first.tree, { name: 'toast' });

    expect(tree.readText('/src/main.ts')).toBe(patched);
    expect(logs).toContain('ngwr:provider: src/main.ts already has withToast — no changes.');
  });

  it('is a no-op the second time', async () => {
    const first = await run(workspace({ '/src/main.ts': SPLIT_MAIN, '/src/app/app.config.ts': APP_CONFIG }), {
      name: 'i18n',
    });
    const patched = first.tree.readText('/src/app/app.config.ts');

    const { tree, logs } = await run(first.tree, { name: 'i18n' });

    expect(tree.readText('/src/app/app.config.ts')).toBe(patched);
    expect(logs).toContain('ngwr:provider: src/app/app.config.ts already has provideWrI18n — no changes.');
  });
});

/**
 * `withDensity()` writes `data-wr-density` on `<html>`, and the multipliers that
 * attribute selects live in `ngwr/density`'s own sheet, which no component sheet
 * loads. So the provider alone changes nothing on screen, and nothing says so:
 * `ng g ngwr:provider density` adds the sheet line too.
 */
describe('ng g ngwr:provider density — the stylesheet half', () => {
  const app = { '/src/main.ts': SPLIT_MAIN, '/src/app/app.config.ts': APP_CONFIG };

  it('adds the density line after the theme line', async () => {
    const { tree, logs } = await run(
      workspace({ ...app, '/src/styles.scss': "@use 'ngwr/theme';\nbody { margin: 0; }\n" }, 'src/styles.scss'),
      { name: 'density' }
    );

    expect(tree.readText('/src/styles.scss')).toBe("@use 'ngwr/theme';\n@use 'ngwr/density';\nbody { margin: 0; }\n");
    expect(tree.readText('/src/app/app.config.ts')).toContain('provideWr(withDensity())');
    expect(logs).toContain("✓ Added `@use 'ngwr/density';` to src/styles.scss.");
  });

  it('puts the theme first when the stylesheet has none', async () => {
    const { tree } = await run(workspace({ ...app, '/src/styles.scss': 'body { margin: 0; }\n' }, 'src/styles.scss'), {
      name: 'density',
    });

    // The theme is the first load v15 requires, and the only one that can take
    // `with (...)`, so it goes in above the density line rather than after it.
    expect(tree.readText('/src/styles.scss')).toBe("@use 'ngwr/theme';\n@use 'ngwr/density';\nbody { margin: 0; }\n");
  });

  it('goes after the last @use, below a configured theme that spans lines', async () => {
    const before = [
      "@use 'ngwr/theme' with (",
      '  $base-colors: (primary: #3567ff)',
      ');',
      "@use 'ngwr/button';",
      '',
      'body { margin: 0; }',
      '',
    ].join('\n');
    const { tree } = await run(workspace({ ...app, '/src/styles.scss': before }, 'src/styles.scss'), {
      name: 'density',
    });

    expect(tree.readText('/src/styles.scss')).toBe(
      before.replace("@use 'ngwr/button';\n", "@use 'ngwr/button';\n@use 'ngwr/density';\n")
    );
  });

  it('is a no-op the second time, for the stylesheet as well', async () => {
    const files = { ...app, '/src/styles.scss': "@use 'ngwr/theme';\n" };
    const first = await run(workspace(files, 'src/styles.scss'), { name: 'density' });
    const styles = first.tree.readText('/src/styles.scss');

    const { tree, logs } = await run(first.tree, { name: 'density' });

    expect(tree.readText('/src/styles.scss')).toBe(styles);
    expect(styles.match(/ngwr\/density/g)).toHaveLength(1);
    expect(logs).toContain('ngwr:provider: src/styles.scss already imports ngwr/density — no changes.');
  });

  it('still adds the line when the call has to be pasted by hand', async () => {
    // No providers array anywhere: the snippet is printed, and once it is pasted
    // the provider needs the sheet exactly as much.
    const { tree, logs } = await run(
      workspace({ '/src/main.ts': 'export {};\n', '/src/styles.scss': "@use 'ngwr/theme';\n" }, 'src/styles.scss'),
      { name: 'density' }
    );

    expect(tree.readText('/src/styles.scss')).toBe("@use 'ngwr/theme';\n@use 'ngwr/density';\n");
    expect(logs.join('\n')).toContain('providers: [/* …, */ provideWr(withDensity())]');
  });

  it('writes nothing into a css stylesheet, and names the line it needs', async () => {
    const before = 'body { margin: 0; }\n';
    const { tree, logs } = await run(workspace({ ...app, '/src/styles.css': before }, 'src/styles.css'), {
      name: 'density',
    });

    expect(tree.readText('/src/styles.css')).toBe(before);
    expect(logs.some(line => line.includes('src/styles.css is not Sass.'))).toBe(true);
    expect(logs.some(line => line.includes("withDensity() also needs `@use 'ngwr/density';`"))).toBe(true);
  });

  it('says what to add when no global stylesheet is wired', async () => {
    const { logs } = await run(workspace(app), { name: 'density' });

    expect(logs.some(line => line.includes("Add `@use 'ngwr/density';` after `@use 'ngwr/theme';`"))).toBe(true);
  });

  it('leaves the stylesheet alone for a provider that needs no sheet', async () => {
    const before = "@use 'ngwr/theme';\n";
    const { tree } = await run(workspace({ ...app, '/src/styles.scss': before }, 'src/styles.scss'), {
      name: 'toast',
    });

    expect(tree.readText('/src/styles.scss')).toBe(before);
  });
});
