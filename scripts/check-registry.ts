/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Gate for the open registry format: `registry/schema.json` plus every item
 * under `registry/items/`.
 *
 * Three things it checks, and the third is the one worth having.
 *
 * 1. **Every shipped item is valid.** They are the worked examples an author
 *    copies, and an invalid example teaches the wrong format faster than any
 *    documentation teaches the right one.
 * 2. **Every `entryPoints` name is a real ngwr entry point**, read from the same
 *    `ng-package.json` scan `llms-full.txt` uses. The registry does not get its
 *    own copy of the catalog.
 * 3. **The published schema and the validator agree.** `schema.json` is the
 *    contract third-party tooling reads; `scripts/lib/registry/item.ts` is what
 *    this repo enforces. Two descriptions of one format drift the moment
 *    someone edits either, so the item types and the required keys are compared
 *    directly — the same trick `check-color-parity.ts` plays on the SCSS and TS
 *    colour lists — and every field whose rule is a regex on one side and a
 *    function on the other is compared by RUNNING both over a case table.
 *    Shape could not have caught what behaviour did: the schema's scheme
 *    lookahead was lowercase-only, so `FILE:///etc/passwd` validated clean
 *    against the published contract while `targetProblem()` refused it.
 *
 *    That comparison covered `files[].target` alone for a while, and one of the
 *    two fields it left out had drifted: the validator STRIPPED the `ngwr/`
 *    prefix that `entryPoints`' `"pattern": "^ngwr/"` requires, so a bare
 *    `"select"` passed this gate and failed the published schema — the unsafe
 *    direction, since the repo is the reference implementation an author copies.
 *    `registryDependencies` was already in step; it is in the table so it stays
 *    that way.
 *
 *    One divergence is left standing and is not in any table: a target with an
 *    embedded line separator — LF, CR, U+2028 or U+2029, all four. The schema's
 *    trailing `.+$` cannot match across one, the validator has no rule about
 *    them, so the published contract is the stricter of the two there — it can
 *    only reject an item this repo would have accepted, never accept one it
 *    refuses.
 *
 * 4. **Every ngwr symbol an item's TypeScript names is real.** A block is code a
 *    consumer pastes into their own app, and nothing here compiles it — so the
 *    one shipped block called `WrValidators.required()` and `WrValidators.email()`
 *    for a whole release. Neither exists: `WrValidators` is eleven `ValidatorFn`s
 *    for a reactive `FormControl`, and Signal Forms' `required` / `email` come
 *    from `@angular/forms/signals`. It could not compile, in a file whose entire
 *    job is to be pasted and compiled. The check reads each named import against
 *    the entry point's `public-api.ts`, then each `Symbol.member` access against
 *    the keys of that symbol's own declaration, and PRINTS how many of each it
 *    resolved — a member check that silently resolves nothing looks exactly like
 *    one that passes.
 *
 *    What it still cannot see is the template: `[formField]` needs Angular's
 *    `FormField` in the component's `imports`, and the same block was missing it.
 *    Catching that needs the Angular compiler, not a scan.
 *
 * Deliberately NOT a JSON Schema implementation. Validating the schema with a
 * validator would mean adding one, and the interesting rules here are not
 * expressible in it anyway: "is this a real entry point" needs the catalog, and
 * "can a CLI write this path" needs to reject `a/../../etc/x` as well as
 * `../x`.
 *
 * Usage:
 *   pnpm check:registry
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { exit } from 'node:process';

import { err } from './lib/log/err';
import { info } from './lib/log/info';
import { ROOT_PATH } from './lib/paths/root';
import {
  ITEM_TYPES,
  REQUIRED_KEYS,
  entryPointProblem,
  registryDependencyProblem,
  targetProblem,
  validateItem,
} from './lib/registry/item';
import { PRESETS, buildThemePreset } from './lib/registry/theme-presets';

const REGISTRY = resolve(ROOT_PATH, 'registry');
const ITEMS = join(REGISTRY, 'items');
const SCHEMA = join(REGISTRY, 'schema.json');
const LIB_DIR = resolve(ROOT_PATH, 'projects/lib');

/**
 * Every secondary entry point, by `ng-package.json` — the same discovery
 * `gen-ai-assets.ts` uses, and for the same reason: a directory scan misses the
 * nested ones.
 */
