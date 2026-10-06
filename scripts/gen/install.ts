/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * What a reader has to write to use the thing a docs page documents.
 *
 * Two halves, and the second is the one that went missing: the TypeScript
 * import, and the `@use`. v15 removed the `@use 'ngwr'` umbrella, so a consumer
 * now writes one `@use 'ngwr/<name>'` per component they render — and not one
 * of the 129 hand-written Installation sections said so. A page that shows the
 * import and omits the style entry teaches half an installation, and the half
 * it omits fails silently: the component renders, unstyled.
 *
 * Generated rather than written, for the reason every other generated map here
 * exists: 129 copies of a two-line recipe is 129 chances to drift, and the
 * drift is invisible — nothing type-checks a snippet string.
 *
 * The symbols come from the page's OWN imports. A docs page imports exactly
 * what it renders, from the entry points it renders them out of, so its import
 * list is the honest answer to "what does a consumer need" — more honest than
 * the selector map, which would answer with everything an entry point exports.
 *
 *   pnpm gen:install          write the map
 *   pnpm check:install        fail if the committed copy is stale
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { exit } from 'node:process';

import { buildPageRoutes } from '../lib/page-routes';
import { ROOT_PATH } from '../lib/paths/root';

const APP = resolve(ROOT_PATH, 'projects/showcase/app');
const OUT_DIR = join(APP, '_core/generated');
const LIB_DIR = resolve(ROOT_PATH, 'projects/lib');
const OUT_FILE = join(OUT_DIR, 'install.ts');

/** Entry points that ship a `styles/_index.scss`, so `@use` resolves. */
function styleEntryPoints(): Set<string> {
  const src = readFileSync(join(OUT_DIR, 'selectors.ts'), 'utf8');
  const start = src.indexOf('STYLE_ENTRY_POINTS');
  const body = src.slice(start, src.indexOf('];', start));
  return new Set([...body.matchAll(/"([^"]+)"/g)].map(m => m[1]));
}

/**
 * Every class the library decorates as a `@Component`, `@Directive` or `@Pipe`
 * — the only things Angular accepts in a standalone component's `imports`.
 *
 * It cannot come from the selector map: that one is built from SELECTORS, so it
 * carries no pipes. A recipe that put `WrTPipe` outside `imports` would be as
 * wrong as one that put `provideWrIcons` inside it.
 */
function declarables(): Set<string> {
  const out = new Set<string>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name !== 'node_modules' && name !== 'schematics' && name !== 'mcp') walk(full);
        continue;
      }
      if (!name.endsWith('.ts') || name.includes('.spec.')) continue;
      const src = readFileSync(full, 'utf8');
      for (const m of src.matchAll(/@(?:Component|Directive|Pipe)\s*\(/g)) {
        const cls = /export class (\w+)/.exec(src.slice(m.index));
        if (cls) out.add(cls[1]);
      }
    }
  };
  walk(LIB_DIR);
  return out;
}

interface Entry {
  readonly path: string;
  readonly symbols: readonly string[];
  /**
   * The subset of `symbols` that may go in `imports: []`.
   *
   * The split is recorded HERE rather than left to the renderer, which is where
   * a comment used to promise it happened and where nothing did it: every
   * symbol went into `imports`, so 58 of the generated recipes opened with a
   * `@Component({ imports: [provideWrIcons, WR_COLORS, …] })` that does not
   * compile. The Installation block is the first thing a new reader copies, and
   * `check:install` could not see it — it compares the committed file against
   * the same generator.
   */
  readonly declarables: readonly string[];
  readonly styled: boolean;
}

/**
 * Every `ngwr/*` import in one page file, as entry point → symbols.
 *
 * Type-only imports are skipped: a consumer does not put a type in `imports: []`
 * and does not `@use` an entry point for one. A `/testing` subpath is skipped
 * too — a harness is public, and belongs in a spec rather than in an app.
 */
function entriesOf(file: string, styled: Set<string>, declarable: Set<string>): Entry[] {
  // Template literals are STRIPPED first. A docs page is full of snippet
  // strings that contain `import { X } from 'ngwr/y'` as their own content,
  // and counting those made the map describe what a page PRINTS rather than
  // what it renders — the two agree until a page prints an example it does not
  // demo, at which point the install recipe starts naming entry points the
  // page never touches.
  const src = readFileSync(file, 'utf8').replace(/`(?:\\.|[^`\\])*`/g, '``');
  const byPath = new Map<string, Set<string>>();

  for (const m of src.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s+from\s+'(ngwr\/[^']+)'/g)) {
    const [, typeOnly, names, path] = m;
    if (typeOnly || path.endsWith('/testing')) continue;
    const set = byPath.get(path) ?? new Set<string>();
    for (const raw of names.split(',')) {
      const trimmed = raw.trim();
      // `import { WrButton, type WrButtonShape }` — the inline `type` is SKIPPED,
      // not stripped. A type never goes in `imports: []`, and stripping the
      // keyword let `WrButtonShape` through on the button page's own recipe.
      if (/^type\s/.test(trimmed)) continue;
      const name = trimmed.split(/\s+as\s+/)[0].trim();
      // Everything a consumer writes, not just the declarables: a utils page
      // imports `clamp`, a date page `provideWrDateAdapter`, and a recipe that
      // listed only `Wr*` classes rendered no Installation at all on the
      // twenty-one utils pages. Which of these go in `imports: []` is decided
      // where it is rendered — a class by its name, everything else a call.
      if (/^[A-Za-z_$]/.test(name)) set.add(name);
    }
    if (set.size > 0) byPath.set(path, set);
  }

  return [...byPath]
    .map(([path, names]) => {
      const symbols = [...names].sort();
      return { path, symbols, declarables: symbols.filter(n => declarable.has(n)), styled: styled.has(path) };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

function serialize(map: Map<string, Entry[]>): string {
  const rows = [...map]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([route, entries]) => {
      const body = entries
        .map(
          e =>
            `      { path: "${e.path}", symbols: [${e.symbols.map(s => `"${s}"`).join(', ')}],` +
            ` declarables: [${e.declarables.map(s => `"${s}"`).join(', ')}], styled: ${e.styled} },`
        )
        .join('\n');
      return `  "${route}": [\n${body}\n  ],`;
    })
    .join('\n');

  return `/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/* eslint-disable */
