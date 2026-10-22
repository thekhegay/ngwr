/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Rule, type SchematicContext, SchematicsException, type Tree } from '@angular-devkit/schematics';
import { getWorkspace } from '@schematics/angular/utility/workspace';

import { addStyleUse, globalStylesheet, isSass } from '../utility/global-styles';

import type { PagePreset, Schema } from './schema';
import { render } from './templates';

/**
 * The style entry points each preset renders, in the order its template uses
 * them. Since v15 a page without them renders unstyled, so the schematic adds
 * them to the global stylesheet, after the theme, the way
 * `ng g ngwr:component-style` does.
 */
const PRESET_STYLES: Readonly<Record<PagePreset, readonly string[]>> = {
  form: ['form', 'input', 'button'],
  table: ['table', 'pagination'],
  dashboard: ['card', 'statistic'],
};

function page(options: Schema): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    const preset = options.preset;
    if (!preset) throw new SchematicsException('ngwr:page: missing `preset` (form / table / dashboard).');

    const workspace = await getWorkspace(tree);
    // Narrowed rather than read off the index signature: the spec beside this
    // file puts it in the root program, which sets `noPropertyAccessFromIndexSignature`.
    const extensions = workspace.extensions as { readonly defaultProject?: string };
    const projectName = options.project ?? extensions.defaultProject;
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
    await addPresetStyles(tree, context, options.project, PRESET_STYLES[preset]);
    context.logger.info(
      `\nAdd it to your routes:\n  { path: '${dashName}', loadComponent: () => import('./pages/${dashName}/${dashName}') }`
    );
    return tree;
  };
}

/** Adds the preset's `@use` lines to a Sass global stylesheet, or prints them for any other. */
async function addPresetStyles(
  tree: Tree,
  context: SchematicContext,
  project: string | undefined,
  entries: readonly string[]
): Promise<void> {
  const stylesPath = await globalStylesheet(tree, project);

  if (!stylesPath || !isSass(stylesPath)) {
    const lines = ["@use 'ngwr/theme';", ...entries.map(entry => `@use 'ngwr/${entry}';`)];
    context.logger.warn(
      `\nThe page renders unstyled until your global Sass stylesheet loads its components, after the theme:\n` +
        `${lines.map(line => `  ${line}`).join('\n')}`
    );
    return;
  }

  let source = tree.readText(stylesPath);
  const added: string[] = [];
  for (const entry of entries) {
    const edit = addStyleUse(source, entry, stylesPath.endsWith('.sass'));
    source = edit.source;
    added.push(...edit.added);
  }

  if (added.length === 0) return;

  tree.overwrite(stylesPath, source);
  context.logger.info(`✓ Added to ${stylesPath}: ${added.join(' ')}`);
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
