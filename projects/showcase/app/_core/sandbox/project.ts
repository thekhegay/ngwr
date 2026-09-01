import { VERSION as CDK_VERSION } from '@angular/cdk';
import { VERSION as NG_VERSION } from '@angular/core';

import { NGWR_VERSION } from 'ngwr/version';

import { readComponentSource } from './component-source';
import { renderIconsFile } from './demo-icons';
import { isTemplateLanguage, isTypeScriptLanguage } from './languages';
import { scanTemplate, type SandboxField, type TemplateScan } from './resolve';
import type { SandboxFile, SandboxProject } from './types';

import { STYLE_ENTRY_POINTS } from '#core/generated/selectors';

/**
 * Builds a bootable Angular 22 workspace out of a docs snippet.
 *
 * Pure and DOM-free on purpose — the form POST lives next door in
 * `stackblitz.ts`, so everything decided here can be reasoned about (and one
 * day asserted) without a browser. The two callers of the module are the
 * sandbox service and, eventually, whatever wants to write the same project to
 * disk.
 *
 * Three tiers, tried in order, and the third one always succeeds:
 *
 * 1. the snippet already IS a component — ship it verbatim (`component`);
 * 2. the snippet is a template fragment — synthesise a component whose
 *    `imports` come from the generated selector map (`template`);
 * 3. anything else — an app that renders the snippet as text, with the reason
 *    it could not be wired printed above it (`source`).
 *
 * Tier 3 is why the builder never gambles: a fragment the scanner is unsure
 * about drops to it rather than emitting a workspace that cannot compile. A
 * blank page with a compiler error in a console the visitor did not open is
 * worse than no button at all.
 *
 * **What that does and does not promise.** Every tier emits a COMPLETE,
 * self-consistent workspace — every import resolves, every provider a component
 * injects is registered, and no file references one that is not there. That
 * much is decided here and can be read off the output.
 *
 * Whether it then serves inside StackBlitz's container is a separate question,
 * and the answer is now yes — watched, once, end to end: install, `ng serve`,
 * "Application bundle generation complete [25.8 seconds]", and the demo painted
 * in the preview pane. Getting there took two fixes, both of them defects in
 * what this file emitted rather than in the container:
 *
 * - **No `development` configuration.** `ng serve` ran the optimized build on
 *   every start, which is the path the container died on, in rolldown, over
 *   rxjs's circular ESM (`rxjs/dist/esm/internal/scheduled/scheduled.js`). The
 *   dev server had been saying so all along: "Prebundling has been configured
 *   but will not be used because scripts optimization is enabled."
 * - **`@use 'ngwr';`.** The umbrella compiles all hundred-and-twenty component
 *   stylesheets to serve a two-element demo, and the container answered with an
 *   out-of-memory error. Narrowed to the entry points the snippet actually
 *   renders (see `stylesScss`), the CSS drops from 287 kB to 44 kB.
 *
 * One observation is not a guarantee. The cold path is roughly two and a half
 * minutes and how long a container takes is StackBlitz's call, so the honest
 * claim is "this has been seen to work", not "this always works".
 */

/** Versions the generated project pins, all read rather than written down. */
const ANGULAR = `^${NG_VERSION.full}`;
const CDK = `^${CDK_VERSION.full}`;
const NGWR = `^${NGWR_VERSION}`;

/**
 * Angular's CLI packages move on their own patch train from the framework (see
 * AGENTS.md), so the range is the major the framework reports rather than its
 * exact version — asking for `@angular/build@22.1.2` when the published
 * tooling is at 22.1.4 is a resolution failure inside the container.
 */
const TOOLING = `^${NG_VERSION.major}.0.0`;

/**
 * The one version here that is a literal, and the reason it has to be: the
 * peer range lives in `@angular/compiler-cli`'s manifest, which the browser
 * cannot read. Angular 22 asks for `>=6.0 <6.1` and TypeScript 7 is out, so an
 * unpinned `typescript` resolves to a major the compiler refuses. Re-check it
 * when the framework major moves.
 */
