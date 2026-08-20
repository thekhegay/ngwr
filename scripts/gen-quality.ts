/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Measures how the library is gated and writes the numbers into the showcase,
 * so the page at `/start/quality` is a projection of the repository rather than
 * prose somebody has to remember to update.
 *
 *   pnpm gen:quality       write projects/showcase/app/_core/generated/quality.ts
 *
 * Every field is derived here, at generation time. Nothing is copied out of
 * AGENTS.md, README.md or ROADMAP.md — those are prose, they drift, and a trust
 * page carrying a stale figure is worse than one carrying no figure. The day
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

import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { ROOT_PATH } from './lib/paths/root';

const OUT_DIR = resolve(ROOT_PATH, 'projects/showcase/app/_core/generated');
const OUT_FILE = join(OUT_DIR, 'quality.ts');
const LIB = resolve(ROOT_PATH, 'projects/lib');
const SHOWCASE_APP = resolve(ROOT_PATH, 'projects/showcase/app');
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
  if (n < floor) throw new Error(`${what}: found ${n}, expected at least ${floor} — the scan is broken, not the repo.`);
  return n;
}

function walk(dir: string, onFile: (full: string) => void): void {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === 'node_modules' || item.name.startsWith('.')) continue;
      walk(full, onFile);
    } else {
      onFile(full);
    }
  }
}

// ───── Entry points ─────

/**
 * Every secondary entry point, as a path relative to `projects/lib`.
 *
 * Counted by `ng-package.json`, which is what ng-packagr counts — a folder is
 * not an entry point, and `styles/` and `schematics/` prove it. The primary
 * (`projects/lib/ng-package.json`) is removed rather than never collected, so
 * its absence would throw here instead of quietly shifting the total by one.
 */
function secondaryEntryPoints(): string[] {
  const found: string[] = [];
  walk(LIB, full => {
    if (!full.endsWith('/ng-package.json')) return;
    found.push(relative(LIB, full).replace(/\/?ng-package\.json$/, ''));
  });

  const primary = found.indexOf('');
  if (primary === -1) throw new Error('projects/lib/ng-package.json is missing — the primary entry point defines the package.');
  found.splice(primary, 1);

  return found.sort();
}

// ───── Source scanning ─────

/**
 * TypeScript with its comments, string bodies and regex literals removed.
 *
 * Needed because the counters below match source text, and this repo's comments
 * are prose about the code: six comment lines in `projects/lib` end a sentence
 * with "…closes it (the next case pins that)", which a bare `\bit\s*\(` counts
 * as six tests that do not exist.
 *
 * Regex literals are the part worth writing out. `/['"]/` appears in specs, and
 * a stripper that reads that quote as a string opener swallows everything to the
 * next one — taking real `it(` calls with it, and silently. Telling a regex from
 * a division needs the previous significant token, which is why `prev` and
 * `word` are tracked: after `)` or an identifier a slash divides, after `return`
 * it opens a pattern.
 *
 * `keepStrings` emits string and template bodies verbatim instead of emptying
 * them. Exactly one caller wants that — `docRoutes()`, which has to tell
 * `path: '**'` from `path: ''` and would see the same thing for both once the
 * bodies are gone. Nothing that COUNTS may use it: emptying them is the whole
 * reason a `/['"]/` in a spec cannot swallow the `it(` calls after it.
 */
const REGEX_KEYWORDS = new Set([
  'return',
  'typeof',
  'instanceof',
  'case',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'do',
  'else',
  'yield',
  'await',
]);

