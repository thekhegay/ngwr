/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { chain, type Rule, type SchematicContext, type Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { addPackageJsonDependency, NodeDependencyType } from '@schematics/angular/utility/dependencies';
import { getWorkspace } from '@schematics/angular/utility/workspace';

import type { Schema } from './schema';

/**
 * Base peers, regardless of prompt answers.
 *
 * `lucide` is here because the bootstrap snippet this schematic prints registers
 * icons through `lucideIcons()`, which converts glyphs the app imports from
 * `lucide` itself — leaving it out made the very first snippet a consumer pastes
 * fail to resolve.
 *
 * `@angular/forms` is a REQUIRED peer in `projects/lib/package.json` and is
 * deliberately NOT here: every `ng new` app already depends on it, so installing
 * it would be a no-op write to the consumer's manifest. The manifest declares it
 * because a consumer can remove it; this list is about what `ng add` has to add.
 */
const BASE_PEERS: readonly (readonly [string, string])[] = [
  ['@angular/cdk', '>=22.0.0'],
  ['lucide', '>=1.0.0'],
];

/**
 * The provider call named in the next-steps snippet for each `dateAdapter` choice.
 *
 * Native is the only adapter ngwr ships, so no choice adds a peer. An app on
 * another date library subclasses `WrDateAdapter` and passes it as
 * `provideWrDateAdapter({ adapter })`.
 */
const DATE_ADAPTER_PROVIDER: Record<NonNullable<Schema['dateAdapter']>, string | null> = {
  none: null,
  native: 'provideWrDateAdapter()',
};

/** Default density → `provideWrDensity(...)` call. */
const DENSITY_PROVIDER: Record<NonNullable<Schema['density']>, string | null> = {
  none: null,
  sm: "provideWrDensity({ defaultDensity: 'sm' })",
  lg: "provideWrDensity({ defaultDensity: 'lg' })",
};

const STYLES_DIRECTIVE_SCSS = "@use 'ngwr/theme';";

/**
 * What a project whose global stylesheet is plain CSS is told, instead of a
 * line that cannot work.
 *
 * ngwr ships Sass SOURCES and no compiled CSS: every `exports` entry in
 * `projects/lib/package.json` carries a `sass` condition and nothing else that
 * a stylesheet can reach. So `@import 'ngwr'` from a `.css` file resolves
 * through `default` to `fesm2022/ngwr.mjs` and esbuild — the bundler Angular 22
 * uses — stops the build with `Cannot import ".../ngwr.mjs" into a CSS file`.
 *
 * That mattered more than it sounds: `ng new` takes CSS unless you ask for
 * something else, so the default path was `ng add ngwr` followed by a build
 * that failed, naming a `.mjs` nobody had typed. Writing nothing and saying why
 * is the same choice the three branches below already make when they cannot
 * find a stylesheet to edit.
 */
const CSS_PROJECT_ADVICE =
  'ngwr ships Sass sources and no compiled CSS, so it cannot be reached from a plain CSS file. ' +
  'Rename the global stylesheet to .scss (and update its path in angular.json), then add ' +
  `\`${STYLES_DIRECTIVE_SCSS}\` to it — or keep CSS and pull in only what you use with ` +
  '`ng g ngwr:component-style <name>`.';

function ngAdd(options: Schema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    return chain([installPeerDeps(options, context), registerStyles(options), printNextSteps(options, context)])(
      tree,
      context
    );
  };
}

/**
 * Adds the base peers and schedules a single install task (unless
 * `--skipPeerInstall` was passed). No prompt answer adds one of its own.
 */
function installPeerDeps(options: Schema, context: SchematicContext): Rule {
  if (options.skipPeerInstall) return (tree: Tree) => tree;

  return (tree: Tree) => {
    for (const [name, version] of BASE_PEERS) {
      addPackageJsonDependency(tree, {
        type: NodeDependencyType.Default,
        name,
        version,
        overwrite: false,
      });
    }
    context.addTask(new NodePackageInstallTask());
    return tree;
  };
}

/**
 * Appends `@use 'ngwr/theme';` to the project's first global stylesheet when
 * `styles === 'theme'`. Skipped entirely when `styles === 'none'`.
 *
 * The theme layer and NOT the components, because v15 removed the `@use 'ngwr'`
 * umbrella: a sheet that compiled all 228 component stylesheets for a page
 * rendering two of them was measured here at 287 kB against 44 kB. What a
 * project does want globally is the token layer — `:root` with both schemes in
 * it, the box-sizing reset — which every component sheet loads anyway, so
 * writing it first costs nothing and buys the one thing order matters for: this
 * is the line that can carry `with ($base-colors: ...)`, and only the first
 * load of a module can be configured. Components go in per component, through
 * `ng g ngwr:component-style <name>`.
 */
