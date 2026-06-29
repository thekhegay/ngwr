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

/** Base peers, regardless of prompt answers. */
const BASE_PEERS: readonly (readonly [string, string])[] = [['@angular/cdk', '>=22.0.0']];

/** Extra peers contributed by the `dateAdapter` choice. */
const DATE_ADAPTER_PEERS: Record<NonNullable<Schema['dateAdapter']>, readonly (readonly [string, string])[]> = {
  none: [],
  native: [],
  'date-fns': [['date-fns', '>=3.0.0 || >=4.0.0']],
  luxon: [['luxon', '>=3.0.0']],
};

/** Adapter classes named in the next-steps snippet for each choice. */
const DATE_ADAPTER_PROVIDER: Record<NonNullable<Schema['dateAdapter']>, string | null> = {
  none: null,
  native: 'provideWrDateAdapter()',
  'date-fns': 'provideWrDateAdapter({ adapter: WrDateFnsAdapter })',
  luxon: 'provideWrDateAdapter({ adapter: WrLuxonAdapter })',
};

/** Default density → `provideWrDensity(...)` call. */
const DENSITY_PROVIDER: Record<NonNullable<Schema['density']>, string | null> = {
  none: null,
  sm: "provideWrDensity({ defaultDensity: 'sm' })",
  lg: "provideWrDensity({ defaultDensity: 'lg' })",
};

/** Theme preset → `provideWrTheme(...)` call. */
const THEME_PROVIDER: Record<NonNullable<Schema['theme']>, string | null> = {
  none: null,
  light: "provideWrTheme({ defaultMode: 'light' })",
  dark: "provideWrTheme({ defaultMode: 'dark' })",
  system: "provideWrTheme({ defaultMode: 'auto' })",
};

const STYLES_DIRECTIVE_SCSS = "@use 'ngwr';";
const STYLES_DIRECTIVE_CSS = "@import 'ngwr';";

function ngAdd(options: Schema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    return chain([installPeerDeps(options, context), registerStyles(options), printNextSteps(options, context)])(
      tree,
      context
    );
  };
}

/**
 * Adds peer deps for the user's choices and schedules a single install
 * task (unless `--skipPeerInstall` was passed).
 */
function installPeerDeps(options: Schema, context: SchematicContext): Rule {
  if (options.skipPeerInstall) return (tree: Tree) => tree;

  return (tree: Tree) => {
    const deps = [...BASE_PEERS, ...DATE_ADAPTER_PEERS[options.dateAdapter ?? 'none']];
    if (!deps.length) return tree;

    for (const [name, version] of deps) {
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
 * Appends `@use 'ngwr';` to the project's first global stylesheet when
 * `styles === 'all'`. Skipped entirely when `styles === 'none'` — the
 * user is expected to opt in per component via `ng g ngwr:component-style`.
 */
function registerStyles(options: Schema): Rule {
  if ((options.styles ?? 'all') === 'none') {
    return (tree: Tree) => tree;
  }

  return async (tree: Tree, context: SchematicContext) => {
    const workspace = await getWorkspace(tree);
    const projectName = options.project ?? (workspace.extensions.defaultProject as string | undefined);
    const project = (projectName && workspace.projects.get(projectName)) ?? workspace.projects.values().next().value;

    if (!project) {
      context.logger.warn('ngwr: no Angular project found — skipping styles wiring.');
      return tree;
    }

    const build = project.targets.get('build');
    const styles = (build?.options?.styles as readonly (string | { input: string })[] | undefined) ?? [];
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

    const isCss = stylesPath.endsWith('.css') || stylesPath.endsWith('.less');
    const directive = isCss ? STYLES_DIRECTIVE_CSS : STYLES_DIRECTIVE_SCSS;
    const existing = tree.readText(stylesPath);

    if (existing.includes(directive) || existing.includes("'ngwr'") || existing.includes('"ngwr"')) {
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
    const theme = options.theme ?? 'none';

    const imports: string[] = [
      "import { provideWrOverlay } from 'ngwr/overlay';",
      "import { provideWrIcons, plus, trash } from 'ngwr/icon';",
    ];
    const providers: string[] = ['provideWrOverlay()', 'provideWrIcons([plus, trash])'];

    const adapterCall = DATE_ADAPTER_PROVIDER[adapter];
    if (adapterCall) {
      imports.push("import { provideWrDateAdapter } from 'ngwr/date-adapter';");
      if (adapter === 'date-fns') {
        imports.push("import { WrDateFnsAdapter } from 'ngwr/date-adapter-fns';");
      } else if (adapter === 'luxon') {
        imports.push("import { WrLuxonAdapter } from 'ngwr/date-adapter-luxon';");
      }
      providers.push(adapterCall);
    }

    const densityCall = DENSITY_PROVIDER[density];
    if (densityCall) {
      imports.push("import { provideWrDensity } from 'ngwr/density';");
      providers.push(densityCall);
    }

    const themeCall = THEME_PROVIDER[theme];
    if (themeCall) {
      imports.push("import { provideWrTheme } from 'ngwr/theme';");
      providers.push(themeCall);
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

${snapshotSummary(options)}
Browse the full catalog at https://ngwr.dev.
`;

    context.logger.info(message);
    return tree;
  };
}

function snapshotSummary(options: Schema): string {
  const lines: string[] = ['Selected:'];
  lines.push(`  • styles      = ${options.styles ?? 'all'}`);
  lines.push(`  • dateAdapter = ${options.dateAdapter ?? 'none'}`);
  lines.push(`  • density     = ${options.density ?? 'none'}`);
  lines.push(`  • theme       = ${options.theme ?? 'none'}`);
  return `${lines.join('\n')}\n\n`;
}

export default ngAdd;
