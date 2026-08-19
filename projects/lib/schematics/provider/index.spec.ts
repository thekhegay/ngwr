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
 * and log `✓ Added provideWrOverlay() to src/main.ts.`; the app then had no
 * overlay container and every dialog and select panel rendered nowhere.
 */

const ANGULAR_JSON = JSON.stringify({
  version: 1,
  projects: {
    app: {
      projectType: 'application',
      root: '',
      sourceRoot: 'src',
      architect: {
        build: { builder: '@angular/build:application', options: { browser: 'src/main.ts' } },
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

/** A workspace laid out like `ng new`, minus the files this rule never reads. */
function workspace(files: Readonly<Record<string, string>>): Tree {
  const tree = new HostTree();
  tree.create('/angular.json', ANGULAR_JSON);
  for (const [path, content] of Object.entries(files)) tree.create(path, content);

  return tree;
}

describe('ng g ngwr:provider', () => {
  it('patches app.config.ts when main.ts only bootstraps', async () => {
    const { tree, logs } = await run(workspace({ '/src/main.ts': SPLIT_MAIN, '/src/app/app.config.ts': APP_CONFIG }), {
      name: 'overlay',
    });

    const config = tree.readText('/src/app/app.config.ts');
    expect(config).toContain("import { provideWrOverlay } from 'ngwr/overlay';");
    expect(config).toContain('provideRouter(routes), provideWrOverlay()');
    // The entry file is not the one that owns the array, so it must come out of
    // this untouched — an import there compiles and does nothing.
    expect(tree.readText('/src/main.ts')).toBe(SPLIT_MAIN);
    // The path is the workspace-relative one the CLI prints, not the tree key.
    expect(logs).toContain('✓ Added provideWrOverlay() to src/app/app.config.ts.');
  });

  it('brings the icon adapter imports along to the file it patches', async () => {
    const { tree } = await run(workspace({ '/src/main.ts': SPLIT_MAIN, '/src/app/app.config.ts': APP_CONFIG }), {
      name: 'icons',
    });

    const config = tree.readText('/src/app/app.config.ts');
    // All three, in the file that holds the call — the failure this replaces
    // planted them in `main.ts` with no call anywhere to use them.
    expect(config).toContain("import { provideWrIcons } from 'ngwr/icon';");
    expect(config).toContain("import { lucideIcons } from 'ngwr/icon/adapters/lucide';");
    expect(config).toContain("import { Plus, Trash2 } from 'lucide';");
    expect(config).toContain('provideWrIcons(lucideIcons({ plus: Plus, trash: Trash2 }))');
  });

  it('still patches main.ts when the providers array is there', async () => {
    const { tree, logs } = await run(workspace({ '/src/main.ts': INLINE_MAIN }), { name: 'theme' });

    const main = tree.readText('/src/main.ts');
    expect(main).toContain("import { provideWrTheme } from 'ngwr/theme';");
    expect(main).toContain('providers: [provideWrTheme()]');
    expect(logs).toContain('✓ Added provideWrTheme() to src/main.ts.');
  });

  it('writes nothing and reports nothing added when no file holds a providers array', async () => {
    const module = `import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule);
`;
    const { tree, logs } = await run(workspace({ '/src/main.ts': module }), { name: 'overlay' });

    expect(tree.readText('/src/main.ts')).toBe(module);
    expect(logs.some(line => line.startsWith('✓ Added'))).toBe(false);
    expect(logs).toContain('ngwr:provider: no providers array in src/main.ts.');
    // The snippet is all the user gets, so it has to be printed instead.
    expect(logs.join('\n')).toContain('bootstrapApplication(AppComponent, {');
  });

  it('is a no-op the second time', async () => {
    const first = await run(workspace({ '/src/main.ts': SPLIT_MAIN, '/src/app/app.config.ts': APP_CONFIG }), {
      name: 'overlay',
    });
    const patched = first.tree.readText('/src/app/app.config.ts');

    const { tree, logs } = await run(first.tree, { name: 'overlay' });

    expect(tree.readText('/src/app/app.config.ts')).toBe(patched);
    expect(logs).toContain('ngwr:provider: src/app/app.config.ts already has provideWrOverlay — no changes.');
  });
});
