/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Generates `llms-full.txt` from library + showcase source, so it never drifts
 * from the code: every ngwr entry point with its import path, selector(s),
 * public exports, and description. The exhaustive companion to the curated
 * `llms.txt`. Written to the repo root; shipped in the package (via
 * copy-dist-assets) and served at ngwr.dev/llms-full.txt.
 *
 * Wired into `build:lib` + `build:showcase`. The output is generated
 * (gitignored) — never hand-edit it; edit this script. (The sitemap is a
 * separate post-build step, `scripts/gen-sitemap.ts`, because it needs the
 * prerendered route list, which only exists after the showcase build.)
 *
 * The whole point of this file is to be RIGHT about the catalog, so it carries
 * a `--check` mode with floors: an agent reading a wrong import path or a
 * description scraped off the wrong element is worse served than by no file at
 * all, and nothing else in CI looks at this output.
 *
 * Usage:
 *   pnpm tsx scripts/gen-ai-assets.ts
 *   pnpm tsx scripts/gen-ai-assets.ts --check
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { info } from './lib/log/info';
import { ROOT_PATH } from './lib/paths/root';

const LIB_DIR = join(ROOT_PATH, 'projects/lib');
const SHOWCASE_APP = join(ROOT_PATH, 'projects/showcase/app');
const REFERENCE_DIR = join(SHOWCASE_APP, 'reference');
const ANIMATIONS_DIR = join(SHOWCASE_APP, 'animations');

const dirsOnly = (path: string): string[] =>
  existsSync(path)
    ? readdirSync(path, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort()
    : [];

const read = (path: string): string => (existsSync(path) ? readFileSync(path, 'utf8') : '');

// --- entry points ----------------------------------------------------------

/**
 * Every secondary entry point, keyed by its import subpath.
 *
 * Discovery is by `ng-package.json`, which is what ng-packagr itself builds
 * from — a directory scan one level deep misses the four nested ones
 * (`i18n/{en,ru}`, `icon/adapters/{lucide,feather}`) and reports 123 where the
 * package publishes 134. `projects/lib/ng-package.json` is the PRIMARY entry
 * point and is excluded: its key would be the empty string and its import
 * specifier a bare `ngwr`.
 */
function findEntries(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (!statSync(full).isDirectory()) continue;
      if (existsSync(join(full, 'ng-package.json'))) out.push(relative(LIB_DIR, full));
      walk(full);
    }
  };
  walk(LIB_DIR);
  return out.sort();
}

const ENTRIES = findEntries();
const ENTRY_DIRS = new Set(ENTRIES.map(e => join(LIB_DIR, e)));

/**
 * `.ts` files that belong to THIS entry point.
 *
 * Two things have to be excluded or the output describes API that does not
 * exist: `internal/` (the popover's text panel, the date-picker's clock — no
 * consumer can import them), and any nested entry point, whose files belong to
 * its own block rather than its parent's.
 */
function filesOf(entryDir: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name === 'internal' || ENTRY_DIRS.has(full)) continue;
        walk(full);
      } else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) {
        out.push(full);
      }
    }
  };
  walk(entryDir);
  return out.sort();
}

/** Strip block and line comments so a `selector:` inside a JSDoc example is not read as real API. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const selectorsOf = (entryDir: string): string[] => {
  const out = new Set<string>();
  for (const file of filesOf(entryDir)) {
    for (const match of stripComments(read(file)).matchAll(/selector:\s*'([^']+)'/g)) {
      // A multi-selector string like `input[wrInput], textarea[wrInput]` is one
      // declaration but two things a consumer can write.
      for (const part of (match[1] ?? '').split(',')) {
        const selector = part.trim();
        if (selector) out.add(selector);
      }
    }
  }
  return [...out];
};

/** Named exports declared in a file — the targets of an `export * from './x'`. */
function declaredIn(file: string): [name: string, isType: boolean][] {
  const src = stripComments(read(file));
  const out: [string, boolean][] = [];
  const re = /^export\s+(?:declare\s+)?(?:abstract\s+)?(const|let|var|function|class|type|interface|enum)\s+(\w+)/gm;
  for (const m of src.matchAll(re)) {
    if (m[2]) out.push([m[2], m[1] === 'type' || m[1] === 'interface']);
  }
  return out;
}

