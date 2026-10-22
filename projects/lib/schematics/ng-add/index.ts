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

import { NOT_SASS_ADVICE } from '../utility/global-styles';

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
  ['@angular/cdk', '^22.0.0'],
  ['lucide', '>=1.0.0'],
];

/** Default density → the `withDensity(...)` feature passed to `provideWr()`. */
const DENSITY_FEATURE: Record<NonNullable<Schema['density']>, string | null> = {
  none: null,
  sm: "withDensity({ defaultDensity: 'sm' })",
  lg: "withDensity({ defaultDensity: 'lg' })",
};

const STYLES_DIRECTIVE_SCSS = "@use 'ngwr/theme';";

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
 * Puts `@use 'ngwr/theme';` at the top of the project's first global stylesheet
 * when `styles === 'theme'`. Skipped entirely when `styles === 'none'`.
 *
 * The theme layer and NOT the components, because v15 removed the `@use 'ngwr'`
 * umbrella: a sheet that compiled every component stylesheet for a page
 * rendering two of them was measured here at 287 kB against 44 kB. What a
 * project does want globally is the token layer — `:root` with both schemes in
 * it, the box-sizing reset — which every component sheet loads anyway, so
 * writing it first costs nothing and buys the one thing order matters for: this
 * is the line that can carry `with ($base-colors: ...)`, and only the first
 * load of a module can be configured. Components go in per component, after it,
 * through `ng g ngwr:component-style <name>` — the next-steps message says so.
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

    // `ng new` takes CSS unless asked otherwise, so this is the default path.
    // A CSS file CAN `@import 'ngwr/<name>'` — Angular's bundler resolves the
    // `sass` condition — but each import is a compilation of its own, with the
    // theme copied into it and no way to configure it. Writing nothing and saying
    // why is the choice the branches above make when there is no stylesheet to
    // edit. `.sass` is the indented syntax and takes `@use` like `.scss`.
    if (stylesPath.endsWith('.css') || stylesPath.endsWith('.less')) {
      context.logger.warn(`ngwr: ${stylesPath} is not Sass. ${NOT_SASS_ADVICE}`);
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
 * by the prompt answers. We deliberately don't AST-edit the app config; a
 * clear copy-pasteable snippet is more robust across project shapes
 * (standalone bootstrap, NgModule bootstrap, server entry, etc.).
 *
 * The snippet is the `appConfig` that `ng new` writes, in
 * `src/app/app.config.ts`, which is where `ng g ngwr:provider` splices too.
 * It also says what the install did not do: each component needs its own
 * `@use` after the theme, and one without it renders unstyled with no error.
 */
function printNextSteps(options: Schema, context: SchematicContext): Rule {
  return (tree: Tree) => {
    const density = options.density ?? 'none';

    const imports: string[] = [];
    const providers: string[] = [];

    // App-wide options are features of ONE `provideWr()` call from the root
    // entry point, each imported from the entry point it configures — so the
    // call is printed only when a prompt answer gave it a feature to carry.
    const densityFeature = DENSITY_FEATURE[density];
    if (densityFeature) {
      imports.push("import { provideWr } from 'ngwr';", "import { withDensity } from 'ngwr/density';");
      providers.push(`provideWr(${densityFeature})`);
    }

    // `ngwr/icon` ships no icons — there are no bare icon exports, so the old
    // `{ plus, trash }` import did not compile. Glyphs come from the app's own
    // icon package, through `lucideIcons()` for lucide or `svgIcon()` for a set
    // that ships SVG.
    imports.push("import { provideWrIcons, lucideIcons } from 'ngwr/icon';", "import { Plus, Trash2 } from 'lucide';");
    providers.push('provideWrIcons(lucideIcons({ plus: Plus, trash: Trash2 }))');

    const importBlock = imports.join('\n');
    const providerBlock = providers.map(p => `      ${p},`).join('\n');

    const message = `
ngwr installed.

Add the providers to your app config (src/app/app.config.ts in an \`ng new\` app):

${importBlock}

  export const appConfig: ApplicationConfig = {
    providers: [
${providerBlock}
    ],
  };

Every component you render needs its own stylesheet line, after the theme.
Without it the component renders unstyled, and nothing says so:

  @use 'ngwr/theme';
  @use 'ngwr/button';
  @use 'ngwr/charts/bar-chart';

\`ng g ngwr:component-style <entry point>\` adds one in the right place.

Light and dark follow the operating system with no provider. To let the user
choose, inject WrTheme from 'ngwr/theme' and call set('light' | 'dark' | 'auto'),
and pass withTheme() from 'ngwr/theme' to provideWr() from 'ngwr' so a stored
choice lands at boot.

${snapshotSummary(options)}
Browse the full catalog at https://ngwr.dev.
`;

    context.logger.info(message);
    return tree;
  };
}

function snapshotSummary(options: Schema): string {
  const lines: string[] = ['Selected:'];
  lines.push(`  • styles  = ${options.styles ?? 'theme'}`);
  lines.push(`  • density = ${options.density ?? 'none'}`);
  return `${lines.join('\n')}\n\n`;
}

export default ngAdd;