const TYPESCRIPT = '~6.0.0';

/**
 * The icon set the generated `src/app/icons.ts` imports from. A literal for the
 * same reason as TypeScript above — nothing in the browser can read the repo's
 * own devDependency — and it only ships when a snippet actually draws an icon.
 * Keep it in step with `lucide` in the root `package.json`.
 */
const LUCIDE = '^1.35.0';

/** Element the generated app mounts when the sandbox synthesises the component. */
const ROOT_SELECTOR = 'demo-root';

const SITE = 'https://ngwr.dev';

/**
 * A stub's seed, chosen so the template cannot throw on it. See `SandboxField`.
 *
 * `method` returns an array and not `null` for the same reason `object` is not
 * `null`: a stubbed call is chained as often as it is printed. `perms()` in
 * `perms().includes(p)` is a signal read on the page, and `null.includes` is a
 * TypeError — a blank sandbox — while `[]` answers `false` and prints as
 * nothing.
 *
 * The cost of that choice, stated so nobody has to rediscover it: `[]` is
 * TRUTHY, so a fragment gated on `@if (open())` renders EXPANDED in the sandbox
 * where the page shows it collapsed. The trade is deliberate — a wrong initial
 * state is a demo the reader can still drive, while `null.includes` is a page
 * with nothing on it — but it is a difference from the docs page, not a
 * faithful copy of it.
 */
const SEEDS: Readonly<Record<SandboxField['kind'], string>> = {
  value: 'null',
  object: '{}',
  list: '[]',
  method: '[]',
  signal: '[]',
};

/**
 * A comment terminator inside a generated JSDoc closes it early and the rest of
 * the file becomes code. Titles come from `document.title` and reasons quote
 * paths out of the snippet, so neither is ours to trust.
 */
