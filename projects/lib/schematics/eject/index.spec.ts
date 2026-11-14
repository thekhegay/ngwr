/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';

import { HostTree, type SchematicContext, type Tree } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';

import eject, { type EjectFetch, type EjectManifest } from './index';
import type { Schema } from './schema';
import { ejectRawUrl, ejectableEntryPoints } from './source';

/**
 * `ng g ngwr:eject`, driven over a `HostTree` for the reason
 * `provider/index.spec.ts` gives: the test runner reads `collection.json` out of
 * `dist/`, and this suite should not depend on a build.
 *
 * Two sources stand in for GitHub. `--from` reads the repo's own `projects/lib`,
 * so the real button, card and reveal are what gets ejected. The network path
 * gets a `fetch` over a map of files, which is also what shows the URLs asked
 * for. Nothing here opens a socket.
 */

const LIB = join(process.cwd(), 'projects/lib');

const MANIFEST = JSON.parse(readFileSync(join(LIB, 'package.json'), 'utf8')) as EjectManifest;

interface Run {
  readonly tree: Tree;
  readonly info: readonly string[];
  readonly warnings: readonly string[];
}

const NO_NETWORK: EjectFetch = url => Promise.reject(new Error(`unexpected request for ${url}`));

async function run(
  options: Schema,
  manifest: EjectManifest = MANIFEST,
  fetchFile: EjectFetch = NO_NETWORK,
  tree: Tree = new HostTree()
): Promise<Run> {
  const info: string[] = [];
  const warnings: string[] = [];
  const context = {
    logger: { info: (message: string) => info.push(message), warn: (message: string) => warnings.push(message) },
  } as unknown as SchematicContext;

  const rule = eject(options, manifest, fetchFile) as (target: Tree, ctx: SchematicContext) => Promise<Tree>;
  await rule(tree, context);

  return { tree, info, warnings };
}

/** Every file under `dir`, relative to it, sorted. */
function filesUnder(tree: Tree, dir: string): string[] {
  const found: string[] = [];
  tree.getDir(dir).visit(path => found.push(path.slice(dir.length + 1)));

  return found.sort();
}

/** A `fetch` over a map of URL to body; anything else is a 404. Records what was asked for. */
function fakeFetch(files: Readonly<Record<string, string>>): {
  readonly fetchFile: EjectFetch;
  readonly asked: string[];
} {
  const asked: string[] = [];
  const fetchFile: EjectFetch = url => {
    asked.push(url);
    const body = files[url];

    return Promise.resolve({
      ok: body !== undefined,
      status: body === undefined ? 404 : 200,
      text: () => Promise.resolve(body ?? ''),
    });
  };

  return { fetchFile, asked };
}

/** A two-entry library at 1.2.3: `demo` is a component that leans on `utils` and on a folder nothing exports. */
const FIXTURE_MANIFEST: EjectManifest = {
  version: '1.2.3',
  exports: {
    './package.json': './package.json',
    '.': { default: './public-api.ts' },
    './demo': { sass: './demo/styles/_index.scss', default: './demo/public-api.ts' },
    './demo/testing': { default: './demo/testing/public-api.ts' },
    './utils': { default: './utils/public-api.ts' },
    './theme': { sass: './theme/_index.scss', default: './theme/public-api.ts' },
    './icon': { sass: './icon/styles/_index.scss', default: './icon/public-api.ts' },
  },
};

const RAW = 'https://raw.githubusercontent.com/thekhegay/ngwr/v1.2.3/projects/lib';

