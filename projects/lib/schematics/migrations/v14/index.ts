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
 * **The locale sources were collapsed into one precedence**, and two defaults
 * moved with it. `WR_DATE_LOCALE` used to default to `navigator.language`; it
 * now defaults to Angular's `LOCALE_ID`, so `provideWrDateAdapter()` with no
 * `locale` follows the application rather than the browser. `WrI18n`'s own
 * default locale used to be the literal `'en'`; it is now `LOCALE_ID` as well,
 * and `availableLocales` defaults to `[defaultLocale]` instead of `['en']`.
 * Reported rather than rewritten for the usual reason: the fix, where one is
 * wanted at all, is a value only the app knows — an app that really did want the
 * browser's tag writes `provideWrDateAdapter({ locale: navigator.language })`,
 * and one that really did want `'en'` writes it. A codemod cannot tell those
 * from the majority for whom the new default is the answer they meant.
 *
 * **`<wr-pagination ofLabel>`** is gone. The "1–10 of 235" line is now ONE
 * catalog template, `pagination.range`, with `{{from}}` / `{{to}}` /
 * `{{total}}` placeholders — because an input for the word in the middle
 * localised only the middle: the ASCII hyphen between the bounds and the
 * operand order were both frozen in TypeScript, and several languages put the
 * total first. Reported rather than rewritten for the reason the others are —
 * the text moves out of a template into a catalog file this schematic cannot
 * identify, and the sentence it becomes is a translation decision. A bound
 * `[ofLabel]` fails the template type-check, so it cannot ship unnoticed; a
 * static `ofLabel="…"` is the shape worth naming.
 *
 * Two more v14 changes are visible without being breaking API, and are called
 * out here because a snapshot or a text assertion will catch them: the
 * pagination range separates its bounds with an EN DASH and groups its three
 * numbers per `LOCALE_ID` (`1–10 of 1,234`), and `<wr-statistic>` formats its
 * delta through `Intl.NumberFormat` rather than interpolating the raw number,
 * so a non-English locale sees its own digits, sign and decimal separator
 * there — matching the value printed above it, which always did.
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

/** `provideWrDateAdapter(` with no `locale:` before the call closes. */
// `locale` as a key OR as shorthand, and the scan for it runs to the call's own
// closing brace rather than to the first `)`. The first version demanded a colon
// and could not cross a nested call, so it reported
// `provideWrDateAdapter({ locale })` — which the audit's own stand writes — and
// `provideWrDateAdapter({ adapter: mk(), locale: 'ru' })` as having no locale.
// Over-reporting is the gentler failure, but a warning that fires on the
// idiomatic form is a warning people learn to skip.
const DATE_ADAPTER_NO_LOCALE = /\bprovideWrDateAdapter\(\s*(?:\)|\{(?![\s\S]*?\blocale\s*[,:}]))/;
/** `provideWrI18n(` with no `defaultLocale:` before the call closes. */
const I18N_NO_DEFAULT_LOCALE = /\bprovideWrI18n\(\s*(?:\)|\{(?![^})]*\bdefaultLocale\s*:))/;
const DEFAULT_CONFIG = /\bDEFAULT_WR_I18N_CONFIG\b/;
/** `ofLabel` on a pagination tag, bound (`[ofLabel]`) or static. */
const OF_LABEL = /<wr-pagination\b[^>]*\[?ofLabel\]?\s*=/;

