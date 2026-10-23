/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Measures how the library is gated and writes the numbers into the showcase,
 * so a figure the site prints (the home page's entry-point count, the
 * translations guide's locale list) is a projection of the repository rather
 * than prose somebody has to remember to update.
 *
 *   pnpm gen:quality       write projects/showcase/app/_core/generated/quality.ts
 *
 * Every field is derived here, at generation time. Nothing is copied out of
 * AGENTS.md, README.md or ROADMAP.md — those are prose, they drift, and a page
 * carrying a stale figure is worse than one carrying no figure. The day
 * this was written AGENTS.md said "seventy-four" nested entry points and the
 * tree held 76, which is the whole argument in one line.
 *
 * Two rules if you add a field.
 *
 * **Name it after what it MEASURES, not after what you wish it proved.**
 * `testCases` counts `it(…)` call sites, which equals the number of tests only
 * while nothing in the suite mints cases at runtime — so it does not hope, it
 * checks: a parameterised form (`it.each`) or a call site inside a loop body
 * throws, because either one makes a call site stand for an unknown number of
 * tests and turns the count into a silent undercount.
 *
 * **Assert the counter found something.** A glob that matches nothing reports a
 * zero, and a zero on a page like this reads as a fact — "0 gates" describes a
 * broken generator, never a library with no gates. Every counter has a floor
 * and `atLeast()` throws below it.
 *
 * And one field that is deliberately absent: the number of PRERENDERED routes.
 * It exists only in `dist/showcase`, which this script runs BEFORE (see the
 * `build:showcase` chain), and reconstructing it from the route tables means
 * re-implementing `app.routes.server.ts` — six client-rendered icon galleries,
 * the parameterised legacy redirects, and a `**` the builder drops on its own.
 * `docRoutes` counts the route table instead and says so. There is no timestamp
 * either: the output is committed, and a file that changes on every build turns
 * a real diff — a gate added, an entry point shipped — into noise nobody reads.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { decoratedClasses } from '../lib/build-selector-map';
import { buildSymbolMap, publicExports } from '../lib/build-symbol-map';
import { libEntryPoints, libLocales } from '../lib/entry-points';
import { walkFiles } from '../lib/fs/walk-files';
import { emitGenerated, GENERATED_DIR, generatedHeader } from '../lib/generated';
import { docRouteCount, requirePageRoutes } from '../lib/page-routes';
import { LIB_PATH } from '../lib/paths/lib';
import { ROOT_PATH } from '../lib/paths/root';
import { stripTs } from '../lib/ts-lex';

const OUT_FILE = join(GENERATED_DIR, 'quality.ts');

const CI_WORKFLOW = resolve(ROOT_PATH, '.github/workflows/ci.yml');
const NIGHTLY_WORKFLOW = resolve(ROOT_PATH, '.github/workflows/nightly.yml');

interface Gate {
  readonly name: string;
  readonly command: string;
}

/**
 * A floor under every counter, because the failure mode of a file scan is a
 * confident zero rather than an error: rename a folder, and a glob that used to
 * match 202 things matches none, reports "0", and the page states it.
 */
function atLeast(n: number, floor: number, what: string): number {
  if (n < floor) throw new Error(`${what}: found ${n}, expected ${floor} or more — the scan is broken, not the repo.`);
  return n;
}

// ───── Entry points ─────

/**
 * Every secondary entry point, as a path relative to `projects/lib`.
 *
 * Read from the `exports` map, which is what `@angular/build:library` compiles
 * from — a folder is not an entry point, and `styles/` and `schematics/` prove
 * it. This used to count `ng-package.json` files, which ng-packagr read and
 * the new builder does not; they are deleted.
 */
function secondaryEntryPoints(): string[] {
  return libEntryPoints();
}

// ───── Specs ─────

/** A call to the runner, and not `expect(x).test(…)` / `submit(…)` — the leading char decides. */
const TEST_CALL = /(^|[^.\w$])(it|test)\s*\(/g;
const PARAMETERISED = /\b(it|test|describe)\s*\.\s*(each|for)\b/;
const OPENS_LOOP = /\b(for|while)\s*\(|\.\s*(forEach|map|flatMap)\s*\(/;
/**
 * A spec whose cases are declared by a shared contract it calls rather than by
 * `it()` in the file itself. Named explicitly rather than matched loosely: the
 * point of the zero-case throw is to catch a broken `stripTs`, and a pattern
 * like `/expect\w+Contract\(/` would eventually excuse exactly the file it was
 * written to catch.
 */
const DELEGATES = /\bexpectCatalogContract\s*\(/;

interface SpecFacts {
  readonly files: number;
  readonly cases: number;
  /** Entry points (relative to `projects/lib`) that own a spec file or more. */
  readonly entryPoints: ReadonlySet<string>;
  /** False when a call site was found that stands for an unknown number of cases, which makes `cases` a floor rather than a total. */
  readonly casesAreExact: boolean;
}

/**
 * Spec files and the test cases declared in them.
 *
 * The count is call sites, and two shapes make that a floor rather than a total.
 * `it.each([...])` declares one case per row, so one call site stands for
 * however many rows the table has; an `it(…)` inside a `for` / `forEach` body
 * does the same without announcing itself. Neither exists in this suite today.
 *
 * **When one arrives it degrades the number, it does not fail the build.** This
 * script runs inside `build:showcase`, and a parameterised spec is a perfectly
 * good spec — a contributor who writes one should not watch the documentation
 * site fail to build over how a statistic is counted. So the site prints the
 * file and line, clears `casesAreExact`, and the page prints the count as a
 * floor, "N+" instead of "N" (`formatCount(n, { floor: true })`). The loop
 * detector is positional and can misread an `it(…)` whose own callback opens a
 * `.map(` on the same line; that is a second reason it warns rather than
 * throws.
 *
 * One thing still throws: a spec file with no cases in it at all. That is not a
 * test-authoring choice, it is the signature of `stripTs` having eaten
 * something, and a broken counter must not publish a number. The one legitimate
 * exception is a spec that DELEGATES its whole body to a shared contract — an
 * `i18n/<locale>/catalog.spec.ts` hands its catalog to `expectCatalogContract`
 * rather than repeating the same assertions. Those are counted as an
 * approximation rather than a failure, the same treatment `it.each` gets and
 * for the same reason: one call site, several cases.
 */
function specFacts(entryPoints: readonly string[]): SpecFacts {
  const owners = [...entryPoints].sort((a, b) => b.length - a.length);
  const withSpecs = new Set<string>();
  const approximations: string[] = [];
  let files = 0;
  let cases = 0;

  for (const full of walkFiles(LIB_PATH, { skipDotDirs: true, followLinks: false, include: p => p.endsWith('.spec.ts') })) {
    files++;

    const rel = relative(LIB_PATH, full);
    const owner = owners.find(e => rel.startsWith(`${e}/`));
    if (owner !== undefined) withSpecs.add(owner);

    // Comments out, since prose like "…(the next case pins that)" reads as an
    // `it(` call; string bodies and regex literals too, so a `/['"]/` cannot open
    // a string that swallows the real calls after it.
    const src = stripTs(readFileSync(full, 'utf8'));
    if (PARAMETERISED.test(src)) {
      approximations.push(`${rel} uses a parameterised test form (it.each / it.for) — one call site, several cases.`);
    }

    const delegated = DELEGATES.test(src);
    if (delegated) {
      approximations.push(`${rel} delegates to a shared contract — one call site, several cases.`);
    }

    let inFile = 0;
    // Brace depth, so a call site can be attributed to a loop body rather than
    // to a loop that merely happens to appear above it in the file.
    const loops: number[] = [];
    let depth = 0;
    for (const [lineNo, line] of src.split('\n').entries()) {
      // Where the loop KEYWORD sits on this line, not merely that it does. A
      // braceless body puts the call on the opener's own line
      // (`for (const n of ns) it(…)`), and a test whose callback happens to end
      // in `rows.map(…)` puts a matching opener after the call — so the two are
      // told apart by position, and only the first is a loop-generated case.
      const opensAt = OPENS_LOOP.exec(line)?.index ?? Number.POSITIVE_INFINITY;
      TEST_CALL.lastIndex = 0;
      for (let m = TEST_CALL.exec(line); m !== null; m = TEST_CALL.exec(line)) {
        inFile++;
        if (loops.length > 0 || m.index > opensAt) {
          approximations.push(`${rel}:${lineNo + 1} declares a test inside a loop body — one call site, N cases.`);
        }
      }
      for (const c of line) {
        if (c === '{') {
          depth++;
          if (opensAt < Number.POSITIVE_INFINITY && loops[loops.length - 1] !== depth) loops.push(depth);
        } else if (c === '}') {
          if (loops[loops.length - 1] === depth) loops.pop();
          depth--;
        }
      }
    }

    if (inFile === 0 && !delegated) {
      throw new Error(`${rel} declares no test cases — either the file is empty or \`stripTs\` swallowed it.`);
    }
    cases += inFile;
  }

  for (const note of approximations) {
    console.warn(`gen:quality — ${note} \`testCases\` becomes a floor; the page will print it as "N+".`);
  }

  return {
    files: atLeast(files, 100, 'spec files'),
    cases: atLeast(cases, 1000, 'test cases'),
    entryPoints: withSpecs,
    casesAreExact: approximations.length === 0,
  };
}

// ───── Public API ─────

interface PublicApi {
  readonly components: number;
  readonly directives: number;
}

/**
 * Components and directives a consumer can actually write.
 *
 * Exported from a `public-api.ts` is the test, not decorated: `WrToastHost`,
 * `WrToastItem` and `WrWindowContainer` are `@Component`s the library creates
 * for itself and nothing outside can reference, so counting them would inflate
 * the catalog with three things nobody can type. `internal/` is skipped for the
 * same reason, and `testing/` because a harness is not a component.
 *
 * A decorator in a comment is not counted: this repo's JSDoc shows the API in
 * use, and ten `@example` blocks open with `@Component({…})`. One that showed
 * `export class WrFoo` would otherwise add itself to the catalog silently, which
 * is the shape of drift this whole file exists to refuse.
 */
function publicApi(): PublicApi {
  const exported = new Set(Object.keys(buildSymbolMap()));
  let components = 0;
  let directives = 0;

  const files = walkFiles(LIB_PATH, {
    skipDotDirs: true,
    followLinks: false,
    include: p => p.endsWith('.ts') && !p.endsWith('.spec.ts') && !/\/(testing|internal|schematics)\//.test(p),
  });
  for (const full of files) {
    for (const d of decoratedClasses(full)) {
      if (d.kind === 'Pipe' || !exported.has(d.klass)) continue;
      if (d.kind === 'Component') components++;
      else directives++;
    }
  }

  return { components: atLeast(components, 50, 'components'), directives: atLeast(directives, 10, 'directives') };
}

// ───── Harnesses ─────

interface Harnesses {
  /** Names the `testing` entry points export. */
  readonly exports: number;
  /** Distinct classes behind those names — an alias re-export is one class, not two. */
  readonly classes: number;
}

/**
 * What `ngwr/<name>/testing` publishes.
 *
 * Two numbers, because they differ by one and the difference is the interesting
 * part: `WrDatePickerDayHarness` and `WrCalendarDayHarness` are the same class,
 * since a picker's popup IS a calendar and there is no second implementation to
 * keep in step.
 *
 * **The alias is one level below the barrel**, which is the trap. Reading
 * `date-picker/testing/public-api.ts` alone shows a plain
 * `export { WrDatePickerDayHarness } from './wr-date-picker-day-harness'` — a
 * name like any other — and the file it names is nothing but
 * `export { WrCalendarDayHarness as WrDatePickerDayHarness } from 'ngwr/calendar/testing'`.
 * A scan that stops at the barrel reports 104 classes where the library has 103,
 * so each re-export is followed one hop to the module it came from.
 */
function harnesses(testingEntryPoints: readonly string[]): Harnesses {
  const names = new Set<string>();
  const classes = new Set<string>();

  for (const entry of testingEntryPoints) {
    const file = join(LIB_PATH, entry, 'public-api.ts');
    if (!existsSync(file)) throw new Error(`${entry} is in the exports map and has no public-api.ts — the file the builder compiles does not exist.`);

    for (const exported of publicExports(entry)) {
      if (exported.isType || exported.via !== 'list' || !/^Wr[A-Za-z0-9]*Harness$/.test(exported.name)) continue;
      names.add(exported.name);
      classes.add(implementationOf(entry, exported.name, exported.local, exported.from));
    }
  }

  if (classes.size > names.size) throw new Error('More harness classes than exported names — the re-export walk resolved a name to something that is not a class.');
  return { exports: atLeast(names.size, 50, 'harness exports'), classes: atLeast(classes.size, 50, 'harness classes') };
}

/** The name the class is declared under, following one hop through a relative re-export. */
function implementationOf(entry: string, exportedAs: string, local: string, from: string | undefined): string {
  if (local !== exportedAs) return local;
  if (!from?.startsWith('.')) return exportedAs;

  const module = resolve(LIB_PATH, entry, `${from}.ts`);
  if (!existsSync(module)) return exportedAs;
  const alias = new RegExp(String.raw`export\s*\{[^}]*?\b(\w+)\s+as\s+${exportedAs}\b`).exec(readFileSync(module, 'utf8'));
  return alias?.[1] ?? exportedAs;
}

// ───── Gates ─────

/**
 * Every `package.json` script a workflow runs, in the order it runs them.
 *
 * Parsed out of the workflow rather than listed here, which is the point: a gate
 * added to CI shows up on the page without anyone remembering this file exists,
 * and a gate deleted disappears from it. YAML comment lines are dropped first, so
 * a script named only in a comment is never listed as a gate.
 *
 * The builds are included. `build:lib` and `build:showcase` are steps that fail
 * the run like any other, and `build:showcase` prerenders every route in Node,
 * which is the library's only SSR test.
 */
function workflowGates(file: string, scripts: Record<string, string>): Gate[] {
  const yaml = readFileSync(file, 'utf8')
    .split('\n')
    .filter(line => !/^\s*#/.test(line))
    .join('\n');

  const out: Gate[] = [];
  const seen = new Set<string>();
  for (const m of yaml.matchAll(/^\s*-\s*run:\s*(.+)$/gm)) {
    const name = /^pnpm\s+(?:run\s+)?([\w:-]+)/.exec((m[1] ?? '').trim())?.[1] ?? '';
    const command = scripts[name];
    // `pnpm install --frozen-lockfile` and `pnpm exec playwright install` are
    // setup, not gates — neither is a script, so neither survives this.
    if (!command || seen.has(name)) continue;
    seen.add(name);
    out.push({ name, command });
  }

  return out;
}

/** The `&&` chain inside one script — for `lint` that is the whole gate, since only its FIRST stage prints "All files pass linting." and a later one can still fail. */
function stagesOf(command: string, scripts: Record<string, string>): Gate[] {
  return command
    .split('&&')
    .map(part => part.trim())
    .filter(Boolean)
    .map(raw => {
      const name = /^pnpm\s+(?:run\s+)?([\w:-]+)$/.exec(raw)?.[1] ?? '';
      const resolved = scripts[name];
      return resolved ? { name, command: resolved } : { name: raw, command: raw };
    });
}

// ───── Output ─────

function quote(value: string): string {
  return JSON.stringify(value);
}

function gates(list: readonly Gate[]): string {
  return list.map(g => `    { name: ${quote(g.name)}, command: ${quote(g.command)} },`).join('\n');
}

interface Facts {
  readonly version: string;
  readonly entryPoints: number;
  readonly testingEntryPoints: number;
  readonly harnessClasses: number;
  readonly components: number;
  readonly directives: number;
  readonly specFiles: number;
  readonly testCases: number;
  readonly testCasesAreExact: boolean;
  readonly entryPointsWithSpecs: number;
  readonly docRoutes: number;
  readonly locales: readonly string[];
  readonly runtimeDependencies: readonly string[];
  readonly lintStages: readonly Gate[];
  readonly prGates: readonly Gate[];
  readonly nightlyGates: readonly Gate[];
}

function serialize(f: Facts): string {
  return `${generatedHeader(`/**
 * GENERATED by \`pnpm gen:quality\` from the repository itself — do not edit.
 *
 * Every number here was counted at generation time: entry points from their
 * the \`exports\` map, tests from the spec sources, gates from
 * \`package.json\` plus \`.github/workflows/\`. Change the repo and re-run; the
 * page follows. Editing this file makes the page say something the repository
 * does not, which is the one thing it exists not to do.
 *
 * There is no timestamp on purpose — the file is committed, and a build-stamped
 * date would bury real movement in a diff nobody reads.
 *
 * Every field below is read by the page. A generated field nothing binds is the
 * same dead weight \`check:tokens\` exists to catch: it reads as a measured fact
 * and is only ever a number in a file.
 */`)}

export const QUALITY = {
  /** The published version, read from \`projects/lib/package.json\` — cross-checked against the \`NGWR_VERSION\` constant, which is a separate copy. */
  version: ${quote(f.version)},

  /** Secondary entry points — \`ngwr/button\`, \`ngwr/select\`, … Read from the \`exports\` map, which is what the library builder compiles, so \`styles/\` and \`schematics/\` are correctly absent. Excludes the primary \`ngwr\`. */
  entryPoints: ${f.entryPoints},

  /** Entry points that are CDK test harnesses, published at \`ngwr/<name>/testing\`. Included in \`entryPoints\`. */
  testingEntryPoints: ${f.testingEntryPoints},

  /** Distinct harness CLASSES those entry points publish, which is one fewer than the number of exported names: a date-picker's popup IS a calendar, so one class ships under two. A scan that stops at the barrel reports the higher number. */
  harnessClasses: ${f.harnessClasses},

  /** \`@Component\` classes a \`public-api.ts\` exports. Excludes the ones the library instantiates for itself (the toast host, the window container), which no consumer can write. */
  components: ${f.components},

  /** \`@Directive\` classes a \`public-api.ts\` exports, counted the same way. */
  directives: ${f.directives},

  /** \`*.spec.ts\` files under \`projects/lib\`, harness specs included. They sit beside the code they cover, and \`tsconfig.lib.json\` excludes them from the package. */
  specFiles: ${f.specFiles},

  /** Test cases those files DECLARE — \`it(…)\` / \`test(…)\` call sites, counted after comments and string bodies are stripped. */
  testCases: ${f.testCases},

  /** Whether \`testCases\` is a total or a floor. A parameterised form (\`it.each\`) or a call site inside a loop makes one site stand for an unknown number of cases; the generator prints the file and line, clears this, and the page prints the count as "N+" (\`formatCount(n, { floor: true })\`) rather than failing a documentation build over a legal spec. */
  testCasesAreExact: ${f.testCasesAreExact},

  /** Entry points owning a spec file or more. Compare against \`entryPoints\`: the claim is coverage of the catalog, not of every branch in it. */
  entryPointsWithSpecs: ${f.entryPointsWithSpecs},

  /** Documentation pages the showcase's route tables declare — routes with a \`loadComponent\`, minus the layout shell (it has \`children\`) and the \`**\` 404, neither of which is a page. NOT the prerendered-route count either: \`app.routes.server.ts\` sends the raw-SVG icon galleries and the legacy redirects to the client. */
  docRoutes: ${f.docRoutes},

  /** Locale catalogs the package ships, as the subpath each is imported from — \`ngwr/i18n/de\`. Counted from the folders under \`projects/lib/i18n\` that hold a catalog, so a locale added or removed moves this on its own. Region codes appear only where the script genuinely differs; every other code is a language, which a region \`LOCALE_ID\` falls back to. */
  locales: [${f.locales.map(quote).join(', ')}],

  /** Runtime dependencies of the published package, from \`projects/lib/package.json\`. Peer dependencies are the consumer's Angular; this is what npm installs on top of it. */
  runtimeDependencies: [${f.runtimeDependencies.map(quote).join(', ')}],

  /** The \`&&\` chain inside \`pnpm lint\`. Worth listing separately because the first stage prints "All files pass linting." even when a later one fails, so the chain is the gate, not \`ng lint\`. */
  lintStages: [
${gates(f.lintStages)}
  ],

  /** Every \`package.json\` script \`.github/workflows/ci.yml\` runs on a pull request, in order. Parsed from the workflow, so a gate added or removed there moves this list. */
  prGates: [
${gates(f.prGates)}
  ],

  /** The same, from \`.github/workflows/nightly.yml\`, which runs only on a night \`main\` moved. \`build:showcase\` is on the list because the workflow runs it once and the four site checks read its \`dist/showcase\`; they are off the PR path, so a green PR says nothing about a11y, painted contrast or geometry. \`test\` and \`build:lib\` are not a second opinion on the PR gates of the same name: they re-run on Node 24, an older LTS line \`engines\` still accepts, which nothing else exercises. */
  nightlyGates: [
${gates(f.nightlyGates)}
  ],
} as const;
`;
}

/**
 * The locale catalogs, from `libLocales()`, the folder rule `gen/i18n-json.ts`
 * uses, rather than from a list anyone maintains. The translations guide lists
 * them from here.
 */
function shippedLocales(): readonly string[] {
  const found = libLocales();
  atLeast(found.length, 2, 'locale catalogs');
  return found;
}

async function main(): Promise<void> {
  const rootPkg = JSON.parse(readFileSync(resolve(ROOT_PATH, 'package.json'), 'utf8')) as { scripts?: Record<string, string> };
  const libPkg = JSON.parse(readFileSync(join(LIB_PATH, 'package.json'), 'utf8')) as {
    version?: string;
    dependencies?: Record<string, string>;
  };
  const scripts = rootPkg.scripts ?? {};

  const version = libPkg.version ?? '';
  // Two copies of one fact, so the check is free: `release:prepare` writes both,
  // and a hand-edit to either is exactly the drift this whole file is against.
  const constant = /NGWR_VERSION\s*=\s*'([^']+)'/.exec(readFileSync(join(LIB_PATH, 'version/version.ts'), 'utf8'))?.[1];
  if (!version || version !== constant) {
    throw new Error(`package.json says ${version || '(nothing)'} and NGWR_VERSION says ${constant ?? '(nothing)'} — run \`pnpm release:prepare\`, do not pick one.`);
  }

  const entries = secondaryEntryPoints();
  atLeast(entries.length, 100, 'secondary entry points');
  const testing = entries.filter(e => e.endsWith('/testing'));
  const specs = specFacts(entries);
  const api = publicApi();
  const harness = harnesses(testing);

  const lintScript = scripts['lint'];
  if (!lintScript) throw new Error('package.json has no `lint` script — the lint chain is the gate this page is mostly about.');

  const routes = await requirePageRoutes();
  const facts: Facts = {
    version,
    entryPoints: entries.length,
    testingEntryPoints: atLeast(testing.length, 10, 'testing entry points'),
    harnessClasses: harness.classes,
    components: api.components,
    directives: api.directives,
    specFiles: specs.files,
    testCases: specs.cases,
    testCasesAreExact: specs.casesAreExact,
    entryPointsWithSpecs: atLeast(specs.entryPoints.size, 100, 'entry points with specs'),
    // Routes that render a page: not the prerender count, which exists only in
    // `dist/showcase`, and neither the layout shell nor the `**` 404.
    docRoutes: atLeast(docRouteCount(routes), 100, 'doc routes'),
    locales: shippedLocales(),
    runtimeDependencies: Object.keys(libPkg.dependencies ?? {}).sort(),
    lintStages: stagesOf(lintScript, scripts),
    prGates: workflowGates(CI_WORKFLOW, scripts),
    nightlyGates: workflowGates(NIGHTLY_WORKFLOW, scripts),
  };

  atLeast(facts.lintStages.length, 2, 'lint stages');
  atLeast(facts.prGates.length, 3, 'PR gates');
  atLeast(facts.nightlyGates.length, 1, 'nightly gates');

  emitGenerated({
    file: OUT_FILE,
    content: serialize(facts),
    command: 'gen:quality',
    written:
      `${facts.entryPoints} entry points, ${facts.specFiles} spec files / ${facts.testCases} cases,` +
      ` ${facts.prGates.length} PR gates, ${facts.nightlyGates.length} nightly`,
  });
}

await main();
