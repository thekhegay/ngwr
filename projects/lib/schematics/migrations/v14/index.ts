/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

/**
 * v13 to v14 migration. Two halves, and the split is deliberate.
 *
 * **It REWRITES the five renames**: on `<wr-alert>` from `closeable` to
 * `closable`, on `<wr-table>` from `[totalItems]` to `[total]`, on
 * `<wr-pagination>` from `[(currentPage)]` to `[(page)]`, from
 * `isDisabledWhenLoading` to `disabledWhenLoading`, and the window
 * `chromeSize` scale from `'compact' | 'normal'` to `'sm' | 'md'`. A rename is
 * exactly what a codemod does well: the new name means what the old one meant,
 * on the same element, and nothing about the app has to be understood to move it.
 *
 * **It REPORTS everything else.** Those need a decision a codemod cannot make
 * correctly, and v10/v11 already establish the rule here — a migration that
 * pretends to have handled something it has not is worse than none, because the
 * silence reads as "nothing to do".
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
 * **The five renames**, and why each one moved. `wr-alert` spelled its dismiss
 * toggle `closeable` while `wr-drawer`, `WrDrawerOptions` and `WrDialogOptions`
 * all spelled the same idea `closable` — and a bare attribute that matches no
 * input raises no template error, so `<wr-alert closable>` and
 * `<wr-drawer closeable>` both compiled to nothing at all. `wr-table` and
 * `wr-pagination` disagreed about the two concepts they share: `totalItems` /
 * `page` against `total` / `currentPage`, two components designed to sit on the
 * same screen. `isDisabledWhenLoading` was the only `is`-prefixed input in the
 * library, against thirty-nine plainly-named `disabled` inputs and no
 * `isDisabled` anywhere; dropping the prefix leaves none at all. And
 * `WrWindowChromeSize` was still `'compact' | 'normal'` — the exact vocabulary
 * v8's density migration exists to retire, three majors after it landed.
 *
 * What the rename rules will NOT catch, because no regex can: a component class
 * reading one of these off a `viewChild()` reference. Those are type errors on
 * upgrade, which is the loud failure and needs no help. One quiet case is worth
 * naming: `WrWindowHarness.getChromeSize()` now answers `'sm'` / `'md'`, so a
 * test asserting `'compact'` fails as a wrong value rather than as a wrong type.
 *
 * Why the split happened at all: the subscription and the link directives are
 * what pull `@angular/router` into the bundle. Measured on 13.0.0, in an app
 * declaring no routes, `ngwr/loading-bar` cost 100.1 kB of which 67.9 kB was the
 * router, against 2.4 kB of its own code; `ngwr/tabs` carried 75.6 kB of router.
 * Both are now zero for an app that does not opt in.
 */

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', '.cache', '.angular', 'coverage', '.next', '.nuxt']);

interface Transform {
  readonly pattern: RegExp;
  readonly replacement: string;
}

/**
 * An open tag, up to and including the whitespace before some attribute.
 * `[^>]*?` cannot cross a `>`, so a rename can never escape the element it is
 * scoped to, however the tag wraps across lines.
 *
 * The anchor is `(?![-\w])` and NOT `\b`: a word boundary still matches at the
 * front of a longer element name, which is how a v9-shaped rule would have
 * renamed an attribute on `<wr-table-filter>` while claiming to touch only
 * `<wr-table>`. Every one of these four has such a neighbour — `wr-table-filter`
 * and `wr-table-sort`, `wr-window-container` and `wr-window-taskbar` — or would
 * acquire one the moment the catalog grows.
 *
 * Quoted values are stepped over rather than excluded, and that is the half a
 * plain `[^>]*?` gets wrong: a `>` inside a binding expression looks like the end
 * of the tag, so `<wr-alert [type]="n > 0 ? 'a' : 'b'" closeable>` left
 * `closeable` behind while the same attributes in the other order moved. The
 * leftover is SILENT — a static `closeable` / `totalItems="42"` that matches no
 * input is an ordinary DOM attribute and `strictTemplates` says nothing, so the
 * alert quietly loses its dismiss button. (Bracketed forms are loud: NG8002.)
 * `migration-v9` carries the same anchoring and the same hole.
 */
