/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

/**
 * v8 → v9 migration.
 *
 * Auto-fixed (safe, element-scoped regexes):
 *   `<wr-checkbox value="…">` → `checkboxValue="…"` (also `[value]` / `[(value)]`).
 *
 * The standalone checkbox is now a signal-forms native `FormCheckboxControl`,
 * whose contract reserves `value` for the form value — so the group-membership
 * identity moved to `checkboxValue`. This rename matters especially because the
 * STATIC form fails silently: `<wr-checkbox value="x">` raises no template
 * error, it just lands on the host as a plain DOM attribute, leaving every child
 * in a group with the default identity (`null`) — so they'd all toggle together.
 *
 * Regex-based + dependency-free, matching the v7 / v8 migrations. The pattern is
 * anchored to the `<wr-checkbox` element and tolerates attributes and newlines
 * before the match, so `value` on any other element is untouched. Verify with
 * `git diff` afterwards.
 */

interface Transform {
  readonly pattern: RegExp;
  readonly replacement: string;
}

/**
 * Match `value` / `[value]` / `[(value)]` inside a `<wr-checkbox …>` open tag.
 * `[^>]*?` stays inside the tag (it can't cross `>`), so the rename never
 * escapes the element it's scoped to.
 */
const HTML_TRANSFORMS: readonly Transform[] = [
  // <wr-checkbox … value="x">  →  checkboxValue="x"
  { pattern: /(<wr-checkbox\b[^>]*?\s)value=/g, replacement: '$1checkboxValue=' },
  // <wr-checkbox … [value]="x">  →  [checkboxValue]="x"
  { pattern: /(<wr-checkbox\b[^>]*?\s)\[value\]=/g, replacement: '$1[checkboxValue]=' },
  // <wr-checkbox … [(value)]="x">  →  [(checkboxValue)]="x"
  { pattern: /(<wr-checkbox\b[^>]*?\s)\[\(value\)\]=/g, replacement: '$1[(checkboxValue)]=' },
];

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', '.cache', '.angular', 'coverage', '.next', '.nuxt']);

function ngUpdateV9(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    let html = 0;

    visit(tree, '/', filePath => {
      const lower = filePath.toLowerCase();
      // Inline templates live in .ts files too, so run the same element-scoped
      // transforms there.
      if (!lower.endsWith('.html') && !lower.endsWith('.ts')) return;

      const original = tree.readText(filePath);
      const next = apply(original, HTML_TRANSFORMS);

      if (next !== original) {
        tree.overwrite(filePath, next);
        html += 1;
      }
    });

    context.logger.info(
      `ngwr v9 migration: rewrote ${html} file(s) (<wr-checkbox> value → checkboxValue).\n` +
        'The standalone checkbox is now a signal-forms FormCheckboxControl: its form value is the ' +
        'boolean `checked` model ([(checked)] / [formField] / [(ngModel)]), and the group-membership ' +
        'identity is `checkboxValue`.'
    );
    context.logger.info('Verify the result with `git diff` — a few edge cases may need manual touch-up.');
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

export default ngUpdateV9;
