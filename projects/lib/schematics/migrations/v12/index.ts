/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

/**
 * v11 → v12 migration.
 *
 * Auto-fixed: the three date entry points move under one namespace, so the
 * catalog has ONE nesting style instead of two.
 *
 *   ngwr/date-adapter        → ngwr/date
 *   ngwr/date-adapter-fns    → ngwr/date/adapters/fns
 *   ngwr/date-adapter-luxon  → ngwr/date/adapters/luxon
 *
 * `ngwr/icon` already nested its implementations (`ngwr/icon/adapters/lucide`,
 * `…/feather`) while the date ones were flat and hyphenated, so the same idea
 * was spelled two ways depending on which feature you had reached for.
 *
 * Nothing but the import specifier changes: every exported symbol keeps its
 * name, and the `sass` condition is untouched because these entry points ship
 * no styles. That is what makes it a safe rewrite — a path is exactly the thing
 * a codemod can move without reading the code around it.
 *
 * The suffixed paths are listed first, but the ANCHOR is what makes this
 * correct, not the order: verified both ways, and reversing the list still
 * produces `ngwr/date/adapters/fns`, because `(?![-\\w])` stops the bare pattern
 * matching the front of a longer path. Keeping the longest-first order anyway
 * costs nothing and means a future edit that drops the anchor fails loudly on
 * the neighbour instead of quietly on the suffix.
 */

interface Transform {
  readonly pattern: RegExp;
  readonly replacement: string;
}

/**
 * Anchored with `(?![-\w])` rather than `\b`.
 *
 * A word boundary matches between `r` and `-`, so a `\b`-anchored
 * `ngwr/date-adapter` also matches the first half of `ngwr/date-adapter-fns`.
 * Ordering alone would hide that here, but the anchor is what makes each
 * pattern correct on its own — and it is the same trap the v9 migration
 * documents for `<wr-checkbox` against `<wr-checkbox-group`.
 */
const TRANSFORMS: readonly Transform[] = [
  { pattern: /ngwr\/date-adapter-fns(?![-\w])/g, replacement: 'ngwr/date/adapters/fns' },
  { pattern: /ngwr\/date-adapter-luxon(?![-\w])/g, replacement: 'ngwr/date/adapters/luxon' },
  { pattern: /ngwr\/date-adapter(?![-\w])/g, replacement: 'ngwr/date' },
];

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', '.cache', '.angular', 'coverage', '.next', '.nuxt']);

function ngUpdateV12(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    let touched = 0;

    visit(tree, '/', filePath => {
      const lower = filePath.toLowerCase();
      // `.ts` for imports, `.html` for a rare inline `@import`-style reference,
      // `.json` because an import map or a jest moduleNameMapper can name them.
      if (!lower.endsWith('.ts') && !lower.endsWith('.html') && !lower.endsWith('.json')) return;

      const original = tree.readText(filePath);
      const next = apply(original, TRANSFORMS);

      if (next !== original) {
        tree.overwrite(filePath, next);
        touched += 1;
      }
    });

    context.logger.info(
      `ngwr v12 migration: rewrote ${touched} file(s) (ngwr/date-adapter* → ngwr/date/adapters/*).\n` +
        'Every symbol keeps its name — only the import path moved, so the catalog nests ' +
        'implementations under their feature the way ngwr/icon/adapters/* already did.'
    );
    context.logger.info('Verify the result with `git diff`.');
    return tree;
  };
}

function apply(content: string, transforms: readonly Transform[]): string {
  let next = content;
  for (const { pattern, replacement } of transforms) {
    next = next.replace(pattern, replacement);
  }
  return next;
}

function visit(tree: Tree, dir: string, visitor: (filePath: string) => void): void {
  const entry = tree.getDir(dir);
  for (const file of entry.subfiles) {
    visitor(`${dir === '/' ? '' : dir}/${file}`);
  }
  for (const sub of entry.subdirs) {
    if (IGNORE_DIRS.has(sub)) continue;
    visit(tree, `${dir === '/' ? '' : dir}/${sub}`, visitor);
  }
}

export default ngUpdateV12;
