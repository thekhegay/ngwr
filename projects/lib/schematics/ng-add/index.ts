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

/** Peer ranges kept loose so this schematic doesn't pin minor versions. */
const PEER_DEPS: readonly (readonly [string, string])[] = [['@angular/cdk', '>=22.0.0']];

/** `@use 'ngwr';` import line appended to the user's global styles. */
const STYLES_DIRECTIVE_SCSS = "@use 'ngwr';";
const STYLES_DIRECTIVE_CSS = "@import 'ngwr';";

/** Snippet printed to the terminal once the schematic finishes. */
const NEXT_STEPS = `
ngwr installed.

Add the providers to your bootstrap (typically src/main.ts):

  import { provideWrOverlay } from 'ngwr/overlay';
  import { plus, trash, provideWrIcons } from 'ngwr/icon';

  bootstrapApplication(AppComponent, {
    providers: [
      provideWrOverlay(),
      provideWrIcons([plus, trash]),   // tree-shaken icon set
    ],
  });

Optional — date components need an adapter:

  import { provideWrDateAdapter } from 'ngwr/date-adapter';
  // ...providers: [provideWrDateAdapter()]

Browse the full catalog at https://ngwr.dev.
`;

function ngAdd(options: Schema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    return chain([installPeerDeps(options, context), registerStyles(options), printNextSteps(context)])(tree, context);
  };
}

/**
 * Adds `@angular/cdk` as a peer dep on the consumer's package.json and
 * schedules an install (unless `--skipPeerInstall` was passed).
 */
function installPeerDeps(options: Schema, context: SchematicContext): Rule {
  if (options.skipPeerInstall) return (tree: Tree) => tree;

  return (tree: Tree) => {
    let added = false;
    for (const [name, version] of PEER_DEPS) {
      addPackageJsonDependency(tree, {
        type: NodeDependencyType.Default,
        name,
        version,
        overwrite: false,
      });
      added = true;
    }
    if (added) context.addTask(new NodePackageInstallTask());
    return tree;
  };
}

/**
 * Appends `@use 'ngwr';` to the project's first global stylesheet.
 *
 * - Looks the file up via `angular.json` → `architect.build.options.styles[0]`.
 * - SCSS / Sass files get `@use 'ngwr';`. CSS / Less files get `@import 'ngwr';`.
 * - No-op when the directive is already present (idempotent).
 * - No-op when `--skipStyles` is passed, or when no styles file is wired.
 */
function registerStyles(options: Schema): Rule {
  if (options.skipStyles) return (tree: Tree) => tree;

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

function printNextSteps(context: SchematicContext): Rule {
  return (tree: Tree) => {
    context.logger.info(NEXT_STEPS);
    return tree;
  };
}

export default ngAdd;
