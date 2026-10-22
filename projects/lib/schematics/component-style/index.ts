/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Rule, type SchematicContext, SchematicsException, type Tree } from '@angular-devkit/schematics';

import {
  type Exports,
  NOT_SASS_ADVICE,
  addStyleUse,
  globalStylesheet,
  isSass,
  shippedExports,
  styleTarget,
} from '../utility/global-styles';

import type { Schema } from './schema';

/**
 * Add `@use 'ngwr/<name>';` to the project's first global stylesheet, after the
 * theme line and after every `@use` already there.
 *
 * Every component a project renders needs its line since v15, which removed the
 * `@use 'ngwr'` umbrella. The line used to be PREPENDED, which put it above the
 * theme: with `@use 'ngwr/theme' with (...)` that fails the build, because the
 * component sheet loads the theme first and Sass configures a module only at its
 * first load.
 *
 * The name is checked against the package's `exports` map, so a name with no
 * stylesheet is refused rather than written, and a bare name from before v15
 * (`bar-chart`, `aurora`) lands on its nested entry point. A CSS or Less
 * stylesheet gets the rename advice and no `@import` line. Idempotent: skips an
 * entry point the stylesheet already loads.
 *
 * `exports` is a parameter so a spec can pass a map; the devkit calls this with
 * the options alone, which reads the one shipped beside it.
 */
function componentStyle(options: Schema, exports: Exports | null = shippedExports()): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    const name = options.name.trim().replace(/^['"]+|['"]+$/g, '');
    if (!name) throw new SchematicsException('ngwr:component-style: missing `name`.');

    const target = styleTarget(name, exports);
    if (target.error !== undefined) throw new SchematicsException(`ngwr:component-style: ${target.error}`);

    const stylesPath = await globalStylesheet(tree, options.project);
    if (!stylesPath) {
      throw new SchematicsException(
        `ngwr:component-style: no global stylesheet wired in angular.json. Add \`@use 'ngwr/${target.subpath}';\` ` +
          "manually, after `@use 'ngwr/theme';`."
      );
    }

    if (!isSass(stylesPath)) {
      throw new SchematicsException(`ngwr:component-style: ${stylesPath} is not Sass. ${NOT_SASS_ADVICE}`);
    }

    if (target.movedFrom) {
      context.logger.info(`ngwr: ${target.movedFrom} is ngwr/${target.subpath} since v15.`);
    }

    const edit = addStyleUse(tree.readText(stylesPath), target.subpath, stylesPath.endsWith('.sass'));
    if (edit.misordered) {
      context.logger.warn(
        `ngwr: ${stylesPath} loads an ngwr entry point above \`@use 'ngwr/theme'\`. Move the theme line first: ` +
          'a component line above it makes `with (...)` on the theme fail to compile.'
      );
    }

    if (edit.added.length === 0) {
      context.logger.info(`ngwr: ${stylesPath} already imports ngwr/${target.subpath} — no changes.`);
      return tree;
    }

    tree.overwrite(stylesPath, edit.source);
    for (const line of edit.added) context.logger.info(`✓ Added \`${line}\` to ${stylesPath}.`);
    return tree;
  };
}

export default componentStyle;
