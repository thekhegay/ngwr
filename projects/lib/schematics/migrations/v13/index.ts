/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

/**
 * v12 to v13 migration. It REPORTS and rewrites nothing, and both halves of
 * that are deliberate.
 *
 * v13 has exactly one breaking change that reaches consumer code: `[id]` on
 * `<wr-checkbox>`, `<wr-radio>` and `<wr-switch>` no longer lands on the HOST
 * element. It only ever lived there by accident — a static `id="x"` was written
 * to the host as a plain attribute AS WELL as fed to the inner `<input>`, so two
 * elements carried the same id, `<label for>` resolved through
 * `getElementById` to the host (not a labelable element, so `input.labels` went
 * from 1 to 0) and `document.getElementById(id)` returned the wrong node. The
 * host binding is `[attr.id]: null` now and the id lands only where it was
 * documented to.
 *
 * **Why this reports instead of rewriting.** The change is not a rename. What a
 * consumer has to do depends on what they wrote and on what they meant by it: a
 * `wr-checkbox#agree { … }` rule may want to become `#agree` (the inner input,
 * which is what most of them were reaching for), or `wr-checkbox:has(#agree)`,
 * or a class — and only the author knows which. Rewriting the selector to
 * `#agree` moves the declarations onto an `<input>` whose box is the 16px tick,
 * not the row, so a codemod confident enough to edit it would silently restyle
 * the wrong element. Naming the files is the honest amount of help.
 *
 * **Why it exists at all**, when v10 and v11 ship nothing. Those two broke
 * painted COLOUR, and an empty codemod would have told people their visual
 * regressions were handled. This one has something true to say: a selector that
 * stops matching is silent in every language it can be written in — CSS has no
 * error for it, `querySelector` returns `null`, and a Playwright or Cypress
 * locator times out somewhere unrelated. It is exactly the shape that needs a
 * file list, and until now nothing produced one: `ng update ngwr@14` from a v12
 * app runs `migration-v14` and never mentions v13 at all, because the semver
 * range `>12.x <=14.0.0` has nothing in it between the two.
 *
 * **What is deliberately NOT reported.** A `<label for="x">` pointing at one of
 * these components got BETTER, not worse — it used to resolve to the
 * unlabelable host and now finds the real input — so there is nothing to tell
 * anyone. And `<wr-checkbox-group>` / `<wr-radio-group>` keep their host `id`;
 * they never had the double-write, and the `#` immediately after the tag name
 * in every pattern here is what keeps `wr-checkbox-group#filters` out of the
 * warning.
 *
 * The other thing v13 shipped — `readonly` and `invalid` reaching every control
 * — is additive, and needs no entry.
 */

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', '.cache', '.angular', 'coverage', '.next', '.nuxt']);

/**
 * An id selector anchored to one of the three tags, in a stylesheet, a
 * `querySelector` string or a test locator alike — the substring is the same in
 * all of them.
 *
 * The `#` is doing the anchoring work a negative lookahead does elsewhere in
 * these migrations: `wr-checkbox-group#filters` cannot match `wr-checkbox#`,
 * because the character after `wr-checkbox` is a hyphen. That is worth stating
 * rather than relying on, since the group DOES keep its host id and reporting
 * it would be a false alarm on working code.
 */
const HOST_ID_SELECTOR = /\bwr-(?:checkbox|radio|switch)#[\w-]+/g;

function ngUpdateV13(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const hits: { readonly file: string; readonly selectors: readonly string[] }[] = [];

    visit(tree, '/', filePath => {
      const lower = filePath.toLowerCase();
      if (!/\.(ts|html|scss|css)$/.test(lower)) return;

      const found = [...new Set(tree.readText(filePath).match(HOST_ID_SELECTOR) ?? [])];
      if (found.length > 0) hits.push({ file: filePath, selectors: found });
    });

    if (hits.length === 0) {
      context.logger.info('ngwr v13 migration: nothing to do — no host-id selector on a checkbox, radio or switch.');
      return tree;
    }

    context.logger.warn(
      `ngwr v13: a host-id selector found in ${hits.length} file(s). \`[id]\` on <wr-checkbox>, <wr-radio> and ` +
        '<wr-switch> no longer lands on the host element — it goes to the inner <input>, which is where the input ' +
        'was always documented to put it. Nothing throws: the selector simply stops matching, and CSS has no error ' +
        'for that. Point it at the inner input (`#agree`), at the host by another hook (`wr-checkbox:has(#agree)`, ' +
        'or a class), depending on which box you meant to style — the row or the 16px tick.'
    );
    for (const { file, selectors } of hits) context.logger.warn(`  ${file} — ${selectors.join(', ')}`);

    return tree;
  };
}

function visit(tree: Tree, path: string, visitor: (filePath: string) => void): void {
  const dir = tree.getDir(path);
  for (const file of dir.subfiles) visitor(`${path === '/' ? '' : path}/${file}`);
  for (const sub of dir.subdirs) {
    if (IGNORE_DIRS.has(sub)) continue;
    visit(tree, `${path === '/' ? '' : path}/${sub}`, visitor);
  }
}

export default ngUpdateV13;