const openTag = (name: string): string => String.raw`<${name}(?![-\w])(?:"[^"]*"|'[^']*'|[^>])*?\s`;

const ALERT = openTag('wr-alert');
const TABLE = openTag('wr-table');
const PAGER = openTag('wr-pagination');
const WINDOW = openTag('wr-window');

/**
 * Template renames. Run over `.html` AND `.ts`, because an inline template is
 * a string in a component file and is otherwise invisible to this.
 */
const HTML_TRANSFORMS: readonly Transform[] = [
  // <wr-alert closeable>, to closable. The bracketed form first: after it runs
  // the bare rule cannot see what it rewrote, and the bare rule's lookahead
  // (`[\s/>=]`) is what keeps it from matching the inside of a longer word.
  { pattern: new RegExp(`(${ALERT})\\[closeable\\]`, 'g'), replacement: '$1[closable]' },
  { pattern: new RegExp(`(${ALERT})closeable(?=[\\s/>=])`, 'g'), replacement: '$1closable' },

  // `[wrInput]`'s size input drops its prefix. Anchored on the DIRECTIVE, not on
  // an element, because it sits on a native `<input>` / `<textarea>` — and the
  // anchor matters more here than anywhere else in this table: `size` is a legal
  // native attribute, so rewriting one that was never ngwr's silently rebinds a
  // character-width hint. The two orders are both real markup, hence two rules.
  {
    pattern: /(<(?:input|textarea)(?![-\w])(?:"[^"]*"|'[^']*'|[^>])*?\swrInput(?:"[^"]*"|'[^']*'|[^>])*?\s)\[wrSize\]/g,
    replacement: '$1[size]',
  },
  {
    pattern: /(<(?:input|textarea)(?![-\w])(?:"[^"]*"|'[^']*'|[^>])*?\swrInput(?:"[^"]*"|'[^']*'|[^>])*?\s)wrSize=/g,
    replacement: '$1size=',
  },
  {
    pattern:
      /(<(?:input|textarea)(?![-\w])(?:"[^"]*"|'[^']*'|[^>])*?\s)\[wrSize\]((?:"[^"]*"|'[^']*'|[^>])*?\swrInput)/g,
    replacement: '$1[size]$2',
  },
  {
    pattern: /(<(?:input|textarea)(?![-\w])(?:"[^"]*"|'[^']*'|[^>])*?\s)wrSize=((?:"[^"]*"|'[^']*'|[^>])*?\swrInput)/g,
    replacement: '$1size=$2',
  },

  // <wr-table>, from [totalItems] to [total]
  { pattern: new RegExp(`(${TABLE})\\[totalItems\\]`, 'g'), replacement: '$1[total]' },
  { pattern: new RegExp(`(${TABLE})totalItems=`, 'g'), replacement: '$1total=' },

  // <wr-pagination>, from [(currentPage)] to [(page)], and the one-way pair with it.
  { pattern: new RegExp(`(${PAGER})\\[\\(currentPage\\)\\]`, 'g'), replacement: '$1[(page)]' },
  { pattern: new RegExp(`(${PAGER})\\(currentPageChange\\)`, 'g'), replacement: '$1(pageChange)' },
  { pattern: new RegExp(`(${PAGER})\\[currentPage\\]`, 'g'), replacement: '$1[page]' },
  { pattern: new RegExp(`(${PAGER})currentPage=`, 'g'), replacement: '$1page=' },

  // <wr-window>, from chromeSize="compact" to "sm", bound literal included.
  { pattern: new RegExp(`(${WINDOW}chromeSize=")compact(")`, 'g'), replacement: '$1sm$2' },
  { pattern: new RegExp(`(${WINDOW}chromeSize=")normal(")`, 'g'), replacement: '$1md$2' },
  { pattern: new RegExp(`(${WINDOW}\\[chromeSize\\]=")'compact'(")`, 'g'), replacement: "$1'sm'$2" },
  { pattern: new RegExp(`(${WINDOW}\\[chromeSize\\]=")'normal'(")`, 'g'), replacement: "$1'md'$2" },
];

/** `.ts` only — object keys and a harness filter, neither of which is markup. */
const TS_TRANSFORMS: readonly Transform[] = [
  // WrWindowManager.open(Cmp, { chromeSize: 'compact' }) — the primary form,
  // since a window is always a service call. Keyed on the property name rather
  // than the element: there is no element in a `.ts` object literal to scope to,
  // and `chromeSize` carrying one of exactly these two values is not a shape
  // another library hands you by accident.
  { pattern: /(\bchromeSize\s*:\s*['"])compact(['"])/g, replacement: '$1sm$2' },
  { pattern: /(\bchromeSize\s*:\s*['"])normal(['"])/g, replacement: '$1md$2' },
  // WrPaginationHarness.with({ currentPage: 3 }), to { page: 3 }. The filter is
  // named after the input, so it moved with it. Scoped to the `with(` call —
  // `currentPage` is far too ordinary a property name to rename on sight.
  { pattern: /(WrPaginationHarness\.with\(\s*\{[^}]*?\b)currentPage(\s*:)/g, replacement: '$1page$2' },
];

/**
 * Renames safe ANYWHERE, in markup, TypeScript and stylesheets alike, because
 * the string itself is unambiguous. `isDisabledWhenLoading` was the library's
 * only `is`-prefixed input and appears nowhere else; `wr-window--chrome-compact`
 * is a BEM class, which is public API here, so a consumer stylesheet overriding
 * it has to move with the component.
 */
const GLOBAL_TRANSFORMS: readonly Transform[] = [
  { pattern: /\bisDisabledWhenLoading\b/g, replacement: 'disabledWhenLoading' },
  { pattern: /\bwr-window--chrome-compact\b/g, replacement: 'wr-window--chrome-sm' },
  // `--chrome-normal` too, even though the library never styled it: the class is
  // emitted as `wr-window--chrome-${chromeSize()}`, so every default window in
  // v13 carried it, BEM classes are public API here, and a consumer override
  // keyed on it stops matching with no error — CSS does not have one.
  { pattern: /\bwr-window--chrome-normal\b/g, replacement: 'wr-window--chrome-md' },
];

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
const PAGINATION_SCOPE = /\bpagination\s*:\s*\{/g;

/**
 * Every `pagination: { … }` object literal in a file, brace-matched and
 * QUOTE-AWARE — and it has to be both, because the first version was neither.
 *
 * It sliced to `content.indexOf('}')`, and the shipped catalog carries
 * `perPage: '{{size}} / page'` two lines ABOVE `of`, so the slice ended inside
 * `{{size` and the scan never reached the key it exists to find. The detector
 * therefore answered "clean" for the one shape that actually occurs — a
 * consumer catalog copied from ngwr's own — and green for the toy literal in
 * its spec, `pagination: { of: 'von' }`, where `of` comes first and no
 * placeholder precedes it. A warning that only fires on a shape nobody writes
 * is the silent half of a silent change.
 *
 * All of them rather than the first, since one file commonly holds several
 * locales.
 */
function paginationBlocks(content: string): string[] {
  const blocks: string[] = [];
  PAGINATION_SCOPE.lastIndex = 0;

  for (let scope = PAGINATION_SCOPE.exec(content); scope; scope = PAGINATION_SCOPE.exec(content)) {
    // The `{` the match ends on.
    const start = scope.index + scope[0].length - 1;
    let depth = 0;
    let quote: string | null = null;

    for (let i = start; i < content.length; i += 1) {
      const char = content[i];

      if (quote !== null) {
        if (char === '\\') i += 1;
        else if (char === quote) quote = null;
        continue;
      }

      if (char === "'" || char === '"' || char === '`') {
        quote = char;
      } else if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          blocks.push(content.slice(start, i + 1));
          break;
        }
      }
    }
  }

  return blocks;
}

function ngUpdateV14(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const routerTabs: string[] = [];
    const loadingBars: string[] = [];
    const dateAdapters: string[] = [];
    const i18nProviders: string[] = [];
    const defaultConfigs: string[] = [];
    const ofLabels: string[] = [];
    const staleCatalogs: string[] = [];
    let rewritten = 0;

    visit(tree, '/', filePath => {
      const lower = filePath.toLowerCase();
      const isTs = lower.endsWith('.ts');
      const isHtml = lower.endsWith('.html');
      const isStyle = lower.endsWith('.scss') || lower.endsWith('.css');

      // Inline templates live in `.ts`, external ones in `.html`; the renames
      // reach stylesheets too, because one of them is a BEM class.
      if (!isTs && !isHtml && !isStyle && !lower.endsWith('.json')) return;

      // Read ONCE. Every detector below then answers about the file the user
      // wrote, not about the file a transform left behind — none of the five
      // renames touches a reported token today, and relying on that is exactly
      // the coupling that breaks the next time one is added.
      const content = tree.readText(filePath);

      if (isTs || isHtml || isStyle) {
        const next = apply(content, [
          ...(isTs || isHtml ? HTML_TRANSFORMS : []),
          ...(isTs ? TS_TRANSFORMS : []),
          ...GLOBAL_TRANSFORMS,
        ]);
        if (next !== content) {
          tree.overwrite(filePath, next);
          rewritten += 1;
        }
      }

      if (ROUTER_TAB.test(content)) routerTabs.push(filePath);
      if (LOADING_BAR.test(content)) loadingBars.push(filePath);
      if (DATE_ADAPTER_NO_LOCALE.test(content)) dateAdapters.push(filePath);
      if (I18N_NO_DEFAULT_LOCALE.test(content)) i18nProviders.push(filePath);
      if (DEFAULT_CONFIG.test(content)) defaultConfigs.push(filePath);
      if (OF_LABEL.test(content)) ofLabels.push(filePath);
      // Scoped to the `pagination:` block so a `common: { of: '…' }` — a key that
      // is still shipped and still unread — does not drag every catalog in.
      if (paginationBlocks(content).some(block => REMOVED_KEY.test(block))) {
        staleCatalogs.push(filePath);
      }
    });

    if (rewritten > 0) {
      context.logger.info(
        `ngwr v14 migration: rewrote ${rewritten} file(s) for the renames: on <wr-alert> from ` +
          'closeable to closable, on <wr-table> from totalItems to total, on <wr-pagination> from ' +
          'currentPage to page (and from currentPageChange to pageChange), from isDisabledWhenLoading ' +
          'to disabledWhenLoading, and the window chromeSize scale from compact/normal to sm/md ' +
          '(class .wr-window--chrome-compact to --chrome-sm).'
      );
      context.logger.info('Verify the result with `git diff` — a few edge cases may need manual touch-up.');
    }

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
      rewritten === 0 &&
      loadingBars.length === 0 &&
      routerTabs.length === 0 &&
      dateAdapters.length === 0 &&
      i18nProviders.length === 0 &&
      defaultConfigs.length === 0 &&
      ofLabels.length === 0 &&
      staleCatalogs.length === 0
    ) {
      context.logger.info('ngwr v14 migration: nothing to do — no affected usage found.');
    }

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

function visit(tree: Tree, path: string, visitor: (filePath: string) => void): void {
  const dir = tree.getDir(path);
  for (const file of dir.subfiles) visitor(`${path === '/' ? '' : path}/${file}`);
  for (const sub of dir.subdirs) {
    if (IGNORE_DIRS.has(sub)) continue;
    visit(tree, `${path === '/' ? '' : path}/${sub}`, visitor);
  }
}

export default ngUpdateV14;