const jsdocSafe = (text: string): string => text.replace(/\*\//g, '*\u2044');

/**
 * The manifest, and the one thing measured about it rather than assumed.
 *
 * Cold install cost is the sandbox's biggest unknown (see the module comment),
 * so the obvious lever is a shorter dependency list. It is a much smaller lever
 * than it looks, and the numbers are reproducible — write the emitted
 * `package.json` to an empty directory and run
 * `npm install --package-lock-only`, then count `packages` in the lockfile:
 *
 * - as emitted: **434** entries.
 * - dropping `@angular/compiler`: **still 434**. It is a hard peer of
 *   `@angular/compiler-cli` and of `@angular/build`, so npm installs it either
 *   way. `ng new` lists it too, and matching what `ng new` writes is worth more
 *   than a line that saves nothing.
 * - dropping `@angular/router`: **433**, one package — and it would break every
 *   snippet that reaches `ngwr/sidebar`, `ngwr/tabs`, `ngwr/breadcrumbs` or
 *   `ngwr/loading-bar`, all of which import `@angular/router` at module level
 *   (`grep -rl "@angular/router" projects/lib`). One package is not worth a
 *   module-resolution error, so it stays unconditional.
 *
 * `lucide` is the only entry that is genuinely conditional, and it is gated
 * below. So trimming is not the answer to a failed install; it is only tidiness.
 */
function packageJson(needsIcons: boolean): string {
  const dependencies: Record<string, string> = {
    '@angular/cdk': CDK,
    '@angular/common': ANGULAR,
    '@angular/compiler': ANGULAR,
    '@angular/core': ANGULAR,
    '@angular/forms': ANGULAR,
    '@angular/platform-browser': ANGULAR,
    '@angular/router': ANGULAR,
    ngwr: NGWR,
    rxjs: '~7.8.0',
    tslib: '^2.8.1',
  };
  // Only when the snippet actually draws one: `ngwr/icon` is adapter-agnostic
  // and a sandbox that installs an icon set nothing renders is slower to boot
  // for no reason.
  if (needsIcons) dependencies['lucide'] = LUCIDE;

  return `${JSON.stringify(
    {
      name: 'ngwr-sandbox',
      version: '0.0.0',
      private: true,
      scripts: { start: 'ng serve', build: 'ng build' },
      dependencies,
      devDependencies: {
        '@angular/build': TOOLING,
        '@angular/cli': TOOLING,
        '@angular/compiler-cli': ANGULAR,
        typescript: TYPESCRIPT,
      },
    },
    null,
    2
  )}\n`;
}

/**
 * `.npmrc` — two flags, both about the install the container has to run.
 *
 * `audit=false` drops the POST to the registry's audit endpoint, which sends
 * the whole resolved tree and answers with a report nobody reads in a sandbox;
 * `fund=false` drops the funding lookup. Neither changes what is installed.
 *
 * Honest about what this is: a plausible saving, NOT a measured one. The
 * install failure the module comment describes has not been reproduced or
 * attributed, so this is round trips removed on principle rather than a fix
 * anyone has watched work.
 */
function npmrc(): string {
  return ['audit=false', 'fund=false', ''].join('\n');
}

function angularJson(): string {
  return `${JSON.stringify(
    {
      $schema: './node_modules/@angular/cli/lib/config/schema.json',
      version: 1,
      // The CLI asks about analytics on its first run in a fresh container and
      // waits for an answer nobody can give it — the dev server never starts.
      cli: { analytics: false, packageManager: 'npm' },
      projects: {
        sandbox: {
          projectType: 'application',
          root: '',
          sourceRoot: 'src',
          prefix: 'demo',
          architect: {
            build: {
              builder: '@angular/build:application',
              options: {
                outputPath: 'dist/sandbox',
                index: 'src/index.html',
                browser: 'src/main.ts',
                tsConfig: 'tsconfig.json',
                inlineStyleLanguage: 'scss',
                styles: ['src/styles.scss'],
              },
              // A `development` configuration, and `serve` defaulting to it, is
              // what `ng new` writes and what this workspace was missing. Without
              // one, `ng serve` runs the OPTIMIZED build on every start — the
              // dev server said so itself: "Prebundling has been configured but
              // will not be used because scripts optimization is enabled". That
              // is slow anywhere and it is the path StackBlitz's container died
              // on, in rolldown, over rxjs's circular ESM
              // (`rxjs/dist/esm/internal/scheduled/scheduled.js`). Locally the
              // optimized path survives it; the container's build of rolldown
              // does not.
              configurations: {
                production: {
                  outputHashing: 'all',
                  extractLicenses: false,
                  sourceMap: false,
                  optimization: true,
                },
                development: {
                  optimization: false,
                  extractLicenses: false,
                  sourceMap: true,
                },
              },
              defaultConfiguration: 'production',
            },
            serve: {
              builder: '@angular/build:dev-server',
              configurations: {
                development: { buildTarget: 'sandbox:build:development' },
                production: { buildTarget: 'sandbox:build:production' },
              },
              defaultConfiguration: 'development',
            },
          },
        },
      },
    },
    null,
    2
  )}\n`;
}

function tsconfigJson(): string {
  return `${JSON.stringify(
    {
      compileOnSave: false,
      compilerOptions: {
        strict: true,
        noImplicitOverride: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
        skipLibCheck: true,
        isolatedModules: true,
        esModuleInterop: true,
        experimentalDecorators: true,
        importHelpers: true,
        moduleResolution: 'bundler',
        module: 'ES2022',
        target: 'ES2022',
        lib: ['ES2022', 'dom'],
      },
      include: ['src/**/*.ts'],
      angularCompilerOptions: {
        strictInjectionParameters: true,
        strictInputAccessModifiers: true,
        strictTemplates: true,
      },
    },
    null,
    2
  )}\n`;
}

function indexHtml(selector: string, title: string): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="utf-8" />',
    `    <title>${title.replace(/[<>&]/g, '')}</title>`,
    '    <base href="/" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
    '  </head>',
    '  <body>',
    `    <${selector}></${selector}>`,
    '  </body>',
    '</html>',
    '',
  ].join('\n');
}

