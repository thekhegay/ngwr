/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Generates the AI assets from library + showcase source, so they never drift
 * from the code:
 *
 * - `llms-full.txt` — every ngwr entry point with its import path, selector(s),
 *   public exports, and description. The exhaustive companion to the curated
 *   `llms.txt`.
 * - `skills/ngwr/` — the agent skill: a `SKILL.md` carrying the rules an agent
 *   gets wrong, plus `references/` files holding the catalog and the setup.
 *
 * Both are written to the repo root, shipped in the package (via
 * copy-dist-assets) and served from ngwr.dev. They come off ONE `collect()`, so
 * the catalog cannot say two different things in two files.
 *
 * Wired into `build:lib` + `build:showcase`. Never hand-edit the output; edit
 * this script. `llms-full.txt` is gitignored, while `skills/ngwr/` is tracked,
 * so a regenerated skill is a diff to commit. (The sitemap is a
 * separate post-build step, `scripts/gen/sitemap.ts`, because it needs the
 * prerendered route list, which only exists after the showcase build.)
 *
 * Usage:
 *   pnpm tsx scripts/gen/ai-assets.ts
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { REQUIRED_PROVIDERS } from '../../projects/lib/mcp/providers';
import { renderSkill } from '../lib/ai/skill';
import { decoratedClasses } from '../lib/build-selector-map';
import { publicExports, type PublicExport } from '../lib/build-symbol-map';
import { docPageTags } from '../lib/doc-page';
import { entryFiles, libEntryPoints, wrClassName } from '../lib/entry-points';
import { info } from '../lib/log/info';
import { docPages, requireSingleRoutePages } from '../lib/page-routes';
import { LIB_PATH } from '../lib/paths/lib';
import { ROOT_PATH } from '../lib/paths/root';
import { SHOWCASE_APP_PATH } from '../lib/paths/showcase-app';

/**
 * The Angular major the library is built against, read from its own peer range
 * rather than written into the skill — a stale framework version in a document
 * an agent trusts is worse than none.
 */
function angularMajor(): string {
  const pkg = JSON.parse(read(join(LIB_PATH, 'package.json')) || '{}') as {
    peerDependencies?: Record<string, string>;
  };
  const range = pkg.peerDependencies?.['@angular/core'] ?? '';
  return /(\d+)/.exec(range)?.[1] ?? '22';
}

const read = (path: string): string => (existsSync(path) ? readFileSync(path, 'utf8') : '');

// --- entry points ----------------------------------------------------------

/**
 * Every secondary entry point, `<name>/testing` included.
 */
const ENTRIES = libEntryPoints();

/**
 * The PRIMARY entry point, `ngwr`, by the name `publicExports()` resolves it
 * under. `libEntryPoints()` leaves it out, and the catalog used to as well, on
 * the grounds that its one export, `provideWr()`, was taught by the skill's
 * setup reference. The MCP server never reads that file: it reads this
 * catalog, so `get_ngwr_setup` answered "Not in the catalog: provideWr" for the
 * headline v15 API. It goes first, and it never has a selector.
 */
const ROOT = '';

/**
 * The selectors an entry point gives a consumer to write.
 *
 * Two conditions, and it takes both: the `selector:` has to sit in a
 * `@Component` / `@Directive` argument, and the class that decorator is on has
 * to be EXPORTED. A bare scan for `selector:` satisfies neither, and each half
 * shipped its own wrong answer. A CDK `HarnessPredicate` filter is written
 * `selector: '…'` too, so four `/testing` entry points advertised CSS classes —
 * `ngwr/pagination/testing` offered `.wr-pagination__page` as component API. And
 * `toast/toast-host.ts` / `window/window.ts` keep internal components at the
 * entry ROOT rather than under `internal/`, so the catalog offered `<wr-toast>`
 * and `<wr-window>` — the latter one line above its own "There is no declarative
 * `<wr-window>` component".
 */
const selectorsOf = (entry: string, exported: ReadonlySet<string>): string[] => {
  const out = new Set<string>();
  for (const file of entryFiles(entry, { sort: 'paths' })) {
    for (const declared of decoratedClasses(file)) {
      if (declared.kind === 'Pipe' || !exported.has(declared.klass)) continue;
      // A multi-selector string like `input[wrInput], textarea[wrInput]` is one
      // declaration but two things a consumer can write.
      for (const part of (declared.selector ?? '').split(',')) {
        const selector = part.trim();
        if (selector) out.add(selector);
      }
    }
  }
  return [...out];
};

/**
 * The symbol to show in the `import { … }` line.
 *
 * `exports[0]` is whatever the barrel happens to list first, which is often a
 * token or a type: `import { WR_COLORS } from 'ngwr/theme'`,
 * `import { Maybe } from 'ngwr/utils'` — the latter is a type, so the line does
 * not even compile under `verbatimModuleSyntax`. Prefer the class named after
 * the entry point, then the first `Wr`-prefixed value.
 */
