/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Rule, type SchematicContext, SchematicsException, type Tree } from '@angular-devkit/schematics';
import { getWorkspace } from '@schematics/angular/utility/workspace';

import type { Schema } from './schema';
import { render } from './templates';

function page(options: Schema): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    const preset = options.preset;
    if (!preset) throw new SchematicsException('ngwr:page: missing `preset` (form / table / dashboard).');

    const workspace = await getWorkspace(tree);
    const projectName = options.project ?? (workspace.extensions.defaultProject as string | undefined);
    const project = (projectName && workspace.projects.get(projectName)) ?? workspace.projects.values().next().value;
    if (!project) throw new SchematicsException('ngwr:page: no Angular project found.');

    const sourceRoot = project.sourceRoot ?? `${project.root || ''}/src`.replace(/^\//, '');
    const parentDir = options.path ?? `${sourceRoot}/app/pages`;
    const dashName = dasherize(options.name ?? preset);
    const pascalName = `${pascalize(dashName)}Page`;

    const dir = `${parentDir}/${dashName}`;
    const tsPath = `${dir}/${dashName}.ts`;
    const htmlPath = `${dir}/${dashName}.html`;
    const scssPath = `${dir}/${dashName}.scss`;

    for (const path of [tsPath, htmlPath, scssPath]) {
      if (tree.exists(path)) {
        throw new SchematicsException(
          `ngwr:page: ${path} already exists. Pick a different --name or remove the existing file.`
        );
      }
    }

    const out = render(preset, dashName, pascalName);
    tree.create(tsPath, out.ts);
    tree.create(htmlPath, out.html);
    if (out.scss) tree.create(scssPath, out.scss);

    context.logger.info(`✓ Created ${preset} page under ${dir}/`);
    context.logger.info(`  • ${tsPath}`);
    context.logger.info(`  • ${htmlPath}`);
    if (out.scss) context.logger.info(`  • ${scssPath}`);
    context.logger.info(
      `\nAdd it to your routes:\n  { path: '${dashName}', loadComponent: () => import('./pages/${dashName}/${dashName}') }`
    );
    return tree;
  };
}

function dasherize(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function pascalize(dashName: string): string {
  return dashName
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export default page;