/**
 * The stylesheet, narrowed to the entry points the demo actually renders.
 *
 * `@use 'ngwr';` is one line and compiles all hundred-and-twenty component
 * sheets. That is the right default in an app and the wrong one here: inside
 * StackBlitz's container the dev server died with an out-of-memory error, and
 * compiling the whole catalog's Sass to serve a two-element demo is the largest
 * piece of work in the build that nothing on the page needs. Per-entry `@use`
 * is also dedup-safe and pulls the theme in on its own, so the narrow form is
 * not a lesser version of the umbrella — it is what `/start/installation`
 * already recommends for an app that imports a handful of components.
 *
 * `ngwr/theme` goes in unconditionally: the body rule below paints with
 * `--wr-*`, and a project whose only component ships no styles would otherwise
 * render on an unthemed page.
 *
 * Only subpaths in the generated `STYLE_ENTRY_POINTS` are emitted. `@use` on an
 * entry point without a `styles/_index.scss` — `ngwr/date`, `ngwr/utils` — is a
 * build error rather than a no-op, so guessing is not an option.
 */
/**
 * The `ngwr/*` subpaths a hand-written component imports.
 *
 * Tier 1 ships the snippet's own TypeScript, so unlike tier 2 there is no scan
 * to ask — the import lines are the only statement of what it renders. A regex
 * is enough because the target is an import specifier, which cannot span lines
 * or carry an expression.
 */