function headlineExport(entry: string, exports: readonly PublicExport[]): string | undefined {
  const pascal = wrClassName(entry);

  // Types are excluded outright: `import { Maybe } from 'ngwr/utils'` does not
  // compile under `verbatimModuleSyntax`, and an import line that does not
  // compile is worse than no import line.
  const values = exports.filter(e => !e.isType).map(e => e.name);

  const chosen = HEADLINES[entry];
  if (chosen !== undefined && !values.includes(chosen)) {
    throw new Error(`ngwr/${entry}: the headline \`${chosen}\` is not a value it exports. Fix HEADLINES.`);
  }

  return (
    chosen ??
    values.find(e => e === pascal) ??
    values.find(e => e.startsWith('Wr') && !/^WR_/.test(e)) ??
    values.find(e => /^(provide|use)Wr/.test(e)) ??
    values[0] ??
    exports[0]?.name
  );
}

/**
 * Where the rules above pick the wrong symbol. Each is a value the entry point
 * exports, and a key that stops being one fails the run.
 *
 * - `form` has no `WrForm`, so the first `Wr` value won: `WrFormItem`, while the
 *   docs and every example present the entry point as `<wr-form-field>`.
 * - `overlay` has no `WrOverlay`, so it offered `WrOutsideClick`, one of the
 *   helpers `llms.txt` tells an agent not to build on. `WR_OVERLAY` and
 *   `WR_OVERLAY_CONTAINER` are marked `@internal`, so neither may be offered
 *   either. `WrOverlayContainer` is the one public, documented export: the
 *   container whose `.wr-overlay-container` class is the styling hook.
 */
const HEADLINES: Readonly<Record<string, string>> = {
  form: 'WrFormField',
  overlay: 'WrOverlayContainer',
};

// --- doc-page descriptions -------------------------------------------------

/** Every reference, chart and bits page, by the entry point it documents. */
const PAGES = docPages(await requireSingleRoutePages(), { admit: page => page.cluster !== 'guides' });