interface ExportedSymbol {
  readonly name: string;
  /** `export type { X }` or `export { type X }` — cannot appear in a value import. */
  readonly isType: boolean;
}

const exportsOf = (entryDir: string): ExportedSymbol[] => {
  const out = new Map<string, boolean>();
  const apiFile = join(entryDir, 'public-api.ts');
  const src = stripComments(read(apiFile));

  for (const match of src.matchAll(/export\s+(type\s+)?\{([^}]+)\}/g)) {
    const blockIsType = Boolean(match[1]);
    for (const symbol of (match[2] ?? '').split(',')) {
      const raw = symbol.trim();
      if (!raw) continue;
      const inlineType = /^type\s+/.test(raw);
      const name = raw
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name && !out.has(name)) out.set(name, blockIsType || inlineType);
    }
  }

  // `export * from './version'` — followed one hop, which is all the library
  // uses. Without it `ngwr/version` advertises no exports and an import line
  // reading `import { … }`.
  for (const match of src.matchAll(/export\s+\*\s+from\s+'([^']+)'/g)) {
    const target = join(entryDir, `${match[1]}.ts`);
    const file = existsSync(target) ? target : join(entryDir, match[1] ?? '', 'index.ts');
    for (const [name, isType] of declaredIn(file)) if (!out.has(name)) out.set(name, isType);
  }

  // `ngwr/i18n/{en,ru}` declare their catalog inline (`export const wrEn = …`)
  // instead of re-exporting it, so the barrel itself has to be read for
  // declarations too.
  for (const [name, isType] of declaredIn(apiFile)) if (!out.has(name)) out.set(name, isType);

  return [...out].map(([name, isType]) => ({ name, isType }));
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
function headlineExport(entry: string, exports: readonly ExportedSymbol[]): string | undefined {
  const leaf = (entry.split('/').pop() ?? '')
    .split('-')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
  const pascal = `Wr${leaf}`;

  // Types are excluded outright: `import { Maybe } from 'ngwr/utils'` does not
  // compile under `verbatimModuleSyntax`, and an import line that does not
  // compile is worse than no import line.
  const values = exports.filter(e => !e.isType).map(e => e.name);

  return (
    values.find(e => e === pascal) ??
    values.find(e => e.startsWith('Wr') && !/^WR_/.test(e)) ??
    values.find(e => /^(provide|use)Wr/.test(e)) ??
    values[0] ??
    exports[0]?.name
  );
}

// --- doc-page descriptions -------------------------------------------------

/**
 * Read one attribute off the opening `<ngwr-doc-page …>` tag.
 *
 * Not a `[^>]*` regex: 25 doc pages carry a `>` INSIDE the description value
 * (the button page describes rendering as `<wr-btn>`), so a naive tag match
 * truncates mid-attribute and the value is lost. Scanning with quote awareness
 * finds the tag's real end, and both quote styles are accepted — pages whose
 * text contains a `"` use single quotes, and matching only double quotes is why
 * `donut-chart` and `popover` currently ship a description scraped off a
 * `<ngwr-doc-section>` further down the file.
 */
function docPageDescription(html: string): string {
  const start = html.indexOf('<ngwr-doc-page');
  if (start === -1) return '';

  let end = start;
  let quote: string | null = null;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '>') {
      end = i;
      break;
    }
  }
  if (end <= start) return '';

  const tag = html.slice(start, end);
  const match = /\bdescription=("([^"]*)"|'([^']*)')/s.exec(tag);
  const value = match?.[2] ?? match?.[3] ?? '';
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Entry name → doc-page description.
 *
 * Both clusters are walked. The animation and visual-effect components live
 * under `app/animations/`, not `app/reference/`, which is why 21 entry points
 * ship description-less today.
 *
 * Cluster order is explicit rather than alphabetical-and-last-wins: `theme` has
 * a page in both `interfaces` and `services`, and which one lands should be a
 * decision, not a side effect of `readdirSync` ordering.
 */