// The half `OF_LABEL` cannot see. Apps that never bound the input still
// translated the key, and `pagination.of` is gone: the range is one
// `pagination.range` template now, so a catalog that defines the old key loses
// its translation with nothing said. Markup detection misses every one of them,
// which is why this looks at the catalog instead.
const REMOVED_KEY = /['"`]?\bof['"`]?\s*:\s*['"`]/;
const PAGINATION_SCOPE = /\bpagination\s*:\s*\{/;

function ngUpdateV14(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const routerTabs: string[] = [];
    const loadingBars: string[] = [];
    const dateAdapters: string[] = [];
    const i18nProviders: string[] = [];
    const defaultConfigs: string[] = [];
    const ofLabels: string[] = [];
    const staleCatalogs: string[] = [];

    visit(tree, '/', filePath => {
      const lower = filePath.toLowerCase();
      // Inline templates live in `.ts`, external ones in `.html`.
      if (!lower.endsWith('.ts') && !lower.endsWith('.html') && !lower.endsWith('.json')) return;

      const content = tree.readText(filePath);
      if (ROUTER_TAB.test(content)) routerTabs.push(filePath);
      if (LOADING_BAR.test(content)) loadingBars.push(filePath);
      if (DATE_ADAPTER_NO_LOCALE.test(content)) dateAdapters.push(filePath);
      if (I18N_NO_DEFAULT_LOCALE.test(content)) i18nProviders.push(filePath);
      if (DEFAULT_CONFIG.test(content)) defaultConfigs.push(filePath);
      if (OF_LABEL.test(content)) ofLabels.push(filePath);
      // Scoped to the `pagination:` block so a `common: { of: '…' }` — a key that
      // is still shipped and still unread — does not drag every catalog in.
      const scope = PAGINATION_SCOPE.exec(content);
      if (scope && REMOVED_KEY.test(content.slice(scope.index, content.indexOf('}', scope.index)))) {
        staleCatalogs.push(filePath);
      }
    });

    if (staleCatalogs.length > 0) {
      context.logger.warn(
        `ngwr v14: a translated \`pagination.of\` found in ${staleCatalogs.length} file(s). The range is ` +
          'one template now — replace it with `pagination.range` ("{{from}}–{{to}} of {{total}}") and ' +
          '`pagination.compact`. Nothing throws: the old key is simply never read again, so a catalog ' +
          'that keeps it silently reverts that line to English.'
      );
      for (const file of staleCatalogs) context.logger.warn(`  ${file}`);
    }

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

    if (dateAdapters.length > 0) {
      context.logger.warn(
        `ngwr v14: provideWrDateAdapter() with no \`locale\` found in ${dateAdapters.length} file(s). It now ` +
          "takes Angular's LOCALE_ID instead of navigator.language, so a prerendered page and its hydrated " +
          'self finally agree and an app that set LOCALE_ID stops rendering an English calendar inside ' +
          "itself. If you genuinely wanted the browser's tag, say so: " +
          'provideWrDateAdapter({ locale: navigator.language }).'
      );
      for (const file of dateAdapters) context.logger.warn(`  ${file}`);
    }

    if (i18nProviders.length > 0) {
      context.logger.warn(
        `ngwr v14: provideWrI18n() with no \`defaultLocale\` found in ${i18nProviders.length} file(s). The ` +
          "default is now LOCALE_ID rather than the literal 'en', and `availableLocales` defaults to " +
          "[defaultLocale] rather than ['en']. Catalog lookups also fall back from a region to its language, " +
          'so a `ru` catalog answers an app running `ru-RU`. Pass `defaultLocale` explicitly to pin the old ' +
          'behaviour.'
      );
      for (const file of i18nProviders) context.logger.warn(`  ${file}`);
    }

    if (defaultConfigs.length > 0) {
      context.logger.warn(
        `ngwr v14: DEFAULT_WR_I18N_CONFIG referenced in ${defaultConfigs.length} file(s). It no longer ` +
          'carries `defaultLocale` or `availableLocales` — those cannot be constants now that they resolve ' +
          'from LOCALE_ID — so spreading it no longer produces a complete WrI18nConfigResolved.'
      );
      for (const file of defaultConfigs) context.logger.warn(`  ${file}`);
    }

    if (ofLabels.length > 0) {
      context.logger.warn(
        `ngwr v14: <wr-pagination ofLabel> found in ${ofLabels.length} file(s). The input is gone — the ` +
          'whole "1–10 of 235" line is now the `pagination.range` catalog entry, with `{{from}}`, ' +
          '`{{to}}` and `{{total}}` placeholders, so a translation owns the operand order and the ' +
          'punctuation as well as the word between them. Move your text there and drop the binding.'
      );
      for (const file of ofLabels) context.logger.warn(`  ${file}`);
    }

    if (
      loadingBars.length === 0 &&
      routerTabs.length === 0 &&
      dateAdapters.length === 0 &&
      i18nProviders.length === 0 &&
      defaultConfigs.length === 0 &&
      ofLabels.length === 0
    ) {
      context.logger.info('ngwr v14 migration: nothing to do — no affected usage found.');
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