/** The `description` on an entry point's `<ngwr-doc-page>`, whitespace collapsed; `''` when it has no page. */
function descriptionOf(entry: string): string {
  const page = PAGES.byEntry.get(entry);
  if (!page) return '';
  const html = read(join(SHOWCASE_APP_PATH, page.dir, `${basename(page.dir)}.html`));
  return (docPageTags(html)[0]?.get('description') ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * A description for the entry points no docs page is named after: the root,
 * the four documented one symbol per page, and the ones documented inside
 * another page. Without it they reached the catalog, and the MCP server's
 * answers, as an import line and nothing else.
 *
 * Hand-written, so two rules hold it at run time: every key is an entry point,
 * and none has a page description of its own. A page wins, and a key a new
 * page would shadow fails the run instead of lingering as a second account.
 */
const UNPAGED: Readonly<Record<string, string>> = {
  ngwr: 'Its one export is `provideWr()`, app-wide configuration in one call: `provideWr(withDensity(), withToast({ … }), …)`, each feature imported from the entry point it configures. No component is imported from here.',
  'ngwr/date':
    'The date adapter behind the calendar, the event calendar and every date picker. With no provider it is `WrNativeDateAdapter`, over `Date` and `Intl` in `LOCALE_ID`. `provideWr(withDates({ locale, adapter }))` pins a locale or passes your own `WrDateAdapter` subclass.',
  'ngwr/directives':
    'Attribute directives for markup you already have: `[wrAutofocus]`, `textarea[wrAutosize]`, `[wrClickOutside]` and `[wrCopyToClipboard]`.',
  'ngwr/overlay':
    "`WrOverlayContainer`, the container every ngwr panel renders into, kept apart from the one Angular Material, NG-ZORRO and plain CDK overlays share, with no provider. Style ngwr's overlays through its `.wr-overlay-container` class; no `z-index` reaches them, since CDK renders overlays in the top layer.",
  'ngwr/pipes':
    'Template formatting: `wrDate`, `wrNumber`, `wrBytes`, `wrPlural`, `wrRange`, `wrTruncate` and `wrMark` for search highlighting.',
  'ngwr/utils':
    'Small helpers: coercion (`numAttr`), DOM and keyboard guards, maths, ids, `debounce` / `throttle`, `resolveCssColor`, and the shared types `Maybe` and `SafeAny`.',
  'ngwr/validators':
    "`WrValidators`, form validators in the shape of Angular's `Validators`: card number, CVC, IBAN, hex colour, URL, matching fields, min / max date, one-of and no whitespace.",
  'ngwr/version':
    '`NGWR_VERSION`, the installed ngwr version as a string, and `NGWR_VERSION_TOKEN`, which provides it.',
  'ngwr/loading-bar/router':
    '`provideWrLoadingBarRouter()` makes `<wr-loading-bar>` follow router navigation. Opt-in, so an app that does not route never bundles `@angular/router`. Without it the bar never moves on navigation, and nothing warns.',
  'ngwr/tabs/router':
    '`WrTabsRouting`, the `wrTabsRouting` attribute on `<wr-tabs>` that lets a `<wr-tab routerLink>` follow the active route. A tab with a `routerLink` and no adapter throws.',
};

// --- render ----------------------------------------------------------------

interface Entry {
  readonly name: string;
  /** `ngwr/select`, or `ngwr` for the root. */
  readonly path: string;
  readonly selectors: readonly string[];
  readonly exports: readonly string[];
  readonly headline: string | undefined;
  readonly description: string;
}

function collect(): Entry[] {
  const entries = [ROOT, ...ENTRIES].map(name => {
    const exports = publicExports(name);
    const path = name ? `ngwr/${name}` : 'ngwr';
    const description = descriptionOf(name);
    if (description && UNPAGED[path]) {
      throw new Error(`${path} has a docs page description now. Drop it from UNPAGED in scripts/gen/ai-assets.ts.`);
    }
    return {
      name,
      path,
      // Types cannot carry a decorator, and a selector is only real if the class
      // behind it can be imported as a value. The root is not walked at all: its
      // folder is the whole library, `schematics/` and `mcp/` included.
      selectors: name ? selectorsOf(name, new Set(exports.filter(e => !e.isType).map(e => e.name))) : [],
      exports: exports.map(e => e.name),
      headline: headlineExport(name, exports),
      description: description || UNPAGED[path] || '',
    };
  });

  for (const path of Object.keys(UNPAGED)) {
    if (!entries.some(entry => entry.path === path)) {
      throw new Error(`${path} is not an entry point. Drop it from UNPAGED in scripts/gen/ai-assets.ts.`);
    }
  }

  return entries;
}

function render(entries: readonly Entry[]): string {
  let full = `# ngwr — full reference

> Generated from the library source: every entry point with its import path,
> selector(s), public exports, and description. For exact input / output
> signatures read the bundled \`.d.ts\` types. Concise quick-ref: /llms.txt
>
> One component at a time: every docs page also ships as markdown at the same
> URL plus \`.md\` — e.g. https://ngwr.dev/reference/components/select.md
`;

  for (const entry of entries) {
    full += `\n## ${entry.path}\n`;
    full += `- import: \`import { ${entry.headline ?? '…'} } from '${entry.path}'\`\n`;
    if (entry.selectors.length) full += `- selector: ${entry.selectors.map(s => `\`${s}\``).join(', ')}\n`;
    if (entry.exports.length) full += `- exports: ${entry.exports.join(', ')}\n`;
    if (entry.description) full += `- ${entry.description}\n`;
  }

  return full;
}

/**
 * A tag, an attribute, or a tag with an attribute — `wr-btn`, `[wrAffix]`,
 * `ng-template[wrTableExpand]`. A CSS class or a compound is not a selector a
 * consumer can write; it is a CDK `HarnessPredicate` filter read as one, which is
 * how `.wr-pagination__page` and `.wr-tour-popup__action--next` once reached the
 * shipped catalog.
 */
const SELECTOR_SHAPE = /^[a-z][a-z\d-]*(\[[A-Za-z][\w-]*\])?$|^\[[A-Za-z][\w-]*\]$/;

function main(): void {
  const entries = collect();

  for (const entry of entries) {
    for (const selector of entry.selectors) {
      if (!SELECTOR_SHAPE.test(selector)) {
        throw new Error(`${entry.path}: \`${selector}\` is not a component selector. Fix scripts/gen/ai-assets.ts.`);
      }
    }
  }

  writeFileSync(join(ROOT_PATH, 'llms-full.txt'), render(entries));
  info(`✓ llms-full.txt — ${entries.length} entry points, ${entries.filter(e => e.description).length} descriptions`);

  // Removed and rewritten rather than merged over: a reference file that stops
  // being generated has to stop being shipped, and the tarball is assembled by
  // copying whatever is in this directory.
  const skillDir = join(ROOT_PATH, 'skills/ngwr');
  rmSync(skillDir, { recursive: true, force: true });
  const skill = renderSkill(entries, REQUIRED_PROVIDERS, angularMajor());
  for (const file of skill) {
    const path = join(skillDir, file.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, file.content);
  }
  info(`✓ skills/ngwr — ${skill.length} files, ${entries.length} entry points in the catalog`);
}

main();