function entryPoints(): Set<string> {
  const out = new Set<string>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (!statSync(full).isDirectory()) continue;
      if (existsSync(join(full, 'ng-package.json'))) out.add(relative(LIB_DIR, full));
      walk(full);
    }
  };
  walk(LIB_DIR);
  return out;
}

/** Symbols an entry point's `public-api.ts` re-exports, by name. */
function exportsOf(entry: string): ReadonlySet<string> {
  const file = join(LIB_DIR, entry, 'public-api.ts');
  const out = new Set<string>();
  if (!existsSync(file)) return out;
  const source = readFileSync(file, 'utf8');
  for (const [, block] of source.matchAll(/export\s*(?:type\s*)?\{([^}]+)\}/g)) {
    for (const member of block.split(',')) {
      const published = member.trim().split(/\s+as\s+/).pop() ?? '';
      const name = /^(?:type\s+)?([A-Za-z_$][\w$]*)/.exec(published);
      if (name) out.add(name[1]);
    }
  }
  return out;
}

/**
 * The top-level keys of `export const <symbol> = { … }`, or `null` when the
 * symbol is not declared that way.
 *
 * `null` is the honest answer rather than an empty set: a class, a function or
 * a declaration this cannot read has no key list, and an empty one would report
 * every member access on it as a problem.
 */
function constMembers(entry: string, symbol: string): ReadonlySet<string> | null {
  const dir = join(LIB_DIR, entry);
  const files: string[] = [];
  const walk = (at: string): void => {
    for (const name of readdirSync(at)) {
      const full = join(at, name);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) {
        files.push(full);
      }
    }
  };
  walk(dir);

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const start = new RegExp(`export const ${symbol}\\b[^=]*=\\s*\\{`).exec(source);
    if (!start) continue;

    // Walk by brace depth from the opening `{` and take the keys that sit at
    // depth 1 — a nested object's own keys are not members of the symbol.
    const out = new Set<string>();
    let depth = 0;
    let line = '';
    // The depth a line STARTS at, which is the one that decides whether its key
    // belongs to this object. Read at the newline instead, a member whose value
    // opens a brace on the same line — every one of `WrValidators`' is an arrow
    // function that does — counts as nested and the whole set comes back empty.
    // An empty set then reports every real member as missing, so the check fails
    // for the right item and the wrong reason.
    let lineDepth = 1;
    for (let i = start.index + start[0].length - 1; i < source.length; i++) {
      const ch = source[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return out;
      }
      if (ch === '\n') {
        const key = /^\s*([A-Za-z_$][\w$]*)\s*[:(]/.exec(line);
        if (key && lineDepth === 1) out.add(key[1]);
        line = '';
        lineDepth = depth;
      } else {
        line += ch;
      }
    }
    return out;
  }
  return null;
}

interface SymbolAudit {
  readonly problems: readonly string[];
  readonly imports: number;
  readonly members: number;
}

/**
 * Named ngwr imports and the members read off them, held to the library.
 *
 * The item's TypeScript is the thing a consumer pastes, and no gate compiles
 * it — see the header. Both halves report their counts so a scan that stops
 * matching is visible as a number falling to zero rather than as a pass.
 */
function auditSymbols(file: string, source: string, catalog: ReadonlySet<string>): SymbolAudit {
  const problems: string[] = [];
  let imports = 0;
  let members = 0;

  // Comments first, and the reason is that this file's own fix carries one:
  // the corrected block explains in prose that there is no
  // `WrValidators.required`, and a scan of the raw text reports that sentence
  // as a member access. Same category as the `var()` inside a comment that kept
  // `--wr-color-outline-rgb` alive in `check:tokens`.
  const content = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  for (const match of content.matchAll(/import\s*\{([^}]+)\}\s*from\s*'ngwr\/([^']+)'/g)) {
    const entry = match[2];
    if (!catalog.has(entry)) {
      problems.push(`${file} — imports from 'ngwr/${entry}', which is not an entry point`);
      continue;
    }
    const published = exportsOf(entry);
    for (const raw of match[1].split(',')) {
      const named = /^\s*(?:type\s+)?([A-Za-z_$][\w$]*)/.exec(raw);
      if (!named) continue;
      const symbol = named[1];
      imports++;
      if (!published.has(symbol)) {
        problems.push(`${file} — 'ngwr/${entry}' does not export ${symbol}`);
        continue;
      }

      const keys = constMembers(entry, symbol);
      if (!keys) continue;
      for (const use of content.matchAll(new RegExp(`\\b${symbol}\\.([A-Za-z_$][\\w$]*)`, 'g'))) {
        members++;
        if (!keys.has(use[1])) {
          problems.push(`${file} — ${symbol}.${use[1]}() does not exist (${symbol} has ${[...keys].sort().join(', ')})`);
        }
      }
    }
  }

  return { problems, imports, members };
}