function registerStyles(options: Schema): Rule {
  if ((options.styles ?? 'theme') === 'none') {
    return (tree: Tree) => tree;
  }

  return async (tree: Tree, context: SchematicContext) => {
    const workspace = await getWorkspace(tree);
    // Narrowed rather than read off the index signature directly: dotted access
    // is what eslint asks for and what the lib's `noPropertyAccessFromIndexSignature`
    // refuses, and this file has a spec now, so it is in that program.
    const extensions = workspace.extensions as { readonly defaultProject?: string };
    const projectName = options.project ?? extensions.defaultProject;
    const project = (projectName && workspace.projects.get(projectName)) ?? workspace.projects.values().next().value;

    if (!project) {
      context.logger.warn('ngwr: no Angular project found — skipping styles wiring.');
      return tree;
    }

    const build = project.targets.get('build');
    const buildOptions = (build?.options ?? {}) as { readonly styles?: readonly (string | { input: string })[] };
    const styles = buildOptions.styles ?? [];
    const stylesPath = typeof styles[0] === 'string' ? styles[0] : styles[0]?.input;

    if (!stylesPath) {
      context.logger.warn(
        `ngwr: no global stylesheet found for project "${project.root || '<root>'}" — add \`${STYLES_DIRECTIVE_SCSS}\` manually.`
      );
      return tree;
    }

    if (!tree.exists(stylesPath)) {
      context.logger.warn(`ngwr: styles file ${stylesPath} not found — add \`${STYLES_DIRECTIVE_SCSS}\` manually.`);
      return tree;
    }

    // `.sass` is the indented syntax and takes `@use` like `.scss`; `.less` is
    // the other one that cannot reach a Sass source.
    if (stylesPath.endsWith('.css') || stylesPath.endsWith('.less')) {
      context.logger.warn(`ngwr: ${stylesPath} is not Sass. ${CSS_PROJECT_ADVICE}`);
      return tree;
    }

    const directive = STYLES_DIRECTIVE_SCSS;
    const existing = tree.readText(stylesPath);

    // Matched on the subpath rather than on the whole line, so a stylesheet
    // that already configures the layer — `@use 'ngwr/theme' with (...)` — is
    // left alone instead of getting a second, unconfigured load above it,
    // which Sass refuses outright.
    if (existing.includes("'ngwr/theme'") || existing.includes('"ngwr/theme"')) {
      context.logger.info(`ngwr: ${stylesPath} already imports ngwr — skipping.`);
      return tree;
    }

    const next = existing.length && !existing.endsWith('\n') ? `${existing}\n` : existing;
    tree.overwrite(stylesPath, `${directive}\n${next}`);
    context.logger.info(`ngwr: added \`${directive}\` to ${stylesPath}.`);
    return tree;
  };
}

/**
 * Renders a tailored next-steps message — imports + provider list shaped
 * by the prompt answers. We deliberately don't AST-edit `main.ts`; a
 * clear copy-pasteable snippet is more robust across project shapes
 * (standalone bootstrap, NgModule bootstrap, server entry, etc.).
 */
function printNextSteps(options: Schema, context: SchematicContext): Rule {
  return (tree: Tree) => {
    const adapter = options.dateAdapter ?? 'none';
    const density = options.density ?? 'none';

    // `ngwr/icon` ships no icons — there are no bare icon exports, so the old
    // `{ plus, trash }` import did not compile. Glyphs come from the app's own
    // icon package, through `lucideIcons()` for lucide or `svgIcon()` for a set
    // that ships SVG.
    const imports: string[] = [
      "import { provideWrIcons, lucideIcons } from 'ngwr/icon';",
      "import { Plus, Trash2 } from 'lucide';",
    ];
    const providers: string[] = ['provideWrIcons(lucideIcons({ plus: Plus, trash: Trash2 }))'];

    const adapterCall = DATE_ADAPTER_PROVIDER[adapter];
    if (adapterCall) {
      imports.push("import { provideWrDateAdapter } from 'ngwr/date';");
      providers.push(adapterCall);
    }

    const densityCall = DENSITY_PROVIDER[density];
    if (densityCall) {
      imports.push("import { provideWrDensity } from 'ngwr/density';");
      providers.push(densityCall);
    }

    const importBlock = imports.join('\n');
    const providerBlock = providers.map(p => `      ${p},`).join('\n');

    const message = `
ngwr installed.

Add the providers to your bootstrap (typically src/main.ts):

${importBlock}

  bootstrapApplication(AppComponent, {
    providers: [
${providerBlock}
    ],
  });

Light and dark follow the operating system with no provider. To let the user
choose, inject WrTheme from 'ngwr/theme' and call set('light' | 'dark' | 'auto').

${snapshotSummary(options)}
Browse the full catalog at https://ngwr.dev.
`;

    context.logger.info(message);
    return tree;
  };
}

function snapshotSummary(options: Schema): string {
  const lines: string[] = ['Selected:'];
  lines.push(`  • styles      = ${options.styles ?? 'theme'}`);
  lines.push(`  • dateAdapter = ${options.dateAdapter ?? 'none'}`);
  lines.push(`  • density     = ${options.density ?? 'none'}`);
  return `${lines.join('\n')}\n\n`;
}

export default ngAdd;