function stripCode(src: string, keepStrings = false): string {
  const out: string[] = [];
  // Mode stack rather than a flag: a template literal can hold `${…}` holding
  // another template, and a single boolean loses the outer one.
  const modes: ('code' | 'tpl')[] = ['code'];
  const holeDepth: number[] = [];
  let depth = 0;
  let prev = '';
  let word = '';
  let i = 0;

  const opensRegex = (): boolean => {
    if (prev === '') return true;
    if (/[)\]}]/.test(prev)) return false;
    if (/[\w$]/.test(prev)) return REGEX_KEYWORDS.has(word);
    return true;
  };

  while (i < src.length) {
    const c = src[i] ?? '';
    const n = src[i + 1] ?? '';

    if (modes[modes.length - 1] === 'tpl') {
      if (c === '\\') {
        if (keepStrings) out.push(src.slice(i, i + 2));
        i += 2;
      } else if (c === '`') {
        modes.pop();
        out.push('`');
        prev = '`';
        word = '';
        i++;
      } else if (c === '$' && n === '{') {
        modes.push('code');
        holeDepth.push(depth);
        depth++;
        out.push('${');
        prev = '{';
        word = '';
        i += 2;
      } else {
        if (keepStrings) out.push(c);
        i++;
      }
      continue;
    }

    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }

    if (c === '/' && n === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      out.push(' ');
      continue;
    }

    if (c === '"' || c === "'") {
      const from = i;
      i++;
      while (i < src.length && src[i] !== c) i += src[i] === '\\' ? 2 : 1;
      i++;
      out.push(keepStrings ? src.slice(from, i) : `${c}${c}`);
      prev = c;
      word = '';
      continue;
    }

    if (c === '`') {
      modes.push('tpl');
      out.push('`');
      prev = '`';
      word = '';
      i++;
      continue;
    }

    if (c === '/' && opensRegex()) {
      i++;
      let inClass = false;
      while (i < src.length) {
        const ch = src[i];
        if (ch === '\\') {
          i += 2;
          continue;
        }
        if (ch === '\n') break;
        if (ch === '[') inClass = true;
        else if (ch === ']') inClass = false;
        else if (ch === '/' && !inClass) break;
        i++;
      }
      i++;
      while (i < src.length && /[a-z]/.test(src[i] ?? '')) i++;
      out.push('/RE/');
      prev = '/';
      word = '';
      continue;
    }

    if (c === '{') depth++;
    if (c === '}') {
      if (modes.length > 1 && depth === (holeDepth[holeDepth.length - 1] ?? -1) + 1) {
        depth--;
        holeDepth.pop();
        modes.pop();
        out.push('}');
        prev = '}';
        word = '';
        i++;
        continue;
      }
      depth--;
    }

    out.push(c);
    if (/[\w$]/.test(c)) word += c;
    else if (!/\s/.test(c)) word = '';
    if (!/\s/.test(c)) prev = c;
    i++;
  }

  return out.join('');
}

// ───── Specs ─────

