/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

/**
 * v13 to v14 migration.
 *
 * Router integration became opt-in for two components, and this migration
 * REPORTS rather than rewrites. That is the point of it: both halves need a
 * decision a codemod cannot make correctly, and v10/v11 already establish the
 * rule here — a migration that pretends to have handled something it has not is
 * worse than none, because the silence reads as "nothing to do".
 *
 * **`wr-loading-bar`** no longer subscribes to the router on its own. Add
 * `provideWrLoadingBarRouter()` from `ngwr/loading-bar/router` to your
 * application providers. Without it the bar still works for manual
 * `start()` / `complete()` and simply never moves for navigation — which is the
 * dangerous shape, because nothing throws: this project's own site shipped a
 * permanently-empty bar for the length of a release by missing exactly this.
 * Not auto-fixed because the provider belongs in a bootstrap file this schematic
 * cannot identify: `app.config.ts`, a `main.ts` calling `bootstrapApplication`,
 * or a route-level `providers` array are all legitimate, and guessing wrong puts
 * the subscription in the wrong injector.
 *
 * **`<wr-tab routerLink>`** needs `wrTabsRouting` on the strip and
 * `WrTabsRouting` in the component's `imports`. This one at least fails loudly —
 * the strip throws when a tab carries a `routerLink` and no adapter is present.
 * Not auto-fixed because adding the attribute is only half of it: the class has
 * to reach an `imports` array in a `.ts` file that this rule would have to match
 * to the template by convention, and a template can be inline, external, or
 * shared between components.
 *
 * Why the split happened at all: the subscription and the link directives are
 * what pull `@angular/router` into the bundle. Measured on 13.0.0, in an app
 * declaring no routes, `ngwr/loading-bar` cost 100.1 kB of which 67.9 kB was the
 * router, against 2.4 kB of its own code; `ngwr/tabs` carried 75.6 kB of router.
 * Both are now zero for an app that does not opt in.
 */

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', '.cache', '.angular', 'coverage', '.next', '.nuxt']);

/** `<wr-tab …>` carrying a `routerLink`, however the tag is wrapped across lines. */
const ROUTER_TAB = /<wr-tab\b[^>]*\brouterLink\b/;
const LOADING_BAR = /<wr-loading-bar\b/;

function ngUpdateV14(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const routerTabs: string[] = [];
    const loadingBars: string[] = [];

    visit(tree, '/', filePath => {
      const lower = filePath.toLowerCase();
      // Inline templates live in `.ts`, external ones in `.html`.
      if (!lower.endsWith('.ts') && !lower.endsWith('.html')) return;

      const content = tree.readText(filePath);
      if (ROUTER_TAB.test(content)) routerTabs.push(filePath);
      if (LOADING_BAR.test(content)) loadingBars.push(filePath);
    });

    if (loadingBars.length > 0) {
      context.logger.warn(
        `ngwr v14: <wr-loading-bar> found in ${loadingBars.length} file(s). Router navigations no ` +
          'longer drive it by default — add `provideWrLoadingBarRouter()` from `ngwr/loading-bar/router` ' +
          'to your application providers. Nothing throws without it; the bar simply stays at 0%.'
      );
      for (const file of loadingBars) context.logger.warn(`  ${file}`);
    }

    if (routerTabs.length > 0) {
      context.logger.warn(
        `ngwr v14: <wr-tab routerLink> found in ${routerTabs.length} file(s). Add \`wrTabsRouting\` to the ` +
          "`<wr-tabs>` element and `WrTabsRouting` (from `ngwr/tabs/router`) to the component's imports. " +
          'The strip throws at runtime until you do, so this one cannot ship unnoticed.'
      );
      for (const file of routerTabs) context.logger.warn(`  ${file}`);
    }

    if (loadingBars.length === 0 && routerTabs.length === 0) {
      context.logger.info('ngwr v14 migration: nothing to do — no <wr-loading-bar> and no router tabs found.');
    }

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

export default ngUpdateV14;