const CLUSTER_PRIORITY = ['components', 'directives', 'pipes', 'services', 'utils', 'validators', 'interfaces'];

const descriptions = ((): Map<string, string> => {
  const map = new Map<string, string>();

  const take = (name: string, html: string): void => {
    const description = docPageDescription(html);
    if (description && !map.has(name)) map.set(name, description);
  };

  const clusters = dirsOnly(REFERENCE_DIR).sort((a, b) => {
    const ai = CLUSTER_PRIORITY.indexOf(a);
    const bi = CLUSTER_PRIORITY.indexOf(b);
    return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
  });

  for (const cluster of clusters) {
    const clusterDir = join(REFERENCE_DIR, cluster);
    for (const name of dirsOnly(clusterDir)) take(name, read(join(clusterDir, name, `${name}.html`)));
  }
  for (const name of dirsOnly(ANIMATIONS_DIR)) take(name, read(join(ANIMATIONS_DIR, name, `${name}.html`)));

  return map;
})();

// --- render ----------------------------------------------------------------

interface Entry {
  readonly name: string;
  readonly selectors: readonly string[];
  readonly exports: readonly string[];
  readonly headline: string | undefined;
  readonly description: string;
}

function collect(): Entry[] {
  return ENTRIES.map(name => {
    const dir = join(LIB_DIR, name);
    const selectors = selectorsOf(dir);
    const exports = exportsOf(dir);
    return {
      name,
      selectors,
      exports: exports.map(e => e.name),
      headline: headlineExport(name, exports),
      // Nested entry points have no page of their own; the leaf name is what a
      // doc folder would be called.
      description: descriptions.get(name.split('/').pop() ?? name) ?? '',
    };
  });
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
    full += `\n## ngwr/${entry.name}\n`;
    full += `- import: \`import { ${entry.headline ?? '…'} } from 'ngwr/${entry.name}'\`\n`;
    if (entry.selectors.length) full += `- selector: ${entry.selectors.map(s => `\`${s}\``).join(', ')}\n`;
    if (entry.exports.length) full += `- exports: ${entry.exports.join(', ')}\n`;
    if (entry.description) full += `- ${entry.description}\n`;
  }

  return full;
}

/**
 * Floors, set AT the current numbers rather than below them.
 *
 * A floor with slack in it licenses exactly the silent erosion this file exists
 * to prevent — `gen-sitemap.ts` learned that when a rename emptied the sitemap.
 * Raise these when the catalog grows; a drop is a bug worth failing on.
 */
const MIN_ENTRIES = 134;
const MIN_DESCRIBED = 117;
const MIN_WITH_EXPORTS = 134;

function check(entries: readonly Entry[]): number {
  const problems: string[] = [];

  if (entries.length < MIN_ENTRIES) {
    problems.push(`only ${entries.length} entry points found, expected at least ${MIN_ENTRIES}`);
  }

  const described = entries.filter(e => e.description).length;
  if (described < MIN_DESCRIBED) {
    problems.push(`only ${described} entry points have a description, expected at least ${MIN_DESCRIBED}`);
  }

  const withExports = entries.filter(e => e.exports.length > 0).length;
  if (withExports < MIN_WITH_EXPORTS) {
    problems.push(`${entries.length - withExports} entry point(s) advertise no exports`);
  }

  for (const entry of entries) {
    if (!entry.headline) problems.push(`ngwr/${entry.name}: no symbol to put in the import line`);
  }

  for (const problem of problems) console.error(`  ✘ ${problem}`);
  return problems.length;
}

function main(): void {
  const entries = collect();

  if (process.argv.includes('--check')) {
    const failures = check(entries);
    if (failures > 0) {
      console.error(`\n✘ llms-full.txt would ship ${failures} defect(s). Fix scripts/gen-ai-assets.ts.`);
      process.exit(1);
    }
    info(`✓ llms-full.txt inputs — ${entries.length} entry points, ${entries.filter(e => e.description).length} described`);
    return;
  }

  writeFileSync(join(ROOT_PATH, 'llms-full.txt'), render(entries));
  info(`✓ llms-full.txt — ${entries.length} entry points, ${entries.filter(e => e.description).length} descriptions`);
}

main();