interface Schema {
  readonly required?: readonly string[];
  readonly properties?: {
    readonly type?: { readonly enum?: readonly string[] };
    readonly entryPoints?: { readonly items?: { readonly pattern?: string } };
    readonly registryDependencies?: { readonly items?: { readonly pattern?: string } };
    readonly files?: { readonly items?: { readonly properties?: { readonly target?: { readonly pattern?: string } } } };
  };
}

/**
 * Targets the schema's `pattern` and `targetProblem()` have to answer the same
 * way — the adversarial shapes first, then a couple of ordinary paths so a
 * pattern that rejects everything cannot pass.
 *
 * Comparing the two on BEHAVIOUR rather than on shape is the point: the schema
 * used to reject `file:` and accept `FILE:`, because its scheme lookahead was
 * lowercase-only while the validator's carried an `i` flag. Nothing noticed,
 * since the gate only ever read `type.enum` and `required`.
 */
const TARGET_CASES: readonly string[] = [
  'FILE:///etc/passwd',
  'HTTP://evil/x',
  'DATA:text/x,y',
  'file:///etc/passwd',
  'C:/x',
  'c:/x',
  '/etc/passwd',
  '\\\\srv\\x',
  'a/../../etc/x',
  '../x',
  '..',
  ' /etc/passwd',
  'src/x.ts ',
  'src/x\0.ts',
  '',
  'src/app/thing.ts',
  'src/styles/_thing.scss',
];

/**
 * `entryPoints` names both sides have to answer the same way.
 *
 * Every subpath here is a REAL entry point, so the only thing left to disagree
 * about is the `ngwr/` prefix — which is the whole of what the schema says about
 * this field. Catalog membership is deliberately not expressible in a schema, so
 * a typo like `ngwr/slect` is a divergence by construction and stays out of the
 * table.
 */
const ENTRY_POINT_CASES: readonly string[] = [
  'ngwr/select',
  'ngwr/icon/adapters/lucide',
  'select',
  'icon/adapters/lucide',
  './ngwr/select',
  'NGWR/select',
  '',
];

/** The same, for `registryDependencies` — where the schema's whole rule is the scheme. */
const REGISTRY_DEPENDENCY_CASES: readonly string[] = [
  'https://ngwr.dev/registry/items/thing.json',
  'HTTPS://ngwr.dev/registry/items/thing.json',
  'http://ngwr.dev/registry/items/thing.json',
  'https:/ngwr.dev/thing.json',
  './thing.json',
  '',
];

/**
 * Run a schema `pattern` and the validator's own rule over one case table.
 *
 * Comparing them on BEHAVIOUR rather than on shape is the point, and so is
 * flagging an absent pattern: a field the published contract stops constraining
 * is a silent widening, which is how `entryPoints` came to accept a bare
 * `"select"` here while `^ngwr/` refused it.
 */
function patternParity(
  field: string,
  pattern: string | undefined,
  cases: readonly string[],
  validatorAccepts: (value: string) => boolean
): string[] {
  if (pattern === undefined) {
    return [`${field} has no pattern — third-party tooling would accept anything there`];
  }

  const problems: string[] = [];
  // A JSON Schema `pattern` is an ECMA-262 regex with no flags, so it is read
  // back exactly as a validator would read it.
  const re = new RegExp(pattern);
  for (const value of cases) {
    const bySchema = re.test(value);
    const byValidator = validatorAccepts(value);
    if (bySchema !== byValidator) {
      problems.push(
        `${field} ${JSON.stringify(value)} — schema.json ${bySchema ? 'accepts' : 'rejects'} it, ` +
          `the validator ${byValidator ? 'accepts' : 'rejects'} it`
      );
    }
  }

  return problems;
}