function ngwrSubpathsIn(...sources: readonly string[]): readonly string[] {
  const out = new Set<string>();
  for (const source of sources) {
    for (const m of source.matchAll(/from\s+['"](ngwr\/[\w./-]+)['"]/g)) out.add(m[1]);
  }
  return [...out];
}

function stylesScss(subpaths: readonly string[]): string {
  const shipsStyles = new Set<string>(STYLE_ENTRY_POINTS);
  const used = [...new Set(subpaths.filter(p => shipsStyles.has(p)))].sort();
  const uses = ['ngwr/theme', ...used.filter(p => p !== 'ngwr/theme')];

  return [
    '// Only the entry points this demo renders, plus the token layer. Each one',
    '// pulls the theme in itself and de-duplicates, so this is the same output',
    "// as `@use 'ngwr';` minus every component the page does not draw.",
    ...uses.map(p => `@use '${p}';`),
    '',
    'body {',
    '  margin: 0;',
    '  padding: 2rem;',
    '  background: var(--wr-color-surface);',
    '  color: var(--wr-color-on-surface);',
    '  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;',
    '}',
    '',
  ].join('\n');
}

/**
 * `main.ts` — the bootstrap.
 *
 * Three providers are UNCONDITIONAL, and the rule behind that is worth stating
 * because an earlier version tried to earn each one from the markup and shipped
 * a blank page for its trouble: a provider whose absence is a
 * `NullInjectorError` costs nothing to include and cannot be predicted from a
 * fragment, so it is always emitted.
 *
 * - `provideWrOverlay()` — ngwr's own CDK overlay container; every overlay
 *   component in the catalog is dead without it.
 * - `provideWrDateAdapter()` — `WrDateAdapter` is an abstract class with no root
 *   factory, injected non-optionally by `wr-calendar`, `wr-event-calendar`,
 *   `wr-date-picker`, `wr-date-range-picker` and the three internal panels —
 *   `grep -rn "inject<WrDateAdapter" projects/lib` finds those seven plus the
 *   `wrDate` pipe, which is the one that injects it optionally. Every one of
 *   those snippets used to open on a blank page. It is also what `ng add ngwr`
 *   writes.
 * - `provideRouter([], withDisabledInitialNavigation())` — `wr-sidebar` calls
 *   `inject(Router)` with no `optional` flag (`grep -rn "inject(Router)"
 *   projects/lib`), so the same failure reaches components whose markup never
 *   says "router". The route table is empty because a fragment cannot carry
 *   one, and the initial navigation is disabled deliberately: an empty config
 *   matches no URL, and the resulting `NG04002` rejects the navigation promise
 *   and lands in the console. Disabling it still installs the location
 *   listener, so `routerLink` resolves and renders an `href`.
 *
 * The one thing that IS gated is icons, because it is the only one that costs
 * an npm package (`lucide`) rather than an import line.
 */
function mainTs(component: string, from: string, isDefault: boolean, needsIcons: boolean): string {
  const core = ['provideBrowserGlobalErrorListeners', 'provideZonelessChangeDetection'];

  const imports = [
    `import { ${core.join(', ')} } from '@angular/core';`,
    `import { bootstrapApplication } from '@angular/platform-browser';`,
    `import { provideRouter, withDisabledInitialNavigation } from '@angular/router';`,
    '',
    `import { provideWrDateAdapter } from 'ngwr/date';`,
  ];
  if (needsIcons) imports.push(`import { provideWrIcons } from 'ngwr/icon';`);
  imports.push(`import { provideWrOverlay } from 'ngwr/overlay';`);
  imports.push('');
  imports.push(isDefault ? `import ${component} from '${from}';` : `import { ${component} } from '${from}';`);
  if (needsIcons) imports.push(`import { DEMO_ICONS } from './app/icons';`);

  const providers = [
    '    provideBrowserGlobalErrorListeners(),',
    '    provideZonelessChangeDetection(),',
    '    provideRouter([], withDisabledInitialNavigation()),',
    '    provideWrDateAdapter(),',
    '    provideWrOverlay(),',
  ];
  if (needsIcons) providers.push('    provideWrIcons(DEMO_ICONS),');

  return [
    ...imports,
    '',
    `bootstrapApplication(${component}, {`,
    '  providers: [',
    ...providers,
    '  ],',
    '}).catch(error => console.error(error));',
    '',
  ].join('\n');
}

/** The synthesised component for a template fragment. */
function appTs(scan: TemplateScan, title: string): string {
  const symbols = [...scan.imports.values()].flat();
  const importLines = [...scan.imports.entries()].map(
    ([path, names]) => `import { ${names.join(', ')} } from '${path}';`
  );

  const angular = importLines.filter(line => line.includes("'@angular/"));
  const rest = importLines.filter(line => !line.includes("'@angular/"));

  const fields = scan.fields.map(field => {
    if (field.kind === 'method') {
      return `  protected ${field.name}(...args: any[]): any {\n    return ${SEEDS.method};\n  }`;
    }
    // A signal, not a field: the fragment read it as `x()` AND, half the time,
    // wrote it back as `x.set($event)` from the other end of a two-way binding.
    if (field.kind === 'signal') return `  protected readonly ${field.name} = signal<any>(${SEEDS.signal});`;
    return `  protected ${field.name}: any = ${SEEDS[field.kind]};`;
  });

  const needsSignal = scan.fields.some(field => field.kind === 'signal');

  const body =
    fields.length === 0
      ? '{}'
      : [
          '{',
          '  // Stubbed by the sandbox. The docs page owned these values; the snippet',
          '  // showed the markup that reads them, not where they come from. Replace',
          '  // each one with the real thing — that is the exercise.',
          ...fields,
          '}',
        ].join('\n');

  return [
    `import { Component${needsSignal ? ', signal' : ''} } from '@angular/core';`,
    ...(angular.length > 0 ? angular : []),
    ...(rest.length > 0 ? ['', ...rest] : []),
    '',
    '/**',
    ` * ${jsdocSafe(title)}`,
    ' *',
    ` * Generated from a snippet on ${SITE}. The markup in \`app.html\` is the`,
    " * page's, character for character; the `imports` below were resolved from it",
    " * against ngwr's selector map.",
    ' */',
    '@Component({',
    `  selector: '${ROOT_SELECTOR}',`,
    `  templateUrl: './app.html',`,
    `  imports: [${symbols.join(', ')}],`,
    '})',
    `export class App ${body}`,
    '',
  ].join('\n');
}

/** Tier 3: an app whose whole job is to show the snippet and say why. */
function sourceAppTs(files: readonly SandboxFile[], reasons: readonly string[], title: string): string {
  const entries = files
    .filter(f => f.code.trim().length > 0)
    .map(f => `    { label: ${JSON.stringify(f.label)}, code: ${JSON.stringify(f.code)} },`);

  return [
    `import { Component } from '@angular/core';`,
    '',
    '/**',
    ` * ${jsdocSafe(title)}`,
    ' *',
    ` * The sandbox could not wire this snippet into a running component, so it`,
    ' * shows the source rather than opening an app that would not compile:',
    ...reasons.map(reason => ` *   - ${jsdocSafe(reason)}`),
    ' *',
    ' * Everything else in the workspace is real — ngwr and Angular are installed',
    ' * and the dev server is running. Paste the snippet into a component of your',
    ' * own and add the imports it needs; `ng g ngwr:use WrFoo` will do the wiring.',
    ' */',
    '@Component({',
    `  selector: '${ROOT_SELECTOR}',`,
    `  templateUrl: './app.html',`,
    '})',
    'export class App {',
    `  protected readonly title = ${JSON.stringify(title)};`,
    '',
    '  protected readonly reasons: readonly string[] = [',
    ...reasons.map(reason => `    ${JSON.stringify(reason)},`),
    '  ];',
    '',
    '  protected readonly files: readonly { label: string; code: string }[] = [',
    ...entries,
    '  ];',
    '}',
    '',
  ].join('\n');
}

function sourceAppHtml(): string {
  return [
    '<article>',
    '  <h1>{{ title }}</h1>',
    '  <p>',
    '    This snippet could not be wired into a running component automatically, so it is shown as source. The',
    '    workspace itself is real — ngwr is installed and the dev server is up.',
    '  </p>',
    '  <ul>',
    '    @for (reason of reasons; track reason) {',
    '      <li>{{ reason }}</li>',
    '    }',
    '  </ul>',
    '  @for (file of files; track file.label) {',
    '    <h2>{{ file.label }}</h2>',
    '    <pre><code>{{ file.code }}</code></pre>',
    '  }',
    '</article>',
    '',
  ].join('\n');
}

function readme(title: string, kind: string): string {
  return [
    `# ${title}`,
    '',
    `Generated from [ngwr.dev](${SITE}) — a signals-first Angular UI library.`,
    '',
    `- Wiring: \`${kind}\``,
    `- ngwr: \`${NGWR}\`, Angular: \`${ANGULAR}\``,
    '',
    'To get the same setup locally:',
    '',
    '```bash',
    'ng new my-app --style=scss',
    'cd my-app',
    'ng add ngwr',
    '```',
    '',
  ].join('\n');
}

/**
 * Anything the tiers did not consume, kept so no code the page showed is lost.
 *
 * Outside `src/`, and that placement is the whole point: `tsconfig.json` above
 * includes `src/**\/*.ts`, so a spare labelled `app.component.ts` — and labels
 * with dots are already a live convention, `playground.ts` uses `demo.ts` —
 * would be COMPILED. A docs excerpt with none of its imports then fails the
 * build of a workspace that was otherwise fine, for a file nobody asked to run.
 * `snippets/` is reached by no `include` and no builder glob.
 */
function spareFiles(files: readonly SandboxFile[], consumed: ReadonlySet<SandboxFile>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const file of files) {
    if (consumed.has(file) || file.code.trim().length === 0) continue;
    const name = file.label.includes('.') ? file.label : `${file.label.toLowerCase()}.txt`;
    out[`snippets/${name.replace(/[^\w.-]+/g, '-')}`] = file.code;
  }
  return out;
}

function buildSandboxProject(title: string, files: readonly SandboxFile[]): SandboxProject {
  const consumed = new Set<SandboxFile>();
  const reasons: string[] = [];

  const component = readComponentSource(files);
  reasons.push(...component.reasons);

  if (component.source) {
    const source = component.source;
    const owner = files.find(f => isTypeScriptLanguage(f.language) && f.code.includes('@Component'));
    if (owner) consumed.add(owner);
    for (const markup of files.filter(f => isTemplateLanguage(f.language))) consumed.add(markup);

    const siblings: Record<string, string> = {};
    for (const [name, code] of Object.entries(source.siblings)) siblings[`src/app/${name}`] = code;

    const needsIcons =
      source.code.includes('<wr-icon') || Object.values(source.siblings).some(c => c.includes('<wr-icon'));

    const usedStyleSubpaths = ngwrSubpathsIn(source.code, ...Object.values(source.siblings));

    return {
      files: {
        'package.json': packageJson(needsIcons),
        '.stackblitzrc': `${JSON.stringify({ installDependencies: true, startCommand: 'npm start' }, null, 2)}\n`,
        '.npmrc': npmrc(),
        'angular.json': angularJson(),
        'tsconfig.json': tsconfigJson(),
        'README.md': readme(title, 'the snippet already declared its own component'),
        'src/index.html': indexHtml(source.selector, title),
        'src/main.ts': mainTs(source.className, './app/demo', source.isDefaultExport, needsIcons),
        'src/styles.scss': stylesScss(usedStyleSubpaths),
        'src/app/demo.ts': source.code,
        ...siblings,
        ...(needsIcons ? { 'src/app/icons.ts': renderIconsFile() } : {}),
        ...spareFiles(files, consumed),
      },
      openFile: 'src/app/demo.ts',
      kind: 'component',
      reasons: [],
    };
  }

  const fragment = files.find(f => isTemplateLanguage(f.language) && f.code.trim().length > 0);
  if (fragment) {
    const scan = scanTemplate(fragment.code);
    if (scan.unresolved.length === 0 && scan.blockers.length === 0) {
      consumed.add(fragment);
      const usedStyleSubpaths = [...scan.imports.keys()];
      return {
        files: {
          'package.json': packageJson(scan.needsIcons),
          '.stackblitzrc': `${JSON.stringify({ installDependencies: true, startCommand: 'npm start' }, null, 2)}\n`,
          '.npmrc': npmrc(),
          'angular.json': angularJson(),
          'tsconfig.json': tsconfigJson(),
          'README.md': readme(title, 'the fragment was wrapped in a generated component'),
          'src/index.html': indexHtml(ROOT_SELECTOR, title),
          'src/main.ts': mainTs('App', './app/app', false, scan.needsIcons),
          'src/styles.scss': stylesScss(usedStyleSubpaths),
          'src/app/app.ts': appTs(scan, title),
          'src/app/app.html': fragment.code,
          ...(scan.needsIcons ? { 'src/app/icons.ts': renderIconsFile() } : {}),
          ...spareFiles(files, consumed),
        },
        openFile: 'src/app/app.html',
        kind: 'template',
        reasons: [],
      };
    }
    if (scan.unresolved.length > 0) {
      reasons.push(
        `The markup names ${scan.unresolved.join(', ')}, which resolves to nothing this sandbox can import.`
      );
    }
    reasons.push(...scan.blockers);
  } else if (reasons.length === 0) {
    reasons.push('The snippet has no Angular template and no component to bootstrap.');
  }

  // Tier 3 renders the snippet as text and draws no component, so it takes the
  // token layer only — `stylesScss` adds `ngwr/theme` whatever it is handed.
  const usedStyleSubpaths: readonly string[] = [];

  return {
    files: {
      'package.json': packageJson(false),
      '.stackblitzrc': `${JSON.stringify({ installDependencies: true, startCommand: 'npm start' }, null, 2)}\n`,
      '.npmrc': npmrc(),
      'angular.json': angularJson(),
      'tsconfig.json': tsconfigJson(),
      'README.md': readme(title, 'shown as source — see the comment in src/app/app.ts'),
      'src/index.html': indexHtml(ROOT_SELECTOR, title),
      'src/main.ts': mainTs('App', './app/app', false, false),
      'src/styles.scss': stylesScss(usedStyleSubpaths),
      'src/app/app.ts': sourceAppTs(files, reasons, title),
      'src/app/app.html': sourceAppHtml(),
    },
    openFile: 'src/app/app.ts',
    kind: 'source',
    reasons,
  };
}

export { buildSandboxProject };