const FIXTURE_FILES: Readonly<Record<string, string>> = {
  [`${RAW}/demo/public-api.ts`]: "export { WrDemo } from './demo';\nexport type { WrDemoSize } from './types';\n",
  [`${RAW}/demo/demo.ts`]: [
    "import { Component } from '@angular/core';",
    '',
    "import { wrUniqueId } from '../utils';",
    "import { wrGetRootFontSize } from '../utils/dom';",
    "import { secret } from '../internal/secret';",
    "import { WrIcon } from 'ngwr/icon';",
    '',
    "import { clamp } from './internal/clamp';",
    "import type { WrDemoSize } from './types';",
    '',
    '/**',
    ' * ```ts',
    " * import { WrDemo } from '../not-a-real-import';",
    ' * ```',
    ' */',
    "@Component({ selector: 'wr-demo', templateUrl: './demo.html', styleUrl: './demo.scss', imports: [WrIcon] })",
    'export class WrDemo {}',
    '',
  ].join('\n'),
  [`${RAW}/demo/demo.html`]: '<span class="wr-demo"></span>\n',
  [`${RAW}/demo/demo.scss`]: "@forward './styles/rules';\n",
  [`${RAW}/demo/demo.spec.ts`]: "it('is never fetched', () => {});\n",
  [`${RAW}/demo/internal/clamp.ts`]: 'export const clamp = (n: number): number => n;\n',
  [`${RAW}/demo/types/index.ts`]: "export type WrDemoSize = 'sm' | 'md';\n",
  [`${RAW}/demo/styles/_index.scss`]: [
    "@use 'sass:map';",
    "@use '../../theme/styles';",
    "@use '../../icon/styles' as icon-styles; // WrIcon",
    "@forward 'rules';",
    '',
  ].join('\n'),
  [`${RAW}/demo/styles/_rules.scss`]: "@use '../../theme/styles/mixins' as theme;\n\n.wr-demo {\n  color: red;\n}\n",
  [`${RAW}/theme/styles/_mixins.scss`]: "@use 'sizes';\n@use '../../icon/styles' as icon;\n",
  [`${RAW}/theme/styles/_sizes.scss`]: '$md: 1rem;\n',
  [`${RAW}/utils/dom/index.ts`]: "export { wrGetRootFontSize } from './root-font-size';\n",
  [`${RAW}/utils/dom/root-font-size.ts`]: [
    "import { clamp } from '../../demo/internal/clamp';",
    "import { wrNoop } from '..';",
    '',
    'export const wrGetRootFontSize = (): number => clamp(16) + Number(wrNoop());',
    '',
  ].join('\n'),
};