function schemaParity(schema: Schema, catalog: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  const types = schema.properties?.type?.enum ?? [];
  const required = schema.required ?? [];

  const same = (a: readonly string[], b: readonly string[]): boolean =>
    a.length === b.length && [...a].sort().join() === [...b].sort().join();

  if (!same(types, ITEM_TYPES)) {
    problems.push(`schema.json allows [${types.join(', ')}] but the validator allows [${ITEM_TYPES.join(', ')}]`);
  }
  if (!same(required, REQUIRED_KEYS)) {
    problems.push(`schema.json requires [${required.join(', ')}] but the validator requires [${REQUIRED_KEYS.join(', ')}]`);
  }

  problems.push(
    ...patternParity(
      'files[].target',
      schema.properties?.files?.items?.properties?.target?.pattern,
      TARGET_CASES,
      target => targetProblem(target) === null
    ),
    ...patternParity(
      'entryPoints[]',
      schema.properties?.entryPoints?.items?.pattern,
      ENTRY_POINT_CASES,
      entry => entryPointProblem(entry, catalog) === null
    ),
    ...patternParity(
      'registryDependencies[]',
      schema.properties?.registryDependencies?.items?.pattern,
      REGISTRY_DEPENDENCY_CASES,
      url => registryDependencyProblem(url) === null
    )
  );

  return problems;
}

function main(): void {
  if (!existsSync(SCHEMA)) {
    err(`\n✘ registry: ${SCHEMA} is missing — the published contract is the point of the directory.\n`);
    exit(1);
  }

  const schema = JSON.parse(readFileSync(SCHEMA, 'utf8')) as Schema;
  const catalog = entryPoints();
  const problems = schemaParity(schema, catalog).map(problem => `schema.json — ${problem}`);

  const files = existsSync(ITEMS) ? readdirSync(ITEMS).filter(name => name.endsWith('.json')).sort() : [];

  if (files.length === 0) {
    err('\n✘ registry: no items under registry/items — the examples ARE the documentation of the format.\n');
    exit(1);
  }

  const names = new Set<string>();
  let imports = 0;
  let members = 0;
  for (const file of files) {
    const path = join(ITEMS, file);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
      problems.push(`${file} — not valid JSON: ${(error as Error).message}`);
      continue;
    }

    for (const problem of validateItem(raw, catalog)) problems.push(`${file} — ${problem}`);

    for (const entry of (raw as { files?: readonly { path?: unknown; content?: unknown }[] }).files ?? []) {
      if (typeof entry.path !== 'string' || !entry.path.endsWith('.ts')) continue;
      if (typeof entry.content !== 'string') continue;
      const audit = auditSymbols(`${file}:${entry.path}`, entry.content, catalog);
      problems.push(...audit.problems);
      imports += audit.imports;
      members += audit.members;
    }

    const name = (raw as { name?: unknown }).name;
    if (typeof name === 'string') {
      // The file name is how a fetcher addresses the item, so a mismatch means
      // the URL and the identity disagree.
      if (`${name}.json` !== file) problems.push(`${file} — its name is "${name}", so the file should be ${name}.json`);
      if (names.has(name)) problems.push(`${file} — "${name}" is used by another item`);
      names.add(name);
    }
  }

  // The shipped themes are DERIVED, so a hand edit to one is a fork of the
  // palette recipe. Re-derive from the seed table and compare; the same bargain
  // `check:api-docs` strikes with `gen:api-docs`.
  for (const preset of PRESETS) {
    const path = join(ITEMS, `${preset.name}.json`);
    if (!existsSync(path)) {
      problems.push(`${preset.name}.json — in the seed table, not on disk. Run \`pnpm gen:theme-presets\`.`);
      continue;
    }
    const expected = `${JSON.stringify(buildThemePreset(preset), null, 2)}\n`;
    if (readFileSync(path, 'utf8') !== expected) {
      problems.push(`${preset.name}.json — does not match its seeds. Run \`pnpm gen:theme-presets\`.`);
    }
  }

  if (problems.length > 0) {
    for (const problem of problems) err(`  ✘ ${problem}`);
    err(`\n✘ ${problems.length} registry problem(s).\n`);
    exit(1);
  }

  info(
    `✓ Registry — ${files.length} item(s) valid against schema.json, ${PRESETS.length} theme(s) match their seeds, ` +
      `${catalog.size} entry points to check names against, ` +
      `${imports} ngwr import(s) and ${members} member access(es) resolved against the library.`
  );
}

main();
