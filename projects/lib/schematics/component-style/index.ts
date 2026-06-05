/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Rule, type SchematicContext, SchematicsException, type Tree } from '@angular-devkit/schematics';
import { getWorkspace } from '@schematics/angular/utility/workspace';

import type { Schema } from './schema';

/**
 * Append `@use 'ngwr/<name>';` (SCSS) or `@import 'ngwr/<name>';` (CSS)
 * to the project's first global stylesheet. Pairs with the
 * `styles: 'none'` choice on `ng add` — you opt into ngwr styles per
 * component instead of pulling the whole bundle.
 *
 * Idempotent: skips when the directive is already present.
 */
function componentStyle(options: Schema): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    const name = options.name.trim().replace(/^['"]+|['"]+$/g, '');
    if (!name) throw new SchematicsException('ngwr:component-style: missing `name`.');

    const workspace = await getWorkspace(tree);
    const projectName = options.project ?? (workspace.extensions.defaultProject as string | undefined);
    const project = (projectName && workspace.projects.get(projectName)) ?? workspace.projects.values().next().value;

    if (!project) throw new SchematicsException('ngwr:component-style: no Angular project found.');

    const build = project.targets.get('build');
    const styles = (build?.options?.styles as readonly (string | { input: string })[] | undefined) ?? [];
    const stylesPath = typeof styles[0] === 'string' ? styles[0] : styles[0]?.input;
    if (!stylesPath || !tree.exists(stylesPath)) {
      throw new SchematicsException(
        `ngwr:component-style: no global stylesheet wired in angular.json. Add \`@use 'ngwr/${name}';\` manually.`
      );
    }

    const isCss = stylesPath.endsWith('.css') || stylesPath.endsWith('.less');
    const subpath = `ngwr/${name}`;
    const directive = isCss ? `@import '${subpath}';` : `@use '${subpath}';`;
    const existing = tree.readText(stylesPath);

    if (existing.includes(directive) || new RegExp(`['"]${subpath}['"]`).test(existing)) {
      context.logger.info(`ngwr: ${stylesPath} already imports ${subpath} — no changes.`);
      return tree;
    }

    const next = existing.length && !existing.endsWith('\n') ? `${existing}\n` : existing;
    tree.overwrite(stylesPath, `${directive}\n${next}`);
    context.logger.info(`✓ Added \`${directive}\` to ${stylesPath}.`);
    return tree;
  };
}

export default componentStyle;