/**
 * GENERATED by \`pnpm gen:install\` — do not edit.
 *
 * Route → what a consumer imports and what they \`@use\`, read from each docs
 * page's own imports. \`<ngwr-doc-page>\` renders the Installation section from
 * this, so a page cannot ship an install recipe that disagrees with the page.
 */

/** One entry point a page renders out of. */
export interface DocInstallEntry {
  readonly path: string;
  /** Everything the page imports from this entry point — the \`import { … }\` line. */
  readonly symbols: readonly string[];
  /**
   * The subset Angular accepts in \`imports: []\` — a \`@Component\`,
   * \`@Directive\` or \`@Pipe\`. A provider function, a service, a token or a
   * plain helper is imported and then used somewhere else, and listing one here
   * is a compile error rather than a style choice.
   */
  readonly declarables: readonly string[];
  /** Whether \`@use '<path>'\` resolves — an entry point with no stylesheet is a build error. */
  readonly styled: boolean;
}

export const INSTALL = {
${rows}
} satisfies Record<string, readonly DocInstallEntry[]>;

export type DocInstallRoute = keyof typeof INSTALL;
`;
}

async function main(): Promise<void> {
  const check = process.argv.includes('--check');
  const routes = await buildPageRoutes();

  if (routes.problems.length > 0) {
    console.error('\n✘ the route walk is short, so the map would be too:\n');
    for (const p of routes.problems) console.error(`    ${p}`);
    exit(1);
  }

  const styled = styleEntryPoints();
  const declarable = declarables();
  const map = new Map<string, Entry[]>();

  for (const [dir, forDir] of routes.byDirectory) {
    // One directory serving several routes cannot have one install recipe, and
    // the pages that do — the icon galleries, the cluster catalogs — document
    // no entry point anyway.
    if (forDir.length !== 1) continue;
    const route = forDir[0];
    const abs = join(APP, dir);
    if (!existsSync(abs) || !statSync(abs).isDirectory()) continue;

    const entries = readdirSync(abs)
      .filter(f => f.endsWith('.ts') && !f.endsWith('.routing.ts') && !f.endsWith('.spec.ts'))
      .flatMap(f => entriesOf(join(abs, f), styled, declarable));

    // Collapse duplicates across a directory's files, keeping the union.
    const merged = new Map<string, Set<string>>();
    for (const e of entries) {
      const set = merged.get(e.path) ?? new Set<string>();
      for (const s of e.symbols) set.add(s);
      merged.set(e.path, set);
    }
    // The page's OWN entry point leads. A docs page imports whatever its demos
    // render — the select page pulls `ngwr/avatar` for an option template — and
    // a recipe that opens with somebody else's entry point reads as though you
    // need it to use the thing the page is about.
    const own = `ngwr/${route.split('/').pop() ?? ''}`;
    const rows = [...merged]
      .map(([path, names]) => {
      const symbols = [...names].sort();
      return { path, symbols, declarables: symbols.filter(n => declarable.has(n)), styled: styled.has(path) };
    })
      .sort((a, b) => (a.path === own ? -1 : b.path === own ? 1 : a.path.localeCompare(b.path)));

    if (rows.length > 0) map.set(route, rows);
  }

  const next = serialize(map);
  const shown = relative(ROOT_PATH, OUT_FILE);

  if (check) {
    const current = existsSync(OUT_FILE) ? readFileSync(OUT_FILE, 'utf8') : '';
    if (current !== next) {
      console.error(`\n✘ ${shown} is out of date. Run \`pnpm gen:install\` and commit the result.\n`);
      exit(1);
    }
    console.log(`✓ ${shown} — ${map.size} route(s), up to date`);
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, next);
  const styledCount = [...map.values()].flat().filter(e => e.styled).length;
  const total = [...map.values()].flat().length;
  console.log(`✓ ${shown} — ${map.size} route(s), ${total} entry point(s), ${styledCount} of them with a stylesheet`);
}

void main();