/** A call to the runner, and not `expect(x).test(…)` / `submit(…)` — the leading char decides. */
const TEST_CALL = /(^|[^.\w$])(it|test)\s*\(/g;
const PARAMETERISED = /\b(it|test|describe)\s*\.\s*(each|for)\b/;
const OPENS_LOOP = /\b(for|while)\s*\(|\.\s*(forEach|map|flatMap)\s*\(/;

interface SpecFacts {
  readonly files: number;
  readonly cases: number;
  /** Entry points (relative to `projects/lib`) that own at least one spec file. */
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
 * file and line, clears `casesAreExact`, and the page reads "at least N" instead
 * of "N". The loop detector is positional and can misread an `it(…)` whose own
 * callback opens a `.map(` on the same line; that is a second reason it warns
 * rather than throws.
 *
 * One thing still throws: a spec file with no cases in it at all. That is not a
 * test-authoring choice, it is the signature of `stripCode` having eaten
 * something, and a broken counter must not publish a number.
 */
function specFacts(entryPoints: readonly string[]): SpecFacts {
  const owners = [...entryPoints].sort((a, b) => b.length - a.length);
  const withSpecs = new Set<string>();
  const approximations: string[] = [];
  let files = 0;
  let cases = 0;

  walk(LIB, full => {
    if (!full.endsWith('.spec.ts')) return;
    files++;

    const rel = relative(LIB, full);
    const owner = owners.find(e => rel.startsWith(`${e}/`));
    if (owner !== undefined) withSpecs.add(owner);

    const src = stripCode(readFileSync(full, 'utf8'));
    if (PARAMETERISED.test(src)) {
      approximations.push(`${rel} uses a parameterised test form (it.each / it.for) — one call site, several cases.`);
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

    if (inFile === 0) throw new Error(`${rel} declares no test cases — either the file is empty or \`stripCode\` swallowed it.`);
    cases += inFile;
  });

  for (const note of approximations) {
    console.warn(`gen:quality — ${note} \`testCases\` becomes a floor; the page will say "at least".`);
  }

  return {
    files: atLeast(files, 100, 'spec files'),
    cases: atLeast(cases, 1000, 'test cases'),
    entryPoints: withSpecs,
    casesAreExact: approximations.length === 0,
  };
}

// ───── Public API ─────

/** `@Component({…}) export class WrFoo` — the same shape `scripts/lib/extract-api.ts` reads. */
const DECORATED = /@(Component|Directive)\(\{[\s\S]*?\}\)\s*export\s+class\s+(\w+)/g;

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
 * Read through `stripCode` for the same reason `specFacts` is: this repo's JSDoc
 * shows the API in use, and ten `@example` blocks already open with
 * `@Component({…})`. They miss today only because their example classes are
 * called `MyComponent` / `ConfirmComponent` and nothing exports those names — an
 * example that showed `export class WrFoo` would add itself to the catalog
 * silently, which is the shape of drift this whole file exists to refuse.
 */
function publicApi(): PublicApi {
  const sources: string[] = [];
  const exported = new Set<string>();

  walk(LIB, full => {
    if (!full.endsWith('.ts') || full.endsWith('.spec.ts')) return;
    if (/\/(testing|internal|schematics)\//.test(full)) return;
    const src = stripCode(readFileSync(full, 'utf8'));
    if (full.endsWith('/public-api.ts')) for (const m of src.matchAll(/\b(Wr[A-Za-z0-9_]*)\b/g)) exported.add(m[1] ?? '');
    sources.push(src);
  });

  let components = 0;
  let directives = 0;
  for (const src of sources) {
    for (const m of src.matchAll(DECORATED)) {
      if (!exported.has(m[2] ?? '')) continue;
      if (m[1] === 'Component') components++;
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
    const file = join(LIB, entry, 'public-api.ts');
    if (!existsSync(file)) throw new Error(`${entry} has an ng-package.json and no public-api.ts — ng-packagr's entryFile does not exist.`);
    const src = readFileSync(file, 'utf8');

    for (const block of src.matchAll(/export\s+(type\s+)?\{([^}]*)\}(?:\s*from\s*'([^']+)')?/g)) {
      if (block[1]) continue;
      for (const member of (block[2] ?? '').split(',')) {
        const trimmed = member.trim();
        if (!trimmed || /^type\s/.test(trimmed)) continue;
        const exportedAs = (trimmed.split(/\s+as\s+/).pop() ?? '').trim();
        if (!/^Wr[A-Za-z0-9]*Harness$/.test(exportedAs)) continue;
        names.add(exportedAs);
        classes.add(implementationOf(entry, exportedAs, trimmed, block[3]));
      }
    }
  }

  if (classes.size > names.size) throw new Error('More harness classes than exported names — the re-export walk resolved a name to something that is not a class.');
  return { exports: atLeast(names.size, 50, 'harness exports'), classes: atLeast(classes.size, 50, 'harness classes') };
}

/** The name the class is declared under, following one hop through a relative re-export. */
function implementationOf(entry: string, exportedAs: string, member: string, from: string | undefined): string {
  const local = member.split(/\s+as\s+/)[0]?.trim() ?? exportedAs;
  if (local !== exportedAs) return local;
  if (!from?.startsWith('.')) return exportedAs;

  const module = resolve(LIB, entry, `${from}.ts`);
  if (!existsSync(module)) return exportedAs;
  const alias = new RegExp(String.raw`export\s*\{[^}]*?\b(\w+)\s+as\s+${exportedAs}\b`).exec(readFileSync(module, 'utf8'));
  return alias?.[1] ?? exportedAs;
}

// ───── Showcase routes ─────

/**
 * Routes the showcase's own tables declare with a `loadComponent` — one rendered
 * page each.
 *
 * NOT the prerendered-route count, and the gap is not rounding: the wildcard 404
 * is never prerendered (`@angular/build` drops any extracted route whose path
 * holds a `*`), and `app.routes.server.ts` sends six raw-SVG icon galleries and
 * every parameterised legacy redirect to the client. The prerender output is the
 * authority on that number and it only exists after `build:showcase`, which runs
 * after this script.
 *
 * Two `loadComponent`s are NOT pages and are excluded, because a statistic
 * labelled "Documentation pages" must not count the chrome around them. A route
 * carrying `children` is a layout shell — `routing.ts` mounts `#layout` that way
 * and it renders navigation, not a page — and `path: '**'` is the 404, which
 * nobody navigates to on purpose and the builder never prerenders. Deciding
 * either one needs the route's OWN keys, so each match is read back to the
 * object literal it sits directly inside; a key belonging to a child route must
 * not speak for its parent.
 */
function docRoutes(): number {
  let found = 0;
  walk(SHOWCASE_APP, full => {
    if (!full.endsWith('.ts')) return;
    // Strings kept: `path: '**'` is only distinguishable from `path: ''` while
    // the body survives, and both shapes are in this file.
    const src = stripCode(readFileSync(full, 'utf8'), true);
    for (const m of src.matchAll(/\bloadComponent\s*:/g)) {
      const route = ownKeysOf(src, m.index);
      if (/(?:^|[{,\s])children\s*:/.test(route)) continue;
      if (/(?:^|[{,\s])path\s*:\s*(['"`])\*\*\1/.test(route)) continue;
      found++;
    }
  });
  return atLeast(found, 100, 'doc routes');
}

/**
 * The object literal a match sits directly inside, with every nested brace,
 * bracket and paren group removed — so what is left is that object's own keys.
 *
 * The nesting is what makes this necessary rather than a regex: the layout
 * shell's `children` array holds two hundred route objects, and a scan that read
 * forward from the shell's opening brace would find every one of their keys and
 * attribute them all to the shell.
 */
function ownKeysOf(src: string, at: number): string {
  let depth = 0;
  let start = -1;
  for (let i = at - 1; i >= 0; i--) {
    const c = src[i];
    if (c === '}') depth++;
    else if (c === '{') {
      if (depth === 0) {
        start = i;
        break;
      }
      depth--;
    }
  }
  if (start === -1) return '';

  const out: string[] = [];
  let level = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i] ?? '';
    if (c === '{' || c === '[' || c === '(') {
      level++;
      continue;
    }
    if (c === '}' || c === ']' || c === ')') {
      level--;
      if (level === 0) break;
      continue;
    }
    if (level === 1) out.push(c);
  }
  return out.join('');
}

// ───── Gates ─────

/**
 * Every `package.json` script a workflow runs, in the order it runs them.
 *
 * Parsed out of the workflow rather than listed here, which is the point: a gate
 * added to CI shows up on the page without anyone remembering this file exists,
 * and a gate deleted disappears from it. YAML comment lines are dropped first —
 * `ci.yml` explains at length why `check:contrast` is NOT in the PR job, and a
 * scan that reads comments would list it as one.
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
  readonly runtimeDependencies: readonly string[];
  readonly lintStages: readonly Gate[];
  readonly prGates: readonly Gate[];
  readonly nightlyGates: readonly Gate[];
}

function serialize(f: Facts): string {
  return `/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/* eslint-disable */
/**
 * GENERATED by \`pnpm gen:quality\` from the repository itself — do not edit.
 *
 * Every number here was counted at generation time: entry points from their
 * \`ng-package.json\` files, tests from the spec sources, gates from
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
 */

export const QUALITY = {
  /** The published version, read from \`projects/lib/package.json\` — cross-checked against the \`NGWR_VERSION\` constant, which is a separate copy. */
  version: ${quote(f.version)},

  /** Secondary entry points — \`ngwr/button\`, \`ngwr/select\`, … Counted by \`ng-package.json\`, the way ng-packagr counts them, so \`styles/\` and \`schematics/\` are correctly absent. Excludes the primary \`ngwr\`. */
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

  /** Whether \`testCases\` is a total or a floor. A parameterised form (\`it.each\`) or a call site inside a loop makes one site stand for an unknown number of cases; the generator prints the file and line, clears this, and the page says "at least" rather than failing a documentation build over a legal spec. */
  testCasesAreExact: ${f.testCasesAreExact},

  /** Entry points owning at least one spec file. Compare against \`entryPoints\`: the claim is coverage of the catalog, not of every branch in it. */
  entryPointsWithSpecs: ${f.entryPointsWithSpecs},

  /** Documentation pages the showcase's route tables declare — routes with a \`loadComponent\`, minus the layout shell (it has \`children\`) and the \`**\` 404, neither of which is a page. NOT the prerendered-route count either: \`app.routes.server.ts\` sends the raw-SVG icon galleries and the legacy redirects to the client. */
  docRoutes: ${f.docRoutes},

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

  /** The same, from \`.github/workflows/nightly.yml\`. \`build:showcase\` is on the list because the workflow runs it: all three checks read \`dist/showcase\` and cannot start without it. They each need a real browser and hundreds of page loads, which is what keeps them off the PR path — so a green PR says nothing about painted contrast or RTL overflow. */
  nightlyGates: [
${gates(f.nightlyGates)}
  ],
} as const;
`;
}

function main(): void {
  const rootPkg = JSON.parse(readFileSync(resolve(ROOT_PATH, 'package.json'), 'utf8')) as { scripts?: Record<string, string> };
  const libPkg = JSON.parse(readFileSync(join(LIB, 'package.json'), 'utf8')) as {
    version?: string;
    dependencies?: Record<string, string>;
  };
  const scripts = rootPkg.scripts ?? {};

  const version = libPkg.version ?? '';
  // Two copies of one fact, so the check is free: `release:prepare` writes both,
  // and a hand-edit to either is exactly the drift this whole file is against.
  const constant = /NGWR_VERSION\s*=\s*'([^']+)'/.exec(readFileSync(join(LIB, 'version/version.ts'), 'utf8'))?.[1];
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
    docRoutes: docRoutes(),
    runtimeDependencies: Object.keys(libPkg.dependencies ?? {}).sort(),
    lintStages: stagesOf(lintScript, scripts),
    prGates: workflowGates(CI_WORKFLOW, scripts),
    nightlyGates: workflowGates(NIGHTLY_WORKFLOW, scripts),
  };

  atLeast(facts.lintStages.length, 2, 'lint stages');
  atLeast(facts.prGates.length, 3, 'PR gates');
  atLeast(facts.nightlyGates.length, 1, 'nightly gates');
  atLeast(facts.runtimeDependencies.length, 1, 'runtime dependencies');

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, serialize(facts));

  console.log(
    `✓ ${relative(ROOT_PATH, OUT_FILE)} — ${facts.entryPoints} entry points, ${facts.specFiles} spec files / ${facts.testCases} cases,` +
      ` ${facts.prGates.length} PR gates, ${facts.nightlyGates.length} nightly`
  );
}

main();