describe('ng g ngwr:eject', () => {
  describe('from a local checkout', () => {
    it("writes the button's own files under src/app/ngwr/button, without specs or the harness", async () => {
      const { tree, info } = await run({ entry: 'button', from: LIB });

      expect(filesUnder(tree, '/src/app/ngwr/button')).toEqual([
        'button-group.ts',
        'button.html',
        'button.ts',
        'index.ts',
        'public-api.ts',
        'styles/_index.scss',
        'tokens/button-group.token.ts',
        'tokens/index.ts',
        'types/button-group-context.ts',
        'types/button-icon-position.ts',
        'types/button-shape.ts',
        'types/button-size.ts',
        'types/index.ts',
      ]);
      expect(info[0]).toBe(`✓ Copied ngwr/button@${MANIFEST.version} into src/app/ngwr/button (13 files).`);
    });

    it('opens every file with where it came from and that ng update no longer reaches it', async () => {
      const { tree } = await run({ entry: 'button', from: LIB });
      const origin = `Copied from ngwr@${MANIFEST.version}, entry point ngwr/button, by \`ng g ngwr:eject\`.`;

      for (const file of filesUnder(tree, '/src/app/ngwr/button')) {
        const text = tree.readText(`/src/app/ngwr/button/${file}`);
        expect(text.startsWith(file.endsWith('.html') ? `<!--\n  ${origin}\n` : `// ${origin}\n`), file).toBe(true);
        expect(text, file).toContain('`ng update` no longer updates this copy.');
      }
    });

    it("rewrites the stylesheet's loads of other entry points to their package paths, and it still compiles", async () => {
      const { tree } = await run({ entry: 'button', from: LIB });
      const sheet = tree.readText('/src/app/ngwr/button/styles/_index.scss');

      expect(sheet).toContain("@use 'ngwr/theme' as theme;");
      expect(sheet).toContain("@use 'ngwr/icon' as icon-styles; // WrIcon");
      expect(sheet).toContain("@use 'ngwr/spinner' as spinner-styles; // WrSpinner");
      expect(sheet).not.toMatch(/@use '\.\./);
      expect(compile(sheet)).toContain('.wr-btn');
    });

    it('leaves the TypeScript untouched below the header when every import is already a package path', async () => {
      const { tree, warnings } = await run({ entry: 'button', from: LIB });
      const copied = tree.readText('/src/app/ngwr/button/button.ts');

      expect(copied.slice(copied.indexOf('/**'))).toBe(readFileSync(join(LIB, 'button/button.ts'), 'utf8'));
      expect(warnings).toEqual([]);
    });

    it('honours --path', async () => {
      const { tree, info } = await run({ entry: 'button', from: LIB, path: '/libs/ui/btn/' });

      expect(tree.exists('/libs/ui/btn/button.ts')).toBe(true);
      expect(tree.exists('/src/app/ngwr/button/button.ts')).toBe(false);
      expect(info.join('\n')).toContain("replace `@use 'ngwr/button';` with a `@use` of libs/ui/btn/styles.");
    });

    it('takes the checkout root as well as its projects/lib', async () => {
      const { tree } = await run({ entry: 'button', from: process.cwd() });

      expect(tree.exists('/src/app/ngwr/button/button.ts')).toBe(true);
    });

    it('says the copy and the package must not meet, and how to keep both', async () => {
      const { info } = await run({ entry: 'button', from: LIB });

      expect(info.join('\n')).toContain("never import it and 'ngwr/button' into the same component");
      expect(info.join('\n')).toContain('rename the selector and the `.wr-*` classes in the copy');
    });

    it('copies a styleUrl shim and its rules, and the theme partial they read into the shared folder', async () => {
      const { tree, info, warnings } = await run({ entry: 'card', from: LIB });

      expect(tree.exists('/src/app/ngwr/card/card.scss')).toBe(true);
      // Not `ngwr/theme`: that would emit the whole token layer into the component's own sheet.
      expect(tree.readText('/src/app/ngwr/card/styles/_rules.scss')).toContain(
        "@use '../../_ngwr-internal/theme/styles/mixins' as theme;"
      );
      expect(filesUnder(tree, '/src/app/ngwr/_ngwr-internal')).toEqual(['theme/styles/_mixins.scss']);
      expect(tree.readText('/src/app/ngwr/_ngwr-internal/theme/styles/_mixins.scss')).toMatch(
        /^\/\/ Copied from ngwr@\S+ by `ng g ngwr:eject`: a private file that ejected components share\.\n/
      );
      expect(info.join('\n')).toContain('reads 1 private files of ngwr, kept in src/app/ngwr/_ngwr-internal');
      expect(warnings).toEqual([]);
    });

    it('brings a folder the package does not export, with its own imports, and points the copy at it', async () => {
      const { tree, warnings } = await run({ entry: 'animations/reveal', from: LIB });
      const shared = '/src/app/ngwr/animations/_ngwr-internal';

      expect(warnings).toEqual([]);
      expect(tree.readText('/src/app/ngwr/animations/reveal/types/index.ts')).toContain(
        "from '../../_ngwr-internal/animations/internal';"
      );
      expect(tree.readText('/src/app/ngwr/animations/reveal/styles/_index.scss')).toContain(
        "@use '../../_ngwr-internal/animations/internal/styles/mixins' as core;"
      );
      expect(filesUnder(tree, shared)).toEqual(
        expect.arrayContaining(['animations/internal/index.ts', 'animations/internal/stagger.ts'])
      );
      expect(filesUnder(tree, shared).filter(file => file.endsWith('.spec.ts'))).toEqual([]);
    });

    it.each(['card', 'popover', 'animations/reveal', 'resizable', 'button'])(
      'ejects %s into Sass that compiles and TypeScript that imports only the copy or a public path',
      async entry => {
        const { tree, warnings } = await run({ entry, from: LIB });
        const files = filesUnder(tree, '/src').map(file => `src/${file}`);

        expect(warnings).toEqual([]);
        expect(strayImports(tree, files)).toEqual([]);

        const css = withOnDisk(tree, files, root =>
          files
            .filter(file => file.startsWith(`src/app/ngwr/${entry}/`) && /(styles\/_index|\/[^/_]+)\.scss$/.test(file))
            .map(file => compileFile(join(root, file)))
            .join('\n')
        );
        expect(css).toMatch(/\.wr-/);
      }
    );

    it('shares the private files between components ejected side by side, and keeps an edited one', async () => {
      const tree = new HostTree();
      await run({ entry: 'card', from: LIB }, MANIFEST, NO_NETWORK, tree);
      tree.overwrite('/src/app/ngwr/_ngwr-internal/theme/styles/_mixins.scss', '// mine\n');

      const { info, warnings } = await run({ entry: 'list', from: LIB }, MANIFEST, NO_NETWORK, tree);

      expect(tree.readText('/src/app/ngwr/_ngwr-internal/theme/styles/_mixins.scss')).toBe('// mine\n');
      expect(tree.exists('/src/app/ngwr/_ngwr-internal/theme/styles/_focus.scss')).toBe(true);
      expect(info.join('\n')).toContain('(1 added now)');
      expect(warnings).toEqual([
        `ngwr: src/app/ngwr/_ngwr-internal/theme/styles/_mixins.scss already exists and differs from ngwr@${MANIFEST.version}; it was left as it is.`,
      ]);
    });

    it('puts the shared folder beside --path', async () => {
      const { tree } = await run({ entry: 'card', from: LIB, path: 'libs/ui/card' });

      expect(tree.exists('/libs/ui/_ngwr-internal/theme/styles/_mixins.scss')).toBe(true);
    });

    it('finds a nested entry point by its bare name', async () => {
      const { tree, info } = await run({ entry: 'bar-chart', from: LIB });

      expect(info[0]).toBe('ngwr: bar-chart is ngwr/charts/bar-chart.');
      expect(tree.exists('/src/app/ngwr/charts/bar-chart/public-api.ts')).toBe(true);
    });

    it('refuses to write over an existing copy', async () => {
      const tree = new HostTree();
      tree.create('/src/app/ngwr/button/button.ts', 'mine');

      await expect(run({ entry: 'button', from: LIB }, MANIFEST, NO_NETWORK, tree)).rejects.toThrow(
        /src\/app\/ngwr\/button\/button\.ts already exists/
      );
      expect(tree.readText('/src/app/ngwr/button/button.ts')).toBe('mine');
    });

    it('refuses a folder that is not a checkout', async () => {
      await expect(run({ entry: 'button', from: join(LIB, 'button/styles') })).rejects.toThrow(
        /is not an ngwr checkout/
      );
    });
  });

  describe('what can be ejected', () => {
    it.each([
      ['button/testing', /ngwr\/button\/testing is a test harness, not a component/],
      ['tabs/router', /ngwr\/tabs\/router is a router adapter, not a component/],
      ['i18n/de', /ngwr\/i18n\/de is a translation catalogue, not a component/],
      ['reset', /ngwr\/reset is not an entry point\. Give a component's path under ngwr\/: .*\bbutton\b/],
      ['buton', /ngwr\/buton is not an entry point/],
    ])('refuses %s by name, before reading any source', async (entry, message) => {
      await expect(run({ entry })).rejects.toThrow(message);
    });

    it('refuses utils, which declares no component', async () => {
      const tree = new HostTree();

      await expect(run({ entry: 'utils', from: LIB }, MANIFEST, NO_NETWORK, tree)).rejects.toThrow(
        /ngwr\/utils declares no component or directive/
      );
      expect(filesUnder(tree, '/')).toEqual([]);
    });

    it('lists the candidates from the exports map, without harnesses, adapters or catalogues', () => {
      const names = ejectableEntryPoints(MANIFEST.exports);

      expect(names).toEqual(expect.arrayContaining(['button', 'select', 'charts/bar-chart']));
      expect(names.filter(name => /(^|\/)(testing|router)$|^i18n|\*/.test(name))).toEqual([]);
      expect(names).not.toContain('reset');
    });
  });

  describe('from GitHub', () => {
    it('builds the raw URL of a file at the tag of the installed version', () => {
      expect(ejectRawUrl('16.4.0', 'button/button.ts', MANIFEST.repository)).toBe(
        'https://raw.githubusercontent.com/thekhegay/ngwr/v16.4.0/projects/lib/button/button.ts'
      );
      expect(ejectRawUrl('17.0.0-rc.1', 'charts/bar-chart/public-api.ts')).toBe(
        'https://raw.githubusercontent.com/thekhegay/ngwr/v17.0.0-rc.1/projects/lib/charts/bar-chart/public-api.ts'
      );
      expect(
        ejectRawUrl('1.0.0', 'a.ts', { url: 'git+https://github.com/someone/fork.git', directory: 'packages/ui' })
      ).toBe('https://raw.githubusercontent.com/someone/fork/v1.0.0/packages/ui/a.ts');
    });

    it('fetches the installed version, following imports and never asking for a spec or the harness', async () => {
      const { fetchFile, asked } = fakeFetch(FIXTURE_FILES);
      const { tree, info } = await run({ entry: 'demo' }, FIXTURE_MANIFEST, fetchFile);

      expect(filesUnder(tree, '/src/app/ngwr/demo')).toEqual([
        'demo.html',
        'demo.scss',
        'demo.ts',
        'internal/clamp.ts',
        'public-api.ts',
        'styles/_index.scss',
        'styles/_rules.scss',
        'types/index.ts',
      ]);
      expect(filesUnder(tree, '/src/app/ngwr/_ngwr-internal')).toEqual([
        'theme/styles/_mixins.scss',
        'theme/styles/_sizes.scss',
        'utils/dom/index.ts',
        'utils/dom/root-font-size.ts',
      ]);
      expect(info[0]).toBe('✓ Copied ngwr/demo@1.2.3 into src/app/ngwr/demo (8 files).');
      expect(asked[0]).toBe(`${RAW}/demo/public-api.ts`);
      expect(asked.every(url => url.startsWith(`${RAW}/`))).toBe(true);
      expect(asked.filter(url => /\.spec\.ts$|\/testing\//.test(url))).toEqual([]);
    });

    it('rewrites a relative import of another entry point to its package path', async () => {
      const { tree } = await run({ entry: 'demo' }, FIXTURE_MANIFEST, fakeFetch(FIXTURE_FILES).fetchFile);
      const component = tree.readText('/src/app/ngwr/demo/demo.ts');

      expect(component).toContain("import { wrUniqueId } from 'ngwr/utils';");
      expect(component).toContain("import { WrIcon } from 'ngwr/icon';");
      // Its own files stay relative, and a usage example in a comment is prose.
      expect(component).toContain("import { clamp } from './internal/clamp';");
      expect(component).toContain(" * import { WrDemo } from '../not-a-real-import';");
    });

    it('rewrites Sass loads, keeping the namespace a bare @use had', async () => {
      const { tree } = await run({ entry: 'demo' }, FIXTURE_MANIFEST, fakeFetch(FIXTURE_FILES).fetchFile);

      expect(tree.readText('/src/app/ngwr/demo/styles/_index.scss').split('\n').slice(3)).toEqual([
        "@use 'sass:map';",
        "@use 'ngwr/theme' as styles;",
        "@use 'ngwr/icon' as icon-styles; // WrIcon",
        "@forward 'rules';",
        '',
      ]);
    });

    it('brings a private file and rewrites both ends: the copy reaches it, and it reaches back', async () => {
      const { tree } = await run({ entry: 'demo' }, FIXTURE_MANIFEST, fakeFetch(FIXTURE_FILES).fetchFile);
      const shared = '/src/app/ngwr/_ngwr-internal';

      expect(tree.readText('/src/app/ngwr/demo/demo.ts')).toContain(
        "import { wrGetRootFontSize } from '../_ngwr-internal/utils/dom';"
      );
      expect(tree.readText('/src/app/ngwr/demo/styles/_rules.scss')).toContain(
        "@use '../../_ngwr-internal/theme/styles/mixins' as theme;"
      );
      // Inside the shared folder: a neighbour stays as written, the ejected
      // component is reached in its folder, and an entry point by its package path.
      const privateFile = tree.readText(`${shared}/utils/dom/root-font-size.ts`);
      expect(tree.readText(`${shared}/utils/dom/index.ts`)).toContain("from './root-font-size';");
      expect(privateFile).toContain("import { clamp } from '../../../demo/internal/clamp';");
      const renamed = await run(
        { entry: 'demo', path: 'libs/ui/mine' },
        FIXTURE_MANIFEST,
        fakeFetch(FIXTURE_FILES).fetchFile
      );
      expect(renamed.tree.readText('/libs/ui/_ngwr-internal/utils/dom/root-font-size.ts')).toContain(
        "import { clamp } from '../../../mine/internal/clamp';"
      );
      expect(privateFile).toContain("import { wrNoop } from 'ngwr/utils';");
      expect(tree.readText(`${shared}/theme/styles/_mixins.scss`).split('\n').slice(3, 5)).toEqual([
        "@use 'sizes';",
        "@use 'ngwr/icon' as icon;",
      ]);
    });

    it('warns only on an import whose file cannot be read, with the line in the copy', async () => {
      const { tree, warnings } = await run({ entry: 'demo' }, FIXTURE_MANIFEST, fakeFetch(FIXTURE_FILES).fetchFile);

      expect(warnings).toEqual([
        "ngwr: src/app/ngwr/demo/demo.ts:8 '../internal/secret' reaches a file that could not be read from the " +
          'source, so nothing was copied for it.',
      ]);
      expect(tree.readText('/src/app/ngwr/demo/demo.ts').split('\n')[7]).toBe(
        "import { secret } from '../internal/secret';"
      );
    });

    it('says how to work offline when the request fails', async () => {
      const offline: EjectFetch = () => Promise.reject(new Error('getaddrinfo ENOTFOUND raw.githubusercontent.com'));

      await expect(run({ entry: 'demo' }, FIXTURE_MANIFEST, offline)).rejects.toThrow(
        /could not reach https:\/\/raw\.githubusercontent\.com\/thekhegay\/ngwr\/v1\.2\.3\/projects\/lib\/demo\/public-api\.ts \(getaddrinfo ENOTFOUND.*--from <dir>/
      );
    });

    it('names the missing tag when the release has no such file', async () => {
      await expect(run({ entry: 'demo' }, FIXTURE_MANIFEST, fakeFetch({}).fetchFile)).rejects.toThrow(
        /demo\/public-api\.ts does not exist: there is no v1\.2\.3 tag, or it has no ngwr\/demo/
      );
    });

    it('stops on an answer that is neither a file nor a 404', async () => {
      const limited: EjectFetch = () => Promise.resolve({ ok: false, status: 429, text: () => Promise.resolve('') });

      await expect(run({ entry: 'demo' }, FIXTURE_MANIFEST, limited)).rejects.toThrow(/answered 429/);
    });
  });
});

interface Sass {
  compileString(
    source: string,
    options: { importers: { findFileUrl(url: string): URL | null }[]; style: 'compressed' }
  ): { css: string };
}

/**
 * `sass` through `@angular/build`, as `component-style/index.spec.ts` resolves
 * it, and with an importer rather than `compileSass` from `spec-sass.ts`: that
 * helper resolves through a load path, and no load path can express the `sass`
 * condition `ngwr/button` resolves by.
 */
const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;

/** Compiles a sheet, resolving `ngwr/<name>` through the `sass` condition, as a consumer's build does. */
function compile(source: string): string {
  return sass.compileString(source, {
    style: 'compressed',
    importers: [
      {
        findFileUrl: (url: string) => {
          const entry = url.startsWith('ngwr/')
            ? (MANIFEST.exports[`.${url.slice(4)}`] as { sass?: string } | undefined)
            : null;

          return entry?.sass ? pathToFileURL(join(LIB, entry.sass)) : null;
        },
      },
    ],
  }).css;
}

/** Compiles a stylesheet on disk, so its relative loads resolve between the ejected files. */
const compileFile = (path: string): string => compile(`@use '${pathToFileURL(path).href}';`);

/** Writes the tree's files under a temporary folder for the length of `use`. */
function withOnDisk<T>(tree: Tree, files: readonly string[], use: (root: string) => T): T {
  const root = mkdtempSync(join(tmpdir(), 'ngwr-eject-'));
  try {
    for (const file of files) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), tree.readText(`/${file}`));
    }

    return use(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/**
 * The imports of the ejected TypeScript that would not resolve in an app: a
 * relative one with no file behind it among `files`, or an `ngwr/…` path the
 * `exports` map does not carry.
 */
function strayImports(tree: Tree, files: readonly string[]): string[] {
  const known = new Set(files);
  const stray: string[] = [];

  for (const file of files.filter(path => path.endsWith('.ts'))) {
    for (const line of tree.readText(`/${file}`).split('\n')) {
      if (/^\s*(\*|\/\*|\/\/)/.test(line)) continue;

      for (const match of line.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*|^\s*import\s+)['"]([^'"]+)['"]/g)) {
        const specifier = match[1];
        const target = posix.normalize(posix.join(posix.dirname(file), specifier));
        const resolves = specifier.startsWith('.')
          ? known.has(`${target}.ts`) || known.has(`${target}/index.ts`)
          : !/^ngwr(\/|$)/.test(specifier) || `.${specifier.slice(4)}` in MANIFEST.exports;
        if (!resolves) stray.push(`${file}: ${specifier}`);
      }
    }
  }

  return stray;
}
